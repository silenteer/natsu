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

    const requestCodec = JSONCodec<NatsRequest>();
    const responseCodec = JSONCodec<NatsResponse>();

    Object.entries(clients[key].handlers).forEach(([subject, handler]) => {
      const subcription = client.subscribe(subject);
      (async () => {
        for await (const message of subcription) {
          let data = message.data
            ? requestCodec.decode(message.data)
            : undefined;

          try {
            if (!data) {
              respond({
                message,
                data: responseCodec.encode({
                  ...data,
                  body: undefined,
                  code: 400,
                }),
              });
              continue;
            }
            if (data.body) {
              data = {
                ...data,
                body: decodeBody(data.body as string),
              };
            }

            const injection: TInjection & NatsInjection = {
              ...params.injections,
              message,
              natsService: client,
            };

            if (handler.validate) {
              const validationResult = await handler.validate(data, injection);
              if (validationResult.code !== 'OK') {
                respond({
                  message,
                  data: responseCodec.encode({
                    ...data,
                    code: validationResult.code as number,
                    body: encodeBody(validationResult.errors),
                  }),
                });
                continue;
              }
            }

            if (handler.authorize) {
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
                    body: encodeBody(authorizationResult.message),
                  }),
                });
                continue;
              }
            }

            if (handler.handle) {
              const handleResult = await handler.handle(data, injection);
              if (handleResult.code !== 200) {
                respond({
                  message,
                  data: responseCodec.encode({
                    ...data,
                    code: handleResult.code,
                    body: encodeBody(handleResult.errors),
                  }),
                });
                continue;
              }
              respond({
                message,
                data: responseCodec.encode({
                  ...data,
                  headers: handleResult.headers
                    ? {
                        ...data.headers,
                        ...handleResult.headers,
                      }
                    : data.headers,
                  code: handleResult.code,
                  body: encodeBody(handleResult.body),
                }),
              });
              continue;
            }

            respond({ message });
          } catch (error) {
            console.error(error);
            respond({
              message,
              data: responseCodec.encode({
                ...data,
                body: data?.body as string,
                code: 500,
              }),
            });
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

function encodeBody(body: unknown) {
  return body
    ? Buffer.from(JSONCodec().encode(body)).toString('base64')
    : undefined;
}

function decodeBody(body: string) {
  return body ? JSONCodec().decode(Buffer.from(body, 'base64')) : undefined;
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
