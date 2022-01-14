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
    super(typeof _error?.body === 'string' ? _error.body : 'Request failed');
  }
}

function connect(options: NatsPortOptions) {
  return async <TService extends NatsService<string, unknown, unknown>>(
    subject: TService['subject'],
    body: TService['request']
  ): Promise<TService['response']> => {
    const requestBody: NatsPortRequest<unknown> =
      body !== undefined && body !== null
        ? {
            data: body,
          }
        : {};
    const result = await fetch(options.serverURL.toString(), {
      ...options,
      method: 'POST',
      mode: 'cors',
      headers: {
        ...options.headers,
        'nats-subject': subject,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    let response:
      | NatsPortResponse<TService['response']>
      | NatsPortErrorResponse;
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

function connectWS(options: NatsPortOptions) {
  const subscriptions: {
    [subject: string]: Array<{
      subscriptionId: string;
      onHandle: (
        response: NatsPortWSResponse<string> | NatsPortWSErrorResponse<string>
      ) => void;
    }>;
  } = {};

  let websocketClient = new WebsocketClient(options.serverURL.toString());
  websocketClient.onerror = (event) => console.error(event);
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
        websocketClient?.send({ subject, action: 'unsubscribe' });
      }
    }
  };

  const subscribe = <TService extends NatsChannel<string, unknown, unknown>>(
    subject: TService['subject'],
    onHandle: (
      response: NatsPortWSResponse<TService['subject'], TService['response']>
    ) => void
  ) => {
    if (!websocketClient) {
      throw new Error('Cannot subscribe because websocket closed');
    }

    const subscriptionId = getUUID();

    if (!subscriptions[subject]) {
      subscriptions[subject] = [];
    }
    subscriptions[subject].push({ subscriptionId, onHandle });

    websocketClient.send({ subject, action: 'subscribe' });

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

export type { NatsPortOptions };
export { connect, connectWS, NatsPortError };
