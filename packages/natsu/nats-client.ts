/* eslint-disable @typescript-eslint/ban-types */
import type {
  NatsConnection,
  Msg,
  RequestOptions,
  PublishOptions,
  SubscriptionOptions,
} from 'nats';
import { connect, JSONCodec } from 'nats';
import type {
  NatsService,
  NatsRequest,
  NatsResponse,
} from '@silenteer/natsu-type';
import type {
  NatsInjection,
  NatsHandleInjection,
  NatsHandler,
  NatsHandleResult,
  NatsMiddlewareBeforeInjection,
  NatsMiddlewareAfterInjection,
  NatsMiddlewareBeforeResult,
  NatsMiddlewareAfterResult,
} from './type';

class UnhandledMiddlewareError extends Error {}
class UnhandledHandleError extends Error {}

type registeredHandlers = {
  [subject: string]: {
    handler: NatsHandler<
      NatsService<string, unknown, unknown>,
      Record<string, unknown>
    >;
    middlewares: {
      before: Array<{
        middlewareId: string;
        handle: (params: {
          data: NatsRequest<NatsService<string, unknown, unknown>['request']>;
          injection: NatsInjection<
            NatsService<string, unknown, unknown>,
            Record<string, unknown>
          >;
        }) => Promise<
          NatsMiddlewareBeforeResult<
            NatsService<string, unknown, unknown>,
            Record<string, unknown>
          >
        >;
      }>;
      after: Array<{
        middlewareId: string;
        handle: (params: {
          data: NatsRequest<NatsService<string, unknown, unknown>['request']>;
          injection: NatsInjection<
            NatsService<string, unknown, unknown>,
            Record<string, unknown>
          >;
        }) => Promise<
          NatsMiddlewareAfterResult<
            NatsService<string, unknown, unknown>,
            Record<string, unknown>
          >
        >;
      }>;
    };
    injection: Pick<
      NatsInjection<NatsService<string, unknown, unknown>>,
      'subject' | 'handler' | 'logService'
    >;
  };
};

const requestCodec = JSONCodec<NatsRequest>();
const responseCodec = JSONCodec<NatsResponse>();

async function start<
  TInjection extends Record<string, unknown> &
    Pick<NatsInjection<NatsService<string, unknown, unknown>>, 'logService'>
>(params: {
  urls: string[];
  user?: string;
  pass?: string;
  verbose?: boolean;
  logLevels?: Array<'log' | 'info' | 'warn' | 'error'> | 'all' | 'none';
  injection?: (
    natsService: ReturnType<typeof createNatsService>
  ) => Promise<TInjection>;
  handlers: Array<
    NatsHandler<NatsService<string, unknown, unknown>, TInjection>
  >;
  onCreateNatsService?: (
    natsService: ReturnType<typeof createNatsService>
  ) => ReturnType<typeof createNatsService>;
}) {
  const {
    urls,
    user,
    pass,
    verbose,
    logLevels,
    handlers,
    injection,
    onCreateNatsService,
  } = params;

  if (!handlers || handlers.length === 0) {
    throw new Error(`Must register handlers before starting client`);
  }

  const natsConnection = await connect({
    servers: urls,
    user,
    pass,
    pingInterval: 30 * 1000,
    maxPingOut: 10,
    verbose,
    reconnect: true,
    maxReconnectAttempts: 3,
    reconnectTimeWait: 1000,
  });

  let natsService = createNatsService(natsConnection);
  if (onCreateNatsService) {
    natsService = onCreateNatsService(natsService);
  }

  const registeredHandlers = await register({
    handlers,
    injection: injection ? await injection(natsService) : undefined,
    logLevels,
  });

  Object.entries(registeredHandlers).forEach(
    ([subject, { handler, injection: registeredInjection, middlewares }]) => {
      natsService.subscribe(subject, {
        callback: async (error, message) => {
          let data = message.data
            ? requestCodec.decode(message.data)
            : undefined;
          const handlerLogService = registeredInjection.logService;
          let injection: NatsInjection<NatsService<string, unknown, unknown>>;

          try {
            injection = {
              ...registeredInjection,
              message,
              natsService,
            };

            handlerLogService.info('Begin');

            if (!data) {
              handlerLogService.error('Incoming message has no data');

              await respond({
                message,
                request: data,
                response: {
                  headers: data?.headers,
                  body: undefined,
                  code: 400,
                },
                injection,
                onResponse: handler.response,
              });

              handlerLogService.info('End');
              return;
            }
            if (data.body) {
              data = {
                ...data,
                body: data.body,
              };
            }

            //#region Before
            const beforeResult = await before({
              message,
              data,
              injection,
              middlewares: middlewares.before,
            });
            if (beforeResult && beforeResult.code !== 'OK') {
              handlerLogService.info('End');
              return;
            } else if (beforeResult) {
              data = beforeResult.data;
              injection = beforeResult.injection;
            }
            //#endregion

            //#region Handle
            let handleResult = await handle({
              message,
              data,
              injection,
              handler,
            });
            if (handleResult && handleResult.code !== 'OK') {
              handlerLogService.info('End');
              return;
            }
            //#endregion

            //#region After
            const afterResult = await after({
              message,
              data,
              result: handleResult,
              injection,
              middlewares: middlewares.after,
            });
            if (afterResult && afterResult.code !== 'OK') {
              handlerLogService.info('End');
              return;
            } else if (afterResult) {
              data = afterResult.data;
              handleResult = afterResult.result;
              injection = afterResult.injection;
            }
            //#endregion

            await respond({
              message,
              request: data,
              response: {
                headers: handleResult?.headers
                  ? {
                      ...data?.headers,
                      ...handleResult?.headers,
                    }
                  : data?.headers,
                code: handleResult?.code === 'OK' ? 200 : handleResult?.code,
                body: handleResult?.body,
              },
              injection,
              onResponse: handler.response,
            });
            handlerLogService.info('End');
          } catch (error) {
            await respondUnhandledError({
              message,
              data,
              error,
              injection,
              handler,
            });
            handlerLogService.info('End');
          }
        },
      });
    }
  );

  return natsService;
}

