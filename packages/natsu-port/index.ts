import type {
  NatsService,
  NatsPortRequest,
  NatsPortErrorResponse,
  NatsPortWSResponse,
  NatsPortWSErrorResponse,
  NatsChannel,
} from '@silenteer/natsu-type';
import { WebsocketClient } from './websocket-client';

type NatsPortOptions = {
  serverURL: URL;
  withCredentials?: boolean;
  headers?: {
    [key: string]: string;
  };
  onFinishRequest?: (tracing: Tracing) => Promise<void>;
};

class NatsPortError extends Error implements NatsPortErrorResponse {
  get code() {
    return this._error?.code;
  }
  get body() {
    return this._error?.body;
  }

  constructor(private _error: NatsPortErrorResponse) {
    super(getErrorMessage(_error));
  }
}

type RequestOptions = { traceContext?: string; timeout?: number };

type Client<A extends NatsService<string, unknown, unknown>> = {
  <B extends A>(
    subject: B['subject'],
    body: B['request'],
    options?: RequestOptions
  ): Promise<B['response']>;
};

export type Tracing = {
  headers: {
    [key: string]: string;
  };
  start: number;
  end: number;
  error?: Error;
};

function connect<A extends NatsService<string, unknown, unknown>>(
  initialOptions: NatsPortOptions
): Client<A> {
  return async (subject, body, options?: RequestOptions) => {
    const requestBody: NatsPortRequest<unknown> =
      body !== undefined && body !== null
        ? {
            data: body,
          }
        : {};

    let abortController: AbortController;
    let result: Response;
    let timeoutId: number;
    const { traceContext, timeout } = options || {};
    const headers: RequestInit['headers'] = {
      ...initialOptions.headers,
      ...(traceContext ? { 'trace-context': traceContext } : {}),
      'nats-subject': subject,
      'Content-Type': 'application/json',
    };
    const tracing: Tracing = {
      headers,
      start: 0,
      end: 0,
    };

    try {
      if (timeout) {
        abortController = new AbortController();
        timeoutId = setTimeout(
          () => {
            abortController.abort();
          },
          timeout,
          []
        );
      }

      const options: RequestInit = {
        method: 'POST',
        mode: 'cors',
        headers,
        credentials: initialOptions.withCredentials ? 'include' : 'same-origin',
        body: JSON.stringify(requestBody),
        signal: abortController?.signal,
      };

      tracing.start = Date.now();

      result = await fetch(initialOptions.serverURL.toString(), options);
    } catch (e) {
      tracing.error = e;

      if (e.name === 'AbortError') {
        throw new Error(`Request aborted after ${timeout}`);
      }

      throw e;
    } finally {
      timeoutId && clearTimeout(timeoutId);

      tracing.end = Date.now();

      if (initialOptions?.onFinishRequest) {
        await initialOptions.onFinishRequest(tracing);
      }
    }

    let responseCode: number;
    let responseBody: any;
    try {
      const response = await result.json();

      responseCode = response.code || result.status;
      responseBody = response.code ? response.body : response;
    } catch (e) {
      throw {
        subject,
        body,
        status: result?.status,
        headers: result?.headers,
        text: result?.text,
        errorCode: 'INVALID_JSON_RESPONSE',
      };
    }

    if (responseCode === 200) {
      return responseBody;
    } else if ([400, 401, 403, 404, 500, 503].includes(responseCode)) {
      throw new NatsPortError({
        code: responseCode as any,
        body: responseBody,
      });
    } else {
      throw new Error('Unknown response.');
    }
  };
}

