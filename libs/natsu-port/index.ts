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

type RequestOptions = { traceId?: string };
export type Client<A extends NatsService<string, unknown, unknown>> = {
  <B extends A['subject']>(
    subject: B,
    body: Extract<A, { subject: B }>['request'],
    options?: RequestOptions
  ): Promise<Extract<A, { subject: B }>['response']>;
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

    let result: Response;
    try {
      result = await fetch(initialOptions.serverURL.toString(), {
        ...initialOptions,
        method: 'POST',
        mode: 'cors',
        headers: {
          ...initialOptions.headers,
          ...(options?.traceId ? { 'trace-id': options?.traceId } : {}),
          'nats-subject': subject,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
    } catch (e) {
      console.error('Caught low level exception while fetching');
      throw e;
    }

    let response: NatsPortResponse<any> | NatsPortErrorResponse;
    try {
      response = await result.json();
    } catch (e) {
      throw new Error('Response is not JSON');
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
    websocketClient.send({
      subject,
      headers: { ...options.headers },
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

export type Subscribe<A extends NatsChannel<string, unknown, unknown>> = {
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

export type NatsuSocket<A extends NatsChannel<string, unknown, unknown>> = {
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

export type { NatsPortOptions };
export { connect, connectWS, NatsPortError };
