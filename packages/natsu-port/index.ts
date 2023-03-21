import type {
  NatsService,
  NatsPortRequest,
  NatsPortResponse,
  NatsPortErrorResponse,
  NatsPortWSResponse,
  NatsPortWSErrorResponse,
  NatsChannel,
} from '@silenteer/natsu-type';
import { WebsocketClient } from './websocket-client';

type NatsPortOptions = {
  serverURL: URL;
  onFinishRequest?: (tracing: Tracing) => Promise<void>;
} & RequestInit;

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

type RequestOptions = { traceId?: string; timeout?: number };

type Client<A extends NatsService<string, unknown, unknown>> = {
  <B extends A>(
    subject: B['subject'],
    body: B['request'],
    options?: RequestOptions
  ): Promise<B['response']>;
};

export type Tracing = {
  headers: RequestInit['headers'];
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
    const { traceId, timeout } = options || {};
    const headers: RequestInit['headers'] = {
      ...initialOptions.headers,
      ...(traceId ? { 'trace-id': traceId } : {}),
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
        ...initialOptions,
        method: 'POST',
        mode: 'cors',
        headers,
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

    let response: NatsPortResponse<any> | NatsPortErrorResponse;

    try {
      response = await result.json();
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

    if (response.code === 200) {
      return response.body;
    } else if (
      (
        [400, 401, 403, 404, 500] as Array<NatsPortErrorResponse['code']>
      ).includes(response.code)
    ) {
      throw new NatsPortError(response);
    } else {
      throw new Error('Unknown response.');
    }
  };
}

function connectWS<A extends NatsChannel<string, unknown, unknown>>(
  options: NatsPortOptions
): NatsuSocket<A> {
  const subscriptions: {
    [subject: string]: Array<{
      subscriptionId: string;
      headers?: {
        [key: string]: unknown;
      };
      onHandle: (
        response: NatsPortWSResponse<string> | NatsPortWSErrorResponse<string>
      ) => void;
    }>;
  } = {};

  let websocketClient = new WebsocketClient(options.serverURL.toString());

  websocketClient.onerror = (event) => console.error(event);

  const sendSub = (subject: string, headers: {}) => {
    websocketClient?.send({
      subject,
      headers: { ...options.headers, ...headers },
      action: 'subscribe',
    });
  };

  const sendUnsub = (subject: string) => {
    websocketClient?.send({
      subject,
      headers: { ...options.headers },
      action: 'unsubscribe',
    });
  };

  websocketClient.onreconnected = () => {
    const subjects = Object.keys(subscriptions);
    subjects.forEach((subject) => {
      sendSub(subject, { ...options.headers });
    });
  };
  websocketClient.onopen = websocketClient.onreconnected;

  websocketClient.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data) as
        | NatsPortWSResponse<string>
        | NatsPortWSErrorResponse<string>;
      subscriptions[data.subject]?.forEach(({ onHandle }) => {
        try {
          onHandle(data);
        } catch (error) {
          console.error(`Handle response failed`, data);
        }
      });
    } catch (error) {
      websocketClient.onerror(error);
    }
  };

  const unsubscribe = <
    TService extends NatsChannel<string, unknown, unknown>
  >(params: {
    subscriptionId: string;
    subject: TService['subject'];
  }) => {
    const { subscriptionId, subject } = params;

    if (
      subscriptions[subject]?.some(
        (item) => item.subscriptionId === subscriptionId
      )
    ) {
      subscriptions[subject] = subscriptions[subject].filter(
        (item) => item.subscriptionId !== subscriptionId
      );
      if (subscriptions[subject].length === 0) {
        delete subscriptions[subject];
        sendUnsub(subject);
      }
    }
  };

  const subscribe: Subscribe<A> = (subject, onHandle) => {
    const subscriptionId = getUUID();

    if (!subscriptions[subject]) {
      subscriptions[subject] = [];
    }
    subscriptions[subject].push({ subscriptionId, onHandle });

    if (websocketClient && websocketClient.getReadyState() === 1) {
      //OPEN
      sendSub(subject, { ...options.headers });
    } // Otherwise, it'll do in onreconnected or onopen

    return { unsubscribe: () => unsubscribe({ subscriptionId, subject }) };
  };

  const close = () => {
    websocketClient.close();
    websocketClient = undefined;
  };

  return {
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
    options?: RequestOptions
  ): { unsubscribe: () => void };
};

type NatsuSocket<A extends NatsChannel<string, unknown, unknown>> = {
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
