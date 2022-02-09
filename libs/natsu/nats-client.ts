/* eslint-disable @typescript-eslint/ban-types */
import * as Sentry from '@sentry/node';
import type { SpanStatusType } from '@sentry/tracing';
import { spanStatusfromHttpCode } from '@sentry/tracing';
import type { Transaction } from '@sentry/types';
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
  sentry?: {
    options: Pick<
      Sentry.NodeOptions,
      | 'dsn'
      | 'tracesSampleRate'
      | 'environment'
      | 'release'
      | 'enabled'
      | 'serverName'
    >;
    getUser: (data: NatsRequest<unknown>) => Sentry.User;
  };
}) {
  if (
    params.namespace &&
    (!params.namespace.getNamespaceSubject ||
      params.namespace.namespaceSubjects?.length === 0)
  ) {
    throw new Error(`Wrong config for 'namespace' `);
  }

  const { urls, user, pass, verbose, sentry } = params;
  const key = getClientKey(urls);

  if (!clients[key]) {
    throw new Error(`Must register handlers before starting client`);
  }

  if (!clients[key].natsService) {
    if (sentry) {
      Sentry.init({
        integrations: [new Sentry.Integrations.Http({ tracing: true })],
        tracesSampleRate: 1.0,
        ...sentry.options,
      });
    }

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

          let transaction: Transaction;
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

            Sentry.setUser(sentry.getUser(data));
            transaction = Sentry.startTransaction({
              name: subject,
              traceId: data.headers['trace-id'] as string,
            });

            Sentry.getCurrentHub().configureScope((scope) =>
              scope.setSpan(transaction)
            );

            const injection: TInjection & NatsInjection = {
              ...params.injections,
              message,
              natsService,
            };

            if (handler.validate) {
              const validateSpan = transaction.startChild({
                description: `${subject} - validate`,
              });

              try {
                const validationResult = await handler.validate(
                  data,
                  injection
                );
                if (validationResult.code !== 'OK') {
                  respond({
                    message,
                    data: responseCodec.encode({
                      ...data,
                      code: validationResult.code as number,
                      body: encodeBody(validationResult.errors),
                    }),
                  });

                  validateSpan.setStatus(
                    spanStatusfromHttpCode(validationResult.code)
                  );
                  validateSpan.finish();
                  transaction.finish();
                  continue;
                } else {
                  validateSpan.setStatus('ok' as SpanStatusType);
                  validateSpan.finish();
                }
              } catch (error) {
                validateSpan.setStatus('internal_error' as SpanStatusType);
                validateSpan.finish();
                throw error;
              }
            }

            if (handler.authorize) {
              const authorizeSpan = transaction.startChild({
                description: `${subject} - authorize`,
              });

              try {
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

                  authorizeSpan.setStatus(
                    spanStatusfromHttpCode(authorizationResult.code)
                  );
                  authorizeSpan.finish();
                  transaction.finish();
                  continue;
                } else {
                  authorizeSpan.setStatus('ok' as SpanStatusType);
                  authorizeSpan.finish();
                }
              } catch (error) {
                authorizeSpan.setStatus('internal_error' as SpanStatusType);
                authorizeSpan.finish();
                throw error;
              }
            }

            if (handler.handle) {
              const handleSpan = transaction.startChild({
                description: `${subject} - handle`,
              });

              try {
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

                  Sentry.captureMessage(`${subject} [${handleResult.code}]`, {
                    extra: { ...data, errors: handleResult.errors },
                  });
                  handleSpan.setStatus(
                    spanStatusfromHttpCode(handleResult.code)
                  );
                } else {
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
                  handleSpan.setStatus('ok' as SpanStatusType);
                }
              } catch (error) {
                handleSpan.setStatus('internal_error' as SpanStatusType);
                handleSpan.finish();
                throw error;
              }
              handleSpan.finish();
              transaction.finish();
              continue;
            }

            respond({ message });
          } catch (error) {
            console.error(error);
            Sentry.captureException(error, {
              extra: {
                subject,
                data,
                code: 500,
              },
            });

            respond({
              message,
              data: responseCodec.encode({
                ...data,
                body: data?.body as string,
                code: 500,
              }),
            });
          } finally {
            transaction?.finish();
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
    sentry?: {
      options: Pick<
        Sentry.NodeOptions,
        | 'dsn'
        | 'tracesSampleRate'
        | 'environment'
        | 'release'
        | 'enabled'
        | 'serverName'
      >;
      getUser: (data: NatsRequest<unknown>) => Sentry.User;
    };
  }) => {
    const { urls, injections, user, pass, verbose, namespace, sentry } = params;

    const client = {
      start: () =>
        start({
          urls,
          injections,
          user,
          pass,
          verbose,
          namespace,
          sentry,
        }),
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