function connectWS<A extends NatsChannel<string, unknown, unknown>>(
  options: NatsPortOptions
): NatsuSocket<A> {
  const subscriptions: {
    [subject: string]: {
      [subscriptionId: string]: {
        isPending?: boolean;
        headers?: {
          [key: string]: unknown;
        };
        onHandle: (
          response: NatsPortWSResponse<string> | NatsPortWSErrorResponse<string>
        ) => void;
      };
    };
  } = {};

  let websocketClient = new WebsocketClient({
    url: options.serverURL.toString(),
    withCredentials: options.withCredentials,
    headers: { ...options.headers },
    onMessage: (data) => {
      const response = JSON.parse(data) as
        | NatsPortWSResponse<string>
        | NatsPortWSErrorResponse<string>;
      Object.values(subscriptions[response.subject] || {}).forEach(
        ({ onHandle }) => {
          try {
            onHandle(response);
          } catch (error) {
            console.error(`Handle response failed`, data);
          }
        }
      );
    },
    onConnect: () => {
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      subscribePendingSubject({ isForced: true });
    },
    onReConnect: () => {
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      subscribePendingSubject({ isForced: true });
    },
  });

  const isConnected = () => {
    return websocketClient.isConnected();
  };

  const unsubscribe = async <
    TService extends NatsChannel<string, unknown, unknown>
  >(params: {
    subscriptionId: string;
    subject: TService['subject'];
    request: TService['request'];
  }) => {
    const { subscriptionId, subject, request } = params;

    if (subscriptions?.[subject]?.[subscriptionId]) {
      delete subscriptions[subject][subscriptionId];

      try {
        await websocketClient.send({
          subject,
          headers: { ...options.headers },
          action: 'unsubscribe',
          data: request,
        });

        if (
          subscriptions[subject] &&
          Object.keys(subscriptions[subject]).length === 0
        ) {
          delete subscriptions[subject];
        }
      } catch (error) {
        console.error('websocketClient[unsubscribe]', error, {
          subject,
          headers: options.headers,
        });
      }
    }
  };

  const subscribe: Subscribe<A> = async (subject, onHandle, request = {}) => {
    const subscriptionId = getUUID();

    if (!subscriptions[subject]) {
      subscriptions[subject] = {};
    }

    if (websocketClient.isConnected()) {
      subscriptions[subject] = {
        ...subscriptions[subject],
        [subscriptionId]: { onHandle },
      };

      try {
        await websocketClient.send({
          subject,
          headers: { ...options.headers },
          action: 'subscribe',
          data: request,
        });
      } catch (error) {
        console.error('websocketClient[subscribe]', error, {
          subject,
          headers: options.headers,
        });
      }
    } else {
      subscriptions[subject] = {
        ...subscriptions[subject],
        [subscriptionId]: { onHandle, isPending: true },
      };
    }

    return {
      unsubscribe: () => unsubscribe({ subscriptionId, subject, request }),
    };
  };

  const close = () => {
    const subjects = Object.keys(subscriptions);
    subjects.forEach((subject) => {
      delete subscriptions[subject];
      websocketClient
        .send({
          subject,
          headers: { ...options.headers },
          action: 'unsubscribe',
        })
        .catch((error) => {
          console.error('websocketClient[close]', error, {
            subject,
            headers: options.headers,
          });
        });
    });

    websocketClient.close();
    websocketClient = undefined;
  };

  const subscribePendingSubject = (params?: { isForced?: boolean }) => {
    const { isForced } = params || {};
    const entries = Object.entries(subscriptions);

    for (const [subject, subscriptionInfo] of entries) {
      const items = Object.entries(subscriptionInfo);

      for (const [subscriptionId, { isPending }] of items) {
        if (isPending || isForced) {
          websocketClient
            .send({
              subject,
              headers: { ...options.headers },
              action: 'subscribe',
            })
            .then(() => {
              if (subscriptions?.[subject]?.[subscriptionId]) {
                subscriptions[subject][subscriptionId].isPending = false;
              }
            })
            .catch((error) => {
              console.error('websocketClient[subscribePendingSubject]', error, {
                subject,
                headers: options.headers,
              });
            });
        }
      }
    }
  };

  return {
    isConnected,
    subscribe,
    close,
  };
}

type Subscribe<A extends NatsChannel<string, unknown, unknown>> = {
  <B extends A['subject']>(
    subject: B,
    onHandle: (
      response: NatsPortWSResponse<
        Extract<A, { subject: B }>['subject'],
        Extract<A, { subject: B }>['response']
      >
    ) => Promise<void>,
    request?: A['request'],
    options?: RequestOptions
  ): Promise<{ unsubscribe: () => Promise<void> }>;
};

type NatsuSocket<A extends NatsChannel<string, unknown, unknown>> = {
  isConnected: () => boolean;
  subscribe: Subscribe<A>;
  close: () => void;
};

function getUUID(): string {
  let date = new Date().getTime();
  const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
    /[xy]/g,
    (char) => {
      const random = (date + Math.random() * 16) % 16 | 0;
      date = Math.floor(date / 16);
      return (char == 'x' ? random : (random & 0x3) | 0x8).toString(16);
    }
  );
  return uuid;
}

function getErrorMessage(error: NatsPortErrorResponse) {
  try {
    return JSON.stringify(error, null, 2);
  } catch (err) {
    console.error('Request failed', error);
    return 'Request failed';
  }
}

export type { NatsPortOptions, Client, Subscribe, NatsuSocket };
export { connect, connectWS, NatsPortError };
