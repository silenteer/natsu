/* eslint-disable @typescript-eslint/ban-types */
import type {
  NatsConnection,
  Msg,
  RequestOptions,
  PublishOptions,
  SubscriptionOptions,
} from 'nats';
import { connect, JSONCodec } from 'nats';
import type { NatsGetNamespace } from '@silenteer/natsu-type';
import type { NatsService } from './type';
import type {
  NatsRequest,
  NatsResponse,
  NatsInjection,
  NatsHandler,
} from './type';

const clients: {
  [urls: string]: {
    natsService: NatsInjection['natsService'];
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
  user?: string;
  pass?: string;
  verbose?: boolean;
  namespace?: {
    getNamespaceSubject: string;
    namespaceSubjects: string[];
  };
}) {
  if (
    params.namespace &&
    (!params.namespace.getNamespaceSubject ||
      params.namespace.namespaceSubjects?.length === 0)
  ) {
    throw new Error(`Wrong config for 'namespace' `);
  }

  const { urls, user, pass, verbose } = params;
  const key = getClientKey(urls);

  if (!clients[key]) {
    throw new Error(`Must register handlers before starting client`);
  }

  if (!clients[key].natsService) {
    const client = await connect({
      servers: urls,
      user,
      pass,
      pingInterval: 30 * 1000,
      maxPingOut: 10,
      verbose,
    });

    clients[key] = {
      ...clients[key],
      natsService: createNatsService({ client, namespace: params.namespace }),
    };

    const requestCodec = JSONCodec<NatsRequest>();
    const responseCodec = JSONCodec<NatsResponse>();

    Object.entries(clients[key].handlers).forEach(([subject, handler]) => {
      const natsService = clients[key].natsService;
      const subcription = natsService.subscribe(subject);
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
              natsService,
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
    await clients[key].natsService.drain();
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
  const isStarted = !!clients[key]?.natsService;

  if (isStarted) {
    throw new Error(`Can't register more handler after nats client started`);
  }

  if (!clients[key]) {
    clients[key] = {
      natsService: undefined,
      handlers: {},
    };
  }

  handlers.forEach((handler) => {
    const { subject } = handler;
    if (!clients[key].handlers[subject]) {
      clients[key].handlers[subject] = handler;
    }
  });
}

function getClientKey(urls: string[]) {
  return urls.sort().join('|');
}

function createNatsService(params: {
  client: NatsConnection;
  namespace?: {
    getNamespaceSubject: string;
    namespaceSubjects: string[];
  };
}): NatsInjection['natsService'] {
  const { client } = params;
  const { getNamespaceSubject, namespaceSubjects } = params.namespace || {};

  return {
    request: async (
      subject: string,
      data?: NatsRequest,
      opts?: RequestOptions
    ) => {
      return client.request(subject, JSONCodec().encode(data), opts);
    },
    publish: async (
      subject: string,
      data?: NatsResponse,
      opts?: PublishOptions
    ) => {
      const shouldSetNamespace =
        getNamespaceSubject && namespaceSubjects?.includes(subject);

      let _subject = subject;
      if (shouldSetNamespace) {
        try {
          const { headers } = data || {};
          const natsRequest: NatsRequest<string> = {
            headers,
            body: encodeBody({ subject }),
          };

          const message = await client.request(
            getNamespaceSubject,
            JSONCodec().encode(natsRequest)
          );
          const natsResponse = JSONCodec<NatsResponse>().decode(message.data);
          const { namespace } = (decodeBody(natsResponse.body) ||
            {}) as NatsGetNamespace<string>['response'];

          if (namespace) {
            _subject = `${subject}.${namespace}`;
          } else {
            throw new Error(`Namespace is required for subject: ${subject}`);
          }
        } catch (error) {
          console.error(`Get namespace failed for subject: ${subject}`);
          throw error;
        }
      }

      return client.publish(_subject, JSONCodec().encode(data), opts);
    },
    subscribe: (subject: string, opts?: SubscriptionOptions) => {
      return client.subscribe(subject, opts);
    },
    drain: async () => {
      return client.drain();
    },
  };
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
    user?: string;
    pass?: string;
    verbose?: boolean;
    namespace?: {
      getNamespaceSubject: string;
      namespaceSubjects: string[];
    };
  }) => {
    const { urls, injections, user, pass, verbose, namespace } = params;

    const client = {
      start: () => start({ urls, injections, user, pass, verbose, namespace }),
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