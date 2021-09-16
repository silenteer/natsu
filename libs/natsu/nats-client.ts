/* eslint-disable @typescript-eslint/ban-types */
import type { NatsConnection, Msg } from 'nats';
import { connect, JSONCodec } from 'nats';
import type {
  NatsService,
  NatsRequest,
  NatsResponse,
  NatsInjection,
  NatsHandler,
} from './type';

const clients: {
  [urls: string]: {
    client: NatsConnection;
    handlers: {
      [subject: string]: NatsHandler<
        NatsService<string, unknown, unknown>,
        Record<string, unknown>
      >;
    };
  };
} = {};

async function start<TInjection extends Record<string, unknown>>(params: {
  urls: string[];
  injections?: TInjection;
  verbose?: boolean;
}) {
  const { urls, verbose } = params;
  const key = getClientKey(urls);

  if (!clients[key]) {
    throw new Error(`Must register handlers before starting client`);
  }

  if (!clients[key].client) {
    const client = await connect({
      servers: urls,
      pingInterval: 30 * 1000,
      maxPingOut: 10,
      verbose,
    });

    clients[key] = {
      ...clients[key],
      client,
    };

    const requestCodec = JSONCodec<NatsRequest<unknown>>();
    const responseCodec = JSONCodec<NatsResponse<unknown>>();

    Object.entries(clients[key].handlers).forEach(([subject, handler]) => {
      const subcription = client.subscribe(subject);
      (async () => {
        for await (const message of subcription) {
          const data = message.data
            ? requestCodec.decode(message.data)
            : undefined;

          try {
            if (!data) {
              respond({
                message,
                data: responseCodec.encode({ ...data, code: 400 }),
              });
              continue;
            }

            const injection: TInjection & NatsInjection = {
              ...params.injections,
              message,
              natsService: client,
            };

            const validationResult = await handler.validate(data, injection);
            if (validationResult.code !== 'OK') {
              respond({
                message,
                data: responseCodec.encode({
                  ...data,
                  code: validationResult.code as number,
                  body: validationResult.errors,
                }),
              });
              continue;
            }

            const authorizationResult = await handler.authorize(
              data,
              injection
            );
            if (authorizationResult.code !== 'OK') {
              respond({
                message,
                data: responseCodec.encode({
                  ...data,
                  code: authorizationResult.code as number,
                  body: authorizationResult.message,
                }),
              });
              continue;
            }

            const result = await handler.handle(data, injection);
            respond({
              message,
              data: responseCodec.encode({
                ...data,
                headers: result.headers
                  ? {
                      ...data.headers,
                      ...result.headers,
                    }
                  : data.headers,
                code: result.code,
                body: result.body,
              }),
            });
          } catch (error) {
            respond({
              message,
              data: responseCodec.encode({ ...data, code: 500 }),
            });
            console.error(error);
          }
        }
      })();
    });
  }
}

async function stop(urls: string[]) {
  const key = getClientKey(urls);

  if (clients[key]) {
    await clients[key].client.drain();
    delete clients[key];
  }
}

function register<TInjection extends Record<string, unknown>>(params: {
  urls: string[];
  handlers: Array<
    NatsHandler<NatsService<string, unknown, unknown>, TInjection>
  >;
}) {
  const { urls, handlers } = params;
  const key = getClientKey(urls);
  const isStarted = !!clients[key]?.client;

  if (isStarted) {
    throw new Error(`Can't register more handler after nats client started`);
  }

  if (!clients[key]) {
    clients[key] = {
      client: undefined,
      handlers: {},
    };
  }

  handlers.forEach((handler) => {
    if (!clients[key].handlers[handler.subject]) {
      clients[key].handlers[handler.subject] = handler;
    }
  });
}

function getClientKey(urls: string[]) {
  return urls.sort().join('|');
}

function respond(params: { message: Msg; data?: Uint8Array }) {
  const { message, data } = params;
  if (message.reply) {
    message.respond(data);
  }
}

export default {
  setup: <TInjection extends Record<string, unknown>>(params: {
    urls: string[];
    injections?: TInjection;
    verbose?: boolean;
  }) => {
    const { urls, injections, verbose } = params;

    const client = {
      start: () => start({ urls, injections, verbose }),
      stop: () => stop(urls),
      register: (
        handlers: Array<
          NatsHandler<NatsService<string, unknown, unknown>, TInjection>
        >
      ) => register({ urls, handlers }),
    };

    return client;
  },
};