async function stop(natsService: ReturnType<typeof createNatsService>) {
  await natsService?.drain();
}

async function register(params: {
  handlers: Array<
    NatsHandler<NatsService<string, unknown, unknown>, Record<string, unknown>>
  >;
  injection: Record<string, unknown> &
    Pick<NatsInjection<NatsService<string, unknown, unknown>>, 'logService'>;
  logLevels?: Array<'log' | 'info' | 'warn' | 'error'> | 'all' | 'none';
}) {
  const { injection, handlers, logLevels } = params;
  const result: registeredHandlers = {};

  for (const handler of handlers) {
    const { subject } = handler;

    if (!result[subject]) {
      const handlerLogService = createLogService({
        prefix: `[${subject}]`,
        logService: injection?.logService,
        logLevels,
      });

      const registeredInjection = {
        ...injection,
        subject,
        handler: {
          validate: handler.validate,
          authorize: handler.authorize,
          handle: handler.handle,
        },
        logService: handlerLogService,
      };

      const middlewares = await loadMiddlewares({
        handler,
        injection: registeredInjection,
      });

      result[subject] = {
        handler,
        middlewares,
        injection: registeredInjection,
      };
    }
  }

  return result;
}

function createNatsService<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown> = Record<string, unknown>
>(client: NatsConnection) {
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
      return client.publish(subject, JSONCodec().encode(data), opts);
    },
    subscribe: (subject: string, opts?: SubscriptionOptions) => {
      return client.subscribe(subject, opts);
    },
    drain: async () => {
      return client.drain();
    },
  } as NatsInjection<TService, TInjection>['natsService'];
}

function createLogService<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown> = Record<string, unknown>
>(params: {
  prefix: string;
  logService: NatsInjection<TService, TInjection>['logService'];
  logLevels?: Array<'log' | 'info' | 'warn' | 'error'> | 'all' | 'none';
}) {
  const { prefix, logService = console, logLevels = 'all' } = params;
  let levels: Array<'log' | 'info' | 'warn' | 'error'> = [];

  if (Array.isArray(logLevels)) {
    levels = [...logLevels];
  } else if (logLevels === 'all') {
    levels = ['log', 'info', 'warn', 'error'];
  }

  return {
    log: (message?: any, ...optionalParams: any[]) => {
      if (levels.includes('log')) {
        logService.log(prefix, message, ...optionalParams);
      }
    },
    info: (message?: any, ...optionalParams: any[]) => {
      if (levels.includes('info')) {
        logService.info(prefix, message, ...optionalParams);
      }
    },
    warn: (message?: any, ...optionalParams: any[]) => {
      if (levels.includes('warn')) {
        logService.warn(prefix, message, ...optionalParams);
      }
    },
    error: (message?: any, ...optionalParams: any[]) => {
      if (levels.includes('error')) {
        logService.error(prefix, message, ...optionalParams);
      }
    },
  } as NatsInjection<TService, TInjection>['logService'];
}

