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
import type {
  NatsService,
  NatsRequest,
  NatsResponse,
  NatsInjection,
  NatsHandler,
  NatsValidationResult,
  NatsAuthorizationResult,
  NatsHandleResult,
  NatsMiddlewareValidationResult,
  NatsMiddlewareAuthorizationResult,
  NatsMiddlewareHandleResult,
} from './type';

const requestCodec = JSONCodec<NatsRequest>();
const responseCodec = JSONCodec<NatsResponse>();

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

    Object.entries(clients[key].handlers).forEach(([subject, handler]) => {
      const natsService = clients[key].natsService;
      const subcription = natsService.subscribe(subject);
      (async () => {
        for await (const message of subcription) {
          let data = message.data
            ? requestCodec.decode(message.data)
            : undefined;
          let injection: TInjection & NatsInjection;

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

            injection = {
              ...params.injections,
              subject,
              message,
              natsService,
            };

            //#region Validate
            const beforeValidateResult = await beforeValidate({
              message,
              data,
              injection,
              handler,
            });
            if (beforeValidateResult && beforeValidateResult.code !== 'OK') {
              continue;
            } else if (beforeValidateResult) {
              data = beforeValidateResult.data;
            }

            const validateResult = await validate({
              message,
              data,
              injection,
              handler,
            });
            if (validateResult && validateResult.code !== 'OK') {
              continue;
            }

            const afterValidateResult = await afterValidate({
              message,
              data,
              injection,
              handler,
            });
            if (afterValidateResult && afterValidateResult.code !== 'OK') {
              continue;
            } else if (afterValidateResult) {
              data = afterValidateResult.data;
            }
            //#endregion

            //#region Authorize
            const beforeAuthorizeResult = await beforeAuthorize({
              message,
              data,
              injection,
              handler,
            });
            if (beforeAuthorizeResult && beforeAuthorizeResult.code !== 'OK') {
              continue;
            } else if (beforeAuthorizeResult) {
              data = beforeAuthorizeResult.data;
            }

            const authorizeResult = await authorize({
              message,
              data,
              injection,
              handler,
            });
            if (authorizeResult && authorizeResult.code !== 'OK') {
              continue;
            }

            const afterAuthorizeResult = await afterAuthorize({
              message,
              data,
              injection,
              handler,
            });
            if (afterAuthorizeResult && afterAuthorizeResult.code !== 'OK') {
              continue;
            } else if (afterAuthorizeResult) {
              data = afterAuthorizeResult.data;
            }
            //#endregion

            //#region Handle
            const beforeHandleResult = await beforeHandle({
              message,
              data,
              injection,
              handler,
            });
            if (beforeHandleResult && beforeHandleResult.code !== 'OK') {
              continue;
            } else if (beforeHandleResult) {
              data = beforeHandleResult.data;
            }

            const handleResult = await handle({
              message,
              data,
              injection,
              handler,
            });
            if (handleResult) {
              if (handleResult.code === 200) {
                await afterHandle({
                  message,
                  data,
                  result: handleResult,
                  injection,
                  handler,
                });
              }
              continue;
            }
            //#endregion

            respond({ message });
          } catch (error) {
            console.error(error);

            await respondUnhandledError({
              message,
              data,
              error,
              injection,
              handler,
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

async function beforeValidate(params: {
  message: Msg;
  data: NatsRequest<unknown>;
  injection: NatsInjection;
  handler: NatsHandler<
    NatsService<string, unknown, unknown>,
    Record<string, unknown>
  >;
}) {
  const { message, data, injection, handler } = params;
  let validationResult: NatsMiddlewareValidationResult;

  if (handler.beforeValidateMiddlewares?.length > 0) {
    for (const validateMiddleware of handler.beforeValidateMiddlewares) {
      validationResult = await validateMiddleware.handle(
        validationResult ? validationResult.data : data,
        injection
      );

      if (validationResult.code !== 'OK') {
        await handleErrorResponse({
          data: validationResult.data,
          error: {
            code: validationResult.code,
            errors: validationResult.errors,
          },
          injection,
          handler,
        });

        respond({
          message,
          data: responseCodec.encode({
            ...validationResult.data,
            code: validationResult.code,
            body: encodeBody(validationResult.errors),
          }),
        });
        break;
      }
    }
  }

  return validationResult;
}

async function validate(params: {
  message: Msg;
  data: NatsRequest<unknown>;
  injection: NatsInjection;
  handler: NatsHandler<
    NatsService<string, unknown, unknown>,
    Record<string, unknown>
  >;
}) {
  const { message, data, injection, handler } = params;
  let validationResult: NatsValidationResult;

  if (handler.validate) {
    validationResult = await handler.validate(data, injection);

    if (validationResult.code !== 'OK') {
      await handleErrorResponse({
        data,
        error: {
          code: validationResult.code,
          errors: validationResult.errors,
        },
        injection,
        handler,
      });

      respond({
        message,
        data: responseCodec.encode({
          ...data,
          code: validationResult.code as number,
          body: encodeBody(validationResult.errors),
        }),
      });
    }
  }

  return validationResult;
}

async function afterValidate(params: {
  message: Msg;
  data: NatsRequest<unknown>;
  injection: NatsInjection;
  handler: NatsHandler<
    NatsService<string, unknown, unknown>,
    Record<string, unknown>
  >;
}) {
  const { message, data, injection, handler } = params;
  let validationResult: NatsMiddlewareValidationResult;

  if (handler.afterValidateMiddlewares?.length > 0) {
    for (const validateMiddleware of handler.afterValidateMiddlewares) {
      validationResult = await validateMiddleware.handle(
        validationResult ? validationResult.data : data,
        injection
      );

      if (validationResult.code !== 'OK') {
        await handleErrorResponse({
          data: validationResult.data,
          error: {
            code: validationResult.code,
            errors: validationResult.errors,
          },
          injection,
          handler,
        });

        respond({
          message,
          data: responseCodec.encode({
            ...validationResult.data,
            code: validationResult.code,
            body: encodeBody(validationResult.errors),
          }),
        });
        break;
      }
    }
  }

  return validationResult;
}

async function beforeAuthorize(params: {
  message: Msg;
  data: NatsRequest<unknown>;
  injection: NatsInjection;
  handler: NatsHandler<
    NatsService<string, unknown, unknown>,
    Record<string, unknown>
  >;
}) {
  const { message, data, injection, handler } = params;
  let authorizationResult: NatsMiddlewareAuthorizationResult;

  if (handler.beforeAuthorizeMiddlewares?.length > 0) {
    for (const authorizeMiddleware of handler.beforeAuthorizeMiddlewares) {
      authorizationResult = await authorizeMiddleware.handle(
        authorizationResult ? authorizationResult.data : data,
        injection
      );

      if (authorizationResult.code !== 'OK') {
        await handleErrorResponse({
          data: authorizationResult.data,
          error: {
            code: authorizationResult.code,
            errors: authorizationResult.errors,
          },
          injection,
          handler,
        });

        respond({
          message,
          data: responseCodec.encode({
            ...authorizationResult.data,
            code: authorizationResult.code,
            body: encodeBody(authorizationResult.errors),
          }),
        });
        break;
      }
    }
  }
  return authorizationResult;
}

async function authorize(params: {
  message: Msg;
  data: NatsRequest<unknown>;
  injection: NatsInjection;
  handler: NatsHandler<
    NatsService<string, unknown, unknown>,
    Record<string, unknown>
  >;
}) {
  const { message, data, injection, handler } = params;
  let authorizationResult: NatsAuthorizationResult;

  if (handler.authorize) {
    authorizationResult = await handler.authorize(data, injection);

    if (authorizationResult.code !== 'OK') {
      await handleErrorResponse({
        data,
        error: {
          code: authorizationResult.code,
          errors: authorizationResult.errors,
        },
        injection,
        handler,
      });

      respond({
        message,
        data: responseCodec.encode({
          ...data,
          code: authorizationResult.code as number,
          body: encodeBody(authorizationResult.errors),
        }),
      });
    }
  }
  return authorizationResult;
}

async function afterAuthorize(params: {
  message: Msg;
  data: NatsRequest<unknown>;
  injection: NatsInjection;
  handler: NatsHandler<
    NatsService<string, unknown, unknown>,
    Record<string, unknown>
  >;
}) {
  const { message, data, injection, handler } = params;
  let authorizationResult: NatsMiddlewareAuthorizationResult;

  if (handler.afterAuthorizeMiddlewares?.length > 0) {
    for (const authorizeMiddleware of handler.afterAuthorizeMiddlewares) {
      authorizationResult = await authorizeMiddleware.handle(
        authorizationResult ? authorizationResult.data : data,
        injection
      );

      if (authorizationResult.code !== 'OK') {
        await handleErrorResponse({
          data: authorizationResult.data,
          error: {
            code: authorizationResult.code,
            errors: authorizationResult.errors,
          },
          injection,
          handler,
        });

        respond({
          message,
          data: responseCodec.encode({
            ...authorizationResult.data,
            code: authorizationResult.code,
            body: encodeBody(authorizationResult.errors),
          }),
        });
        break;
      }
    }
  }
  return authorizationResult;
}

async function beforeHandle(params: {
  message: Msg;
  data: NatsRequest<unknown>;
  injection: NatsInjection;
  handler: NatsHandler<
    NatsService<string, unknown, unknown>,
    Record<string, unknown>
  >;
}) {
  const { message, data, injection, handler } = params;
  let handleResult: NatsMiddlewareHandleResult;

  if (handler.beforeHandleMiddlewares?.length > 0) {
    for (const handleMiddleware of handler.beforeHandleMiddlewares) {
      handleResult = await handleMiddleware.handle(
        handleResult ? handleResult.data : data,
        injection
      );

      if (handleResult.code != 'OK') {
        await handleErrorResponse({
          data: handleResult.data,
          error: {
            code: handleResult.code,
            errors: handleResult.errors,
          },
          injection,
          handler,
        });

        respond({
          message,
          data: responseCodec.encode({
            ...handleResult.data,
            code: handleResult.code,
            body: encodeBody(handleResult.errors),
          }),
        });
        break;
      }
    }
  }
  return handleResult;
}

async function handle(params: {
  message: Msg;
  data: NatsRequest<unknown>;
  injection: NatsInjection;
  handler: NatsHandler<
    NatsService<string, unknown, unknown>,
    Record<string, unknown>
  >;
}) {
  const { message, data, injection, handler } = params;
  let handleResult: NatsHandleResult<unknown>;

  if (handler.handle) {
    handleResult = await handler.handle(data, injection);
    if (handleResult.code !== 200) {
      await handleErrorResponse({
        data,
        error: {
          code: handleResult.code,
          errors: handleResult.errors,
        },
        injection,
        handler,
      });

      respond({
        message,
        data: responseCodec.encode({
          ...data,
          code: handleResult.code,
          body: encodeBody(handleResult.errors),
        }),
      });
    }
  }
  return handleResult;
}

async function afterHandle(params: {
  message: Msg;
  data: NatsRequest<unknown>;
  result: NatsHandleResult<unknown>;
  injection: NatsInjection;
  handler: NatsHandler<
    NatsService<string, unknown, unknown>,
    Record<string, unknown>
  >;
}) {
  const { message, data, result, injection, handler } = params;
  let handleResult: NatsMiddlewareHandleResult;

  if (handler.afterHandleMiddlewares?.length > 0) {
    for (const handleMiddleware of handler.afterHandleMiddlewares) {
      handleResult = await handleMiddleware.handle(
        handleResult ? handleResult.data : data,
        handleResult ? handleResult.result : result,
        injection
      );

      if (handleResult.code !== 'OK') {
        await handleErrorResponse({
          data: handleResult.data,
          error: {
            code: handleResult.code,
            errors: handleResult.errors,
          },
          injection,
          handler,
        });

        respond({
          message,
          data: responseCodec.encode({
            ...handleResult.data,
            code: handleResult.code,
            body: encodeBody(handleResult.errors),
          }),
        });
        return;
      }
    }
  }

  const lastData = handleResult ? handleResult.data : data;
  const lastResult = handleResult ? handleResult.result : result;

  respond({
    message,
    data: responseCodec.encode({
      ...lastData,
      headers: lastResult?.headers
        ? {
            ...lastData?.headers,
            ...lastResult?.headers,
          }
        : lastData?.headers,
      code: lastResult?.code || 200,
      body: encodeBody(lastResult?.body),
    }),
  });
}

async function handleErrorResponse(params: {
  data: NatsRequest<unknown>;
  error: { code: number; errors?: unknown };
  injection: NatsInjection;
  handler: NatsHandler<
    NatsService<string, unknown, unknown>,
    Record<string, unknown>
  >;
}) {
  const { data, error, injection, handler } = params;

  if (handler.respondError) {
    await handler.respondError(data, error, injection);
  }
}

async function respondUnhandledError(params: {
  message: Msg;
  data: NatsRequest<unknown>;
  error: Error;
  injection: NatsInjection;
  handler: NatsHandler<
    NatsService<string, unknown, unknown>,
    Record<string, unknown>
  >;
}) {
  const { message, data, error, injection, handler } = params;

  if (handler.respondUnhandledError) {
    try {
      await handler.respondUnhandledError(data, error, injection);
    } catch (error) {
      console.error(`[${handler.subject}]respondUnhandledError`, error);
    }
  }

  respond({
    message,
    data: responseCodec.encode({
      ...data,
      body: encodeBody(data?.body),
      code: 500,
    }),
  });
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
      start: () =>
        start({
          urls,
          injections,
          user,
          pass,
          verbose,
          namespace,
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
