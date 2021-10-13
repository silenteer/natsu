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
    [subject: string]: (
      response: NatsPortWSResponse<string> | NatsPortWSErrorResponse<string>
    ) => void;
  } = {};

  const websocketClient = new WebsocketClient(options.serverURL.toString());
  websocketClient.onerror = (event) => console.error(event);
  websocketClient.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data) as
        | NatsPortWSResponse<string>
        | NatsPortWSErrorResponse<string>;
      const handleFunc = subscriptions[data.subject];
      handleFunc && handleFunc(data);
    } catch (error) {
      websocketClient.onerror(error);
    }
  };

  const subscribe = async <
    TService extends NatsChannel<string, unknown, unknown>
  >(
    subject: TService['subject'],
    onHandle: (
      response: NatsPortWSResponse<TService['subject'], TService['response']>
    ) => void
  ) => {
    if (subscriptions[subject]) {
      return;
    }
    subscriptions[subject] = onHandle;
    await websocketClient.send({ subject, action: 'subscribe' });
  };

  const unsubscribe = <TService extends NatsChannel<string, unknown, unknown>>(
    subject: TService['subject']
  ) => {
    if (subscriptions[subject]) {
      delete subscriptions[subject];
      websocketClient.send({ subject, action: 'unsubscribe' });
    }
  };

  const close = () => {
    websocketClient.close();
  };

  return {
    subscribe,
    unsubscribe,
    close,
  };
}

export type { NatsPortOptions };
export { connect, connectWS, NatsPortError };