function createHandleInjection<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown>
>(injection: TInjection & NatsInjection<TService, TInjection>) {
  const handleInjection: NatsHandleInjection<TService, TInjection> = {
    ...injection,
    ok: (
      params?: Parameters<NatsHandleInjection<TService, TInjection>['ok']>[0]
    ) => {
      const { headers, body } = params || {};

      return {
        code: 'OK',
        headers,
        body,
      };
    },
    error: (
      params?: Parameters<NatsHandleInjection<TService, TInjection>['error']>[0]
    ) => {
      const { code = 500, errors } = params || {};

      return {
        code,
        errors,
      };
    },
  };

  return handleInjection;
}

function createMiddlewareBeforeInjection<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown>
>(injection: NatsInjection<TService, TInjection>) {
  const beforeInjection: NatsMiddlewareBeforeInjection<TService, TInjection> = {
    ...injection,
    ok: (
      params: Parameters<
        NatsMiddlewareBeforeInjection<TService, TInjection>['ok']
      >[0]
    ) => {
      const { data, injection } = params;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { ok, error, ...rest } = injection;

      return {
        code: 'OK',
        data,
        injection: rest as unknown as NatsInjection<TService, TInjection>,
      };
    },
    error: (
      params: Parameters<
        NatsMiddlewareBeforeInjection<TService, TInjection>['error']
      >[0]
    ) => {
      const { data, injection, code = 400, errors } = params;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { ok, error, ...rest } = injection;

      return {
        code,
        data,
        errors,
        injection: rest as unknown as NatsInjection<TService, TInjection>,
      };
    },
  };

  return beforeInjection;
}

function createMiddlewareAfterInjection<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown>
>(injection: NatsInjection<TService, TInjection>) {
  const afterInjection: NatsMiddlewareAfterInjection<TService, TInjection> = {
    ...injection,
    ok: (
      params: Parameters<
        NatsMiddlewareAfterInjection<TService, TInjection>['ok']
      >[0]
    ) => {
      const { data, result, injection } = params;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { ok, error, ...rest } = injection;

      return {
        code: 'OK',
        data,
        result,
        injection: rest as unknown as NatsInjection<TService, TInjection>,
      };
    },
    error: (
      params: Parameters<
        NatsMiddlewareAfterInjection<TService, TInjection>['error']
      >[0]
    ) => {
      const { data, result, injection, code = 500, errors } = params;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { ok, error, ...rest } = injection;

      return {
        code,
        data,
        result,
        errors,
        injection: rest as unknown as NatsInjection<TService, TInjection>,
      };
    },
  };

  return afterInjection;
}

