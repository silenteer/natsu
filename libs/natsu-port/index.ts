import type {
  NatsService,
  NatsPortRequest,
  NatsPortResponse,
  NatsPortErrorResponse,
} from '@silenteer/natsu-type';

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

export type { NatsPortOptions, NatsPortError };
export { connect };