async function loadMiddlewares<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown>
>(params: {
  injection: TInjection &
    Omit<NatsInjection<NatsService<string, unknown, unknown>>, 'message'>;
  handler: NatsHandler<TService, TInjection>;
}) {
  const { injection, handler } = params;

  const before: Array<{
    middlewareId: string;
    handle: (params: {
      data: NatsRequest<TService['request']>;
      injection: NatsInjection<TService, TInjection>;
    }) => Promise<NatsMiddlewareBeforeResult<TService, TInjection>>;
  }> = [];
  const after: Array<{
    middlewareId: string;
    handle: (params: {
      data: NatsRequest<TService['request']>;
      injection: NatsInjection<TService, TInjection>;
    }) => Promise<NatsMiddlewareAfterResult<TService, TInjection>>;
  }> = [];

  if (handler.middlewares?.length > 0) {
    for (const middleware of handler.middlewares) {
      const middlewareId = middleware.id;
      const instance = await middleware.init({ injection });

      if (instance.before) {
        before.push({
          middlewareId,
          handle: async (params: {
            data: NatsRequest<TService['request']>;
            injection: NatsInjection<TService, TInjection>;
          }) => {
            const { injection, ...rest } = params;
            const middlewareLogService = createLogService({
              prefix: `[${middleware.id}][before]`,
              logService: injection.logService,
            });
            const middlewareInjection = createMiddlewareBeforeInjection({
              ...injection,
              logService: middlewareLogService,
            });

            middlewareLogService.info('Handling');

            try {
              const result = await instance.before({
                injection: middlewareInjection,
                ...rest,
              });

              if (result.code !== 'OK') {
                middlewareLogService.error({
                  code: result.code,
                  data: result.data,
                  errors: result.errors,
                });
              }

              return {
                ...result,
                injection: {
                  ...result.injection,
                  logService: injection.logService,
                },
              };
            } catch (error) {
              middlewareLogService.error(error);
              throw new UnhandledMiddlewareError(error);
            }
          },
        });
      }
      if (instance.after) {
        after.unshift({
          middlewareId,
          handle: async (params: {
            data: NatsRequest<TService['request']>;
            result: NatsHandleResult<TService>;
            injection: NatsInjection<TService, TInjection>;
          }) => {
            const { injection, ...rest } = params;
            const middlewareLogService = createLogService({
              prefix: `[${middleware.id}][after]`,
              logService: injection.logService,
            });
            const middlewareInjection = createMiddlewareAfterInjection({
              ...injection,
              logService: middlewareLogService,
            });

            middlewareLogService.info('Handling');

            try {
              const result = await instance.after({
                injection: middlewareInjection,
                ...rest,
              });

              if (result.code !== 'OK') {
                middlewareLogService.error({
                  code: result.code,
                  data: result.data,
                  errors: result.errors,
                });
              }

              return {
                ...result,
                injection: {
                  ...result.injection,
                  logService: injection.logService,
                },
              };
            } catch (error) {
              middlewareLogService.error(error);
              throw new UnhandledMiddlewareError(error);
            }
          },
        });
      }
    }
  }

  return {
    before,
    after,
  };
}

async function before<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown>
>(params: {
  message: Msg;
  data: NatsRequest<TService['request']>;
  injection: TInjection & NatsInjection<TService, TInjection>;
  middlewares: Array<{
    middlewareId: string;
    handle: (params: {
      data: NatsRequest<TService['request']>;
      injection: TInjection & NatsInjection<TService, TInjection>;
    }) => Promise<NatsMiddlewareBeforeResult<TService, TInjection>>;
  }>;
}) {
  const { message, data, injection, middlewares } = params;
  let beforeResult: NatsMiddlewareBeforeResult<TService, TInjection>;

  if (middlewares.length > 0) {
    for (const middleware of middlewares) {
      beforeResult = await middleware.handle({
        data: beforeResult ? beforeResult.data : data,
        injection: beforeResult ? beforeResult.injection : injection,
      });

      if (beforeResult.code !== 'OK') {
        await respond({
          message,
          request: beforeResult.data,
          response: {
            headers: beforeResult.data.headers,
            body: beforeResult.errors,
            code: beforeResult.code,
          },
          injection,
        });
        break;
      }
    }
  }

  return beforeResult;
}

async function handle<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown>
>(params: {
  message: Msg;
  data: NatsRequest<TService['request']>;
  injection: TInjection & NatsInjection<TService, TInjection>;
  handler: NatsHandler<TService, TInjection>;
}) {
  const { message, data, injection, handler } = params;
  let handleResult: NatsHandleResult<TService>;

  if (handler.handle) {
    const handleLogService = createLogService({
      prefix: `[handle]`,
      logService: injection.logService,
    });
    const handleInjection = createHandleInjection<TService, TInjection>({
      ...injection,
      logService: handleLogService,
    });

    try {
      handleLogService.info('Handling');
      handleResult = await handler.handle(data, handleInjection);

      if (handleResult.code !== 'OK') {
        handleLogService.error(handleResult);

        if (handler.respondError) {
          handleLogService.info('Handling error response');

          await handler.respondError(
            data,
            { code: handleResult.code, errors: handleResult.errors },
            injection
          );
        }

        await respond({
          message,
          request: data,
          response: {
            headers: data.headers,
            body: handleResult.errors,
            code: handleResult.code,
          },
          injection,
        });
      }
    } catch (error) {
      handleLogService.error(error);
      throw new UnhandledHandleError(error);
    }
  }

  return handleResult;
}

async function after<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown>
>(params: {
  message: Msg;
  data: NatsRequest<TService['request']>;
  result: NatsHandleResult<TService>;
  injection: TInjection & NatsInjection<TService, TInjection>;
  middlewares: Array<{
    middlewareId: string;
    handle: (params: {
      data: NatsRequest<TService['request']>;
      result: NatsHandleResult<TService>;
      injection: TInjection & NatsInjection<TService, TInjection>;
    }) => Promise<NatsMiddlewareAfterResult<TService, TInjection>>;
  }>;
}) {
  const { message, data, result, injection, middlewares } = params;
  let afterResult: NatsMiddlewareAfterResult<TService, TInjection>;

  if (middlewares.length > 0) {
    for (const middleware of middlewares) {
      afterResult = await middleware.handle({
        data: afterResult ? afterResult.data : data,
        result: afterResult ? afterResult.result : result,
        injection: afterResult ? afterResult.injection : injection,
      });

      if (afterResult.code !== 'OK') {
        await respond({
          message,
          request: afterResult.data,
          response: {
            headers: afterResult.data.headers,
            body: afterResult.errors,
            code: afterResult.code,
          },
          injection,
        });
        break;
      }
    }
  }

  return afterResult;
}

async function respondUnhandledError<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown>
>(params: {
  message: Msg;
  data: NatsRequest<TService['request']>;
  error: Error;
  injection: TInjection & NatsInjection<TService, TInjection>;
  handler: NatsHandler<TService, TInjection>;
}) {
  const { message, data, error, injection, handler } = params;
  const isUnhandledMiddlewareError = error instanceof UnhandledMiddlewareError;
  const isUnhandledHandleError = error instanceof UnhandledHandleError;

  if (!isUnhandledMiddlewareError && !isUnhandledHandleError) {
    injection?.logService?.error(error);
  }

  if (handler.respondUnhandledError) {
    try {
      await handler.respondUnhandledError(data, error, injection);
    } catch (error) {
      injection?.logService?.error('respondUnhandledError', error);
    }
  }

  await respond({
    message,
    request: data,
    response: {
      headers: data?.headers,
      body: data?.body,
      code: 500,
    },
    injection,
    onResponse: handler.response,
  });
}

async function respond<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown>
>(params: {
  message: Msg;
  request: NatsRequest<TService['request']>;
  response: Pick<NatsResponse, 'headers' | 'code'> & {
    code: number;
    body: TService['response'];
  };
  injection: TInjection & NatsInjection<TService, TInjection>;
  onResponse?: NatsHandler<TService, TInjection>['response'];
}) {
  const { message, request, response, injection, onResponse } = params;

  if (!message.reply) {
    return;
  }

  let data: Uint8Array;
  if (onResponse && request) {
    data = await onResponse({
      request,
      response,
      codec: responseCodec,
      injection,
    });
  } else {
    data = responseCodec.encode({
      headers: response.headers,
      body: response.body,
      code: response.code,
    });
  }

  message.respond(data);
}

export default {
  setup: <
    TInjection extends Record<string, unknown> &
      Pick<NatsInjection<NatsService<string, unknown, unknown>>, 'logService'>
  >(params: {
    urls: string[];
    user?: string;
    pass?: string;
    verbose?: boolean;
    logLevels?: Array<'log' | 'info' | 'warn' | 'error'> | 'all' | 'none';
    injection?: (
      natsService: ReturnType<typeof createNatsService>
    ) => Promise<TInjection>;
    onCreateNatsService?: (natsService) => ReturnType<typeof createNatsService>;
  }) => {
    const {
      urls,
      user,
      pass,
      verbose,
      logLevels,
      injection,
      onCreateNatsService,
    } = params;
    let natsHandlers: Array<
      NatsHandler<NatsService<string, unknown, unknown>, TInjection>
    > = [];
    let natsService: ReturnType<typeof createNatsService>;
    let isStarted: boolean;

    const client = {
      start: async () => {
        natsService = await start<TInjection>({
          urls,
          user,
          pass,
          verbose,
          logLevels,
          handlers: natsHandlers,
          injection,
          onCreateNatsService,
        });
        isStarted = true;
      },
      stop: async () => {
        await stop(natsService);
        natsService = undefined;
        natsHandlers = [];
        isStarted = false;
      },
      register: async (
        handlers: Array<
          NatsHandler<NatsService<string, unknown, unknown>, TInjection>
        >
      ) => {
        if (isStarted) {
          throw new Error(
            `Can't register more handler after nats client started`
          );
        }

        natsHandlers = natsHandlers.concat(handlers);
      },
    };

    return client;
  },
};
