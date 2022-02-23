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
  NatsGetNamespace,
} from '@silenteer/natsu-type';
import type {
  NatsInjection,
  NatsValidationInjection,
  NatsAuthorizationInjection,
  NatsHandleInjection,
  NatsMiddlewareBeforeAllInjection,
  NatsMiddlewareAfterAllInjection,
  NatsMiddlewareValidationInjection,
  NatsMiddlewareAuthorizationInjection,
  NatsMiddlewareBeforeHandleInjection,
  NatsMiddlewareAfterHandleInjection,
  NatsHandler,
  NatsValidationResult,
  NatsAuthorizationResult,
  NatsHandleResult,
  NatsMiddlewareBeforeAllResult,
  NatsMiddlewareAfterAllResult,
  NatsMiddlewareValidationResult,
  NatsMiddlewareAuthorizationResult,
  NatsMiddlewareBeforeHandleResult,
  NatsMiddlewareAfterHandleResult,
  NatsBeforeAll,
  NatsBeforeValidate,
  NatsAfterValidate,
  NatsBeforeAuthorize,
  NatsAfterAuthorize,
  NatsBeforeHandle,
  NatsAfterHandle,
  NatsAfterAll,
} from './type';

const requestCodec = JSONCodec<NatsRequest>();
const responseCodec = JSONCodec<NatsResponse>();

async function start<
  TInjection extends Partial<
    Pick<NatsInjection, 'logService'> & Record<string, unknown>
  >
>(params: {
  urls: string[];
  handlers: {
    [subject: string]: NatsHandler<
      NatsService<string, unknown, unknown>,
      Record<string, unknown>
    >;
  };
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

  const { urls, handlers = {}, user, pass, verbose } = params;

  if (Object.keys(handlers).length === 0) {
    throw new Error(`Must register handlers before starting client`);
  }

  const client = await connect({
    servers: urls,
    user,
    pass,
    pingInterval: 30 * 1000,
    maxPingOut: 10,
    verbose,
  });

  const natsService = createNatsService({
    client,
    namespace: params.namespace,
  });

  Object.entries(handlers).forEach(([subject, handler]) => {
    const subcription = natsService.subscribe(subject);
    (async () => {
      for await (const message of subcription) {
        let data = message.data ? requestCodec.decode(message.data) : undefined;
        let injection: Record<string, unknown> & NatsInjection;

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
              body: data.body,
            };
          }

          injection = {
            ...params.injections,
            subject,
            message,
            natsService,
            logService: createHandlerLogService({
              subject,
              logService: params.injections?.logService || console,
            }),
          };

          const middlewareActions = await loadMiddlewareActions({
            injection,
            handler,
          });

          //#region Before all
          const beforeAllResult = await beforeAll({
            message,
            data,
            injection,
            middlewareActions: middlewareActions.beforeAll,
            respondError: handler.respondError,
          });
          if (beforeAllResult && beforeAllResult.code !== 'OK') {
            continue;
          } else if (beforeAllResult) {
            data = beforeAllResult.data;
            injection = beforeAllResult.injection;
          }
          //#endregion

          //#region Validate
          const beforeValidateResult = await beforeValidate({
            message,
            data,
            injection,
            middlewareActions: middlewareActions.beforeValidate,
            respondError: handler.respondError,
          });
          if (beforeValidateResult && beforeValidateResult.code !== 'OK') {
            continue;
          } else if (beforeValidateResult) {
            data = beforeValidateResult.data;
            injection = beforeValidateResult.injection;
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
            middlewareActions: middlewareActions.afterValidate,
            respondError: handler.respondError,
          });
          if (afterValidateResult && afterValidateResult.code !== 'OK') {
            continue;
          } else if (afterValidateResult) {
            data = afterValidateResult.data;
            injection = beforeValidateResult.injection;
          }
          //#endregion

          //#region Authorize
          const beforeAuthorizeResult = await beforeAuthorize({
            message,
            data,
            injection,
            middlewareActions: middlewareActions.beforeAuthorize,
            respondError: handler.respondError,
          });
          if (beforeAuthorizeResult && beforeAuthorizeResult.code !== 'OK') {
            continue;
          } else if (beforeAuthorizeResult) {
            data = beforeAuthorizeResult.data;
            injection = beforeAuthorizeResult.injection;
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
            middlewareActions: middlewareActions.afterAuthorize,
            respondError: handler.respondError,
          });
          if (afterAuthorizeResult && afterAuthorizeResult.code !== 'OK') {
            continue;
          } else if (afterAuthorizeResult) {
            data = afterAuthorizeResult.data;
            injection = beforeAuthorizeResult.injection;
          }
          //#endregion

          //#region Handle
          const beforeHandleResult = await beforeHandle({
            message,
            data,
            injection,
            middlewareActions: middlewareActions.beforeHandle,
            respondError: handler.respondError,
          });
          if (beforeHandleResult && beforeHandleResult.code !== 'OK') {
            continue;
          } else if (beforeHandleResult) {
            data = beforeHandleResult.data;
            injection = beforeHandleResult.injection;
          }

          let handleResult = await handle({
            message,
            data,
            injection,
            handler,
          });
          if (handleResult && handleResult.code !== 'OK') {
            continue;
          }

          const afterHandleResult = await afterHandle({
            message,
            data,
            result: handleResult,
            injection,
            middlewareActions: middlewareActions.afterHandle,
            respondError: handler.respondError,
          });
          if (afterHandleResult && afterHandleResult.code !== 'OK') {
            continue;
          } else if (afterHandleResult) {
            data = afterHandleResult.data;
            handleResult = afterHandleResult.result;
            injection = afterHandleResult.injection;
          }
          //#endregion

          //#region After all
          const afterAllResult = await afterAll({
            message,
            data,
            result: handleResult,
            injection,
            middlewareActions: middlewareActions.afterAll,
            respondError: handler.respondError,
          });
          if (afterAllResult && afterAllResult.code !== 'OK') {
            continue;
          } else if (afterAllResult) {
            data = afterAllResult.data;
            handleResult = afterAllResult.result;
            injection = afterAllResult.injection;
          }
          //#endregion

          respond({
            message,
            data: responseCodec.encode({
              ...data,
              headers: handleResult?.headers
                ? {
                    ...data?.headers,
                    ...handleResult?.headers,
                  }
                : data?.headers,
              code: handleResult?.code === 'OK' ? 200 : handleResult?.code,
              body: handleResult?.body,
            }),
          });
        } catch (error) {
          injection?.logService?.error(error);

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

  return natsService;
}

async function stop(natsService: ReturnType<typeof createNatsService>) {
  await natsService?.drain();
}

function register<TInjection extends Record<string, unknown>>(params: {
  natsService: ReturnType<typeof createNatsService>;
  handlers: Array<
    NatsHandler<NatsService<string, unknown, unknown>, TInjection>
  >;
}) {
  const isStarted = !!params.natsService;
  if (isStarted) {
    throw new Error(`Can't register more handler after nats client started`);
  }

  const handlers: {
    [subject: string]: NatsHandler<
      NatsService<string, unknown, unknown>,
      Record<string, unknown>
    >;
  } = {};

  params.handlers.forEach((handler) => {
    const { subject } = handler;
    if (!handlers[subject]) {
      handlers[subject] = handler;
    }
  });

  return handlers;
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
          const natsRequest: NatsRequest<unknown> = {
            headers,
            body: { subject },
          };

          const message = await client.request(
            getNamespaceSubject,
            JSONCodec().encode(natsRequest)
          );
          const natsResponse = JSONCodec<NatsResponse>().decode(message.data);
          const { namespace } = (natsResponse.body ||
            {}) as NatsGetNamespace<any>['response'];

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

function createHandlerLogService(params: {
  subject: string;
  logService: NatsInjection['logService'];
}): NatsInjection['logService'] {
  const { subject, logService } = params;

  return {
    log: (message?: any, ...optionalParams: any[]) =>
      logService.log(subject, message, optionalParams),
    info: (message?: any, ...optionalParams: any[]) =>
      logService.info(subject, message, optionalParams),
    warn: (message?: any, ...optionalParams: any[]) =>
      logService.warn(subject, message, optionalParams),
    error: (message?: any, ...optionalParams: any[]) =>
      logService.error(subject, message, optionalParams),
  };
}

function createMiddlewareLogService(params: {
  middlewareId: string;
  logService: NatsInjection['logService'];
}): NatsInjection['logService'] {
  const { middlewareId, logService } = params;

  return {
    log: (message?: any, ...optionalParams: any[]) =>
      logService.log(middlewareId, message, optionalParams),
    info: (message?: any, ...optionalParams: any[]) =>
      logService.info(middlewareId, message, optionalParams),
    warn: (message?: any, ...optionalParams: any[]) =>
      logService.warn(middlewareId, message, optionalParams),
    error: (message?: any, ...optionalParams: any[]) =>
      logService.error(middlewareId, message, optionalParams),
  };
}

function createValidationInjection<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown>
>(injection: TInjection & NatsInjection) {
  const validationInjection: NatsValidationInjection<TService, TInjection> = {
    ...injection,
    ok: (
      params: Parameters<NatsValidationInjection<TService, TInjection>['ok']>[0]
    ) => {
      const { data } = params;

      return {
        code: 'OK',
        data,
      };
    },
    error: (
      params: Parameters<
        NatsValidationInjection<TService, TInjection>['error']
      >[0]
    ) => {
      const { data, code = 400, errors } = params;

      return {
        code,
        data,
        errors,
      };
    },
  };

  return validationInjection;
}

function createAuthorizationInjection<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown>
>(injection: TInjection & NatsInjection) {
  const authorizationInjection: NatsAuthorizationInjection<
    TService,
    TInjection
  > = {
    ...injection,
    ok: (
      params: Parameters<
        NatsAuthorizationInjection<TService, TInjection>['ok']
      >[0]
    ) => {
      const { data } = params;

      return {
        code: 'OK',
        data,
      };
    },
    error: (
      params: Parameters<
        NatsAuthorizationInjection<TService, TInjection>['error']
      >[0]
    ) => {
      const { data, code = 403, errors } = params;

      return {
        code,
        data,
        errors,
      };
    },
  };

  return authorizationInjection;
}

function createHandleInjection<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown>
>(injection: TInjection & NatsInjection) {
  const handleInjection: NatsHandleInjection<TService, TInjection> = {
    ...injection,
    ok: (
      params: Parameters<NatsHandleInjection<TService, TInjection>['ok']>[0]
    ) => {
      const { data } = params;

      return {
        code: 'OK',
        data,
      };
    },
    error: (
      params: Parameters<NatsHandleInjection<TService, TInjection>['error']>[0]
    ) => {
      const { data, code = 500, errors } = params;

      return {
        code,
        data,
        errors,
      };
    },
  };

  return handleInjection;
}

function createMiddlewareBeforeAllInjection<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown>
>(injection: TInjection & NatsInjection) {
  const beforeAllInjection: NatsMiddlewareBeforeAllInjection<
    TService,
    TInjection
  > = {
    ...injection,
    ok: (
      params: Parameters<
        NatsMiddlewareBeforeAllInjection<TService, TInjection>['ok']
      >[0]
    ) => {
      const { data, injection } = params;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { ok, error, ...rest } = injection;

      return {
        code: 'OK',
        data,
        injection: rest as TInjection & NatsInjection,
      };
    },
    error: (
      params: Parameters<
        NatsMiddlewareBeforeAllInjection<TService, TInjection>['error']
      >[0]
    ) => {
      const { data, injection, code = 400, errors } = params;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { ok, error, ...rest } = injection;

      return {
        code,
        data,
        errors,
        injection: rest as TInjection & NatsInjection,
      };
    },
  };

  return beforeAllInjection;
}

function createMiddlewareAfterAllInjection<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown>
>(injection: TInjection & NatsInjection) {
  const afterAllInjection: NatsMiddlewareAfterAllInjection<
    TService,
    TInjection
  > = {
    ...injection,
    ok: (
      params: Parameters<
        NatsMiddlewareAfterAllInjection<TService, TInjection>['ok']
      >[0]
    ) => {
      const { data, result, injection } = params;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { ok, error, ...rest } = injection;

      return {
        code: 'OK',
        data,
        result,
        injection: rest as TInjection & NatsInjection,
      };
    },
    error: (
      params: Parameters<
        NatsMiddlewareAfterAllInjection<TService, TInjection>['error']
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
        injection: rest as TInjection & NatsInjection,
      };
    },
  };

  return afterAllInjection;
}

function createMiddlewareValidationInjection<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown>
>(injection: TInjection & NatsInjection) {
  const validationInjection: NatsMiddlewareValidationInjection<
    TService,
    TInjection
  > = {
    ...injection,
    ok: (
      params: Parameters<
        NatsMiddlewareValidationInjection<TService, TInjection>['ok']
      >[0]
    ) => {
      const { data, injection } = params;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { ok, error, ...rest } = injection;

      return {
        code: 'OK',
        data,
        injection: rest as TInjection & NatsInjection,
      };
    },
    error: (
      params: Parameters<
        NatsMiddlewareValidationInjection<TService, TInjection>['error']
      >[0]
    ) => {
      const { data, injection, code = 400, errors } = params;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { ok, error, ...rest } = injection;

      return {
        code,
        data,
        errors,
        injection: rest as TInjection & NatsInjection,
      };
    },
  };

  return validationInjection;
}

function createMiddlewareAuthorizationInjection<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown>
>(injection: TInjection & NatsInjection) {
  const authorizationInjection: NatsMiddlewareAuthorizationInjection<
    TService,
    TInjection
  > = {
    ...injection,
    ok: (
      params: Parameters<
        NatsMiddlewareAuthorizationInjection<TService, TInjection>['ok']
      >[0]
    ) => {
      const { data, injection } = params;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { ok, error, ...rest } = injection;

      return {
        code: 'OK',
        data,
        injection: rest as TInjection & NatsInjection,
      };
    },
    error: (
      params: Parameters<
        NatsMiddlewareAuthorizationInjection<TService, TInjection>['error']
      >[0]
    ) => {
      const { data, injection, code = 403, errors } = params;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { ok, error, ...rest } = injection;

      return {
        code,
        data,
        errors,
        injection: rest as TInjection & NatsInjection,
      };
    },
  };

  return authorizationInjection;
}

function createMiddlewareBeforeHandleInjection<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown>
>(injection: TInjection & NatsInjection) {
  const beforeHandleInjection: NatsMiddlewareBeforeHandleInjection<
    TService,
    TInjection
  > = {
    ...injection,
    ok: (
      params: Parameters<
        NatsMiddlewareBeforeHandleInjection<TService, TInjection>['ok']
      >[0]
    ) => {
      const { data, injection } = params;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { ok, error, ...rest } = injection;

      return {
        code: 'OK',
        data,
        injection: rest as TInjection & NatsInjection,
      };
    },
    error: (
      params: Parameters<
        NatsMiddlewareBeforeHandleInjection<TService, TInjection>['error']
      >[0]
    ) => {
      const { data, injection, code = 500, errors } = params;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { ok, error, ...rest } = injection;

      return {
        code,
        data,
        errors,
        injection: rest as TInjection & NatsInjection,
      };
    },
  };

  return beforeHandleInjection;
}

function createMiddlewareAfterHandleInjection<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown>
>(injection: TInjection & NatsInjection) {
  const afterHandleInjection: NatsMiddlewareAfterHandleInjection<
    TService,
    TInjection
  > = {
    ...injection,
    ok: (
      params: Parameters<
        NatsMiddlewareAfterHandleInjection<TService, TInjection>['ok']
      >[0]
    ) => {
      const { data, result, injection } = params;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { ok, error, ...rest } = injection;

      return {
        code: 'OK',
        data,
        result,
        injection: rest as TInjection & NatsInjection,
      };
    },
    error: (
      params: Parameters<
        NatsMiddlewareAfterHandleInjection<TService, TInjection>['error']
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
        injection: rest as TInjection & NatsInjection,
      };
    },
  };

  return afterHandleInjection;
}

async function loadMiddlewareActions<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown>
>(params: {
  injection: TInjection & NatsInjection;
  handler: NatsHandler<TService, TInjection>;
}) {
  const { injection, handler } = params;

  const beforeAll: Array<{
    middlewareId: string;
    handle: NatsBeforeAll<TService, TInjection>;
  }> = [];
  const beforeValidate: Array<{
    middlewareId: string;
    handle: NatsBeforeValidate<TService, TInjection>;
  }> = [];
  const afterValidate: Array<{
    middlewareId: string;
    handle: NatsAfterValidate<TService, TInjection>;
  }> = [];
  const beforeAuthorize: Array<{
    middlewareId: string;
    handle: NatsBeforeAuthorize<TService, TInjection>;
  }> = [];
  const afterAuthorize: Array<{
    middlewareId: string;
    handle: NatsAfterAuthorize<TService, TInjection>;
  }> = [];
  const beforeHandle: Array<{
    middlewareId: string;
    handle: NatsBeforeHandle<TService, TInjection>;
  }> = [];
  const afterHandle: Array<{
    middlewareId: string;
    handle: NatsAfterHandle<TService, TInjection>;
  }> = [];
  const afterAll: Array<{
    middlewareId: string;
    handle: NatsAfterAll<TService, TInjection>;
  }> = [];

  if (handler.middlewares?.length > 0) {
    for (const middleware of handler.middlewares) {
      const middlewareId = middleware.id;
      const actions = await middleware.getActions({
        ...injection,
        logService: createMiddlewareLogService({
          middlewareId: middleware.id,
          logService: injection.logService || console,
        }),
      });

      if (actions.beforeAll) {
        beforeAll.push({ middlewareId, handle: actions.beforeAll });
      }
      if (actions.beforeValidate) {
        beforeValidate.push({ middlewareId, handle: actions.beforeValidate });
      }
      if (actions.afterValidate) {
        afterValidate.push({ middlewareId, handle: actions.afterValidate });
      }
      if (actions.beforeAuthorize) {
        beforeAuthorize.push({ middlewareId, handle: actions.beforeAuthorize });
      }
      if (actions.afterAuthorize) {
        afterAuthorize.push({ middlewareId, handle: actions.afterAuthorize });
      }
      if (actions.beforeHandle) {
        beforeHandle.push({ middlewareId, handle: actions.beforeHandle });
      }
      if (actions.afterHandle) {
        afterHandle.push({ middlewareId, handle: actions.afterHandle });
      }
      if (actions.afterAll) {
        afterAll.push({ middlewareId, handle: actions.afterAll });
      }
    }
  }

  let middlewareActions = {
    beforeAll,
    beforeValidate,
    afterValidate,
    beforeAuthorize,
    afterAuthorize,
    beforeHandle,
    afterHandle,
    afterAll,
  };
  if (handler.sortMiddlewareActions) {
    middlewareActions = handler.sortMiddlewareActions(middlewareActions);
  }

  return middlewareActions;
}

async function beforeAll<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown>
>(params: {
  message: Msg;
  data: NatsRequest<TService['request']>;
  injection: TInjection & NatsInjection;
  middlewareActions: Array<{
    middlewareId: string;
    handle: NatsBeforeAll<TService, TInjection>;
  }>;
  respondError: NatsHandler<TService, TInjection>['respondError'];
}) {
  const { message, data, injection, middlewareActions, respondError } = params;
  const beforeAllInjection = createMiddlewareBeforeAllInjection<
    TService,
    TInjection
  >(injection);
  let beforeAllResult: NatsMiddlewareBeforeAllResult<TService, TInjection>;

  if (middlewareActions.length > 0) {
    for (const middlewareAction of middlewareActions) {
      beforeAllResult = await middlewareAction.handle(
        beforeAllResult ? beforeAllResult.data : data,
        beforeAllInjection
      );

      if (beforeAllResult.code !== 'OK') {
        if (respondError) {
          await respondError(
            beforeAllResult.data,
            {
              code: beforeAllResult.code,
              errors: beforeAllResult.errors,
            },
            injection
          );
        }

        respond({
          message,
          data: responseCodec.encode({
            ...beforeAllResult.data,
            code: beforeAllResult.code,
            body: beforeAllResult.errors,
          }),
        });
        break;
      }
    }
  }

  return beforeAllResult;
}

async function beforeValidate<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown>
>(params: {
  message: Msg;
  data: NatsRequest<TService['request']>;
  injection: TInjection & NatsInjection;
  middlewareActions: Array<{
    middlewareId: string;
    handle: NatsBeforeValidate<TService, TInjection>;
  }>;
  respondError: NatsHandler<TService, TInjection>['respondError'];
}) {
  const { message, data, injection, middlewareActions, respondError } = params;
  const validationInjection = createMiddlewareValidationInjection<
    TService,
    TInjection
  >(injection);
  let validationResult: NatsMiddlewareValidationResult<TService, TInjection>;

  if (middlewareActions.length > 0) {
    for (const middlewareAction of middlewareActions) {
      validationResult = await middlewareAction.handle(
        validationResult ? validationResult.data : data,
        validationInjection
      );

      if (validationResult.code !== 'OK') {
        if (respondError) {
          await respondError(
            validationResult.data,
            {
              code: validationResult.code,
              errors: validationResult.errors,
            },
            injection
          );
        }

        respond({
          message,
          data: responseCodec.encode({
            ...validationResult.data,
            code: validationResult.code,
            body: validationResult.errors,
          }),
        });
        break;
      }
    }
  }

  return validationResult;
}

async function validate<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown>
>(params: {
  message: Msg;
  data: NatsRequest<TService['request']>;
  injection: TInjection & NatsInjection;
  handler: NatsHandler<TService, TInjection>;
}) {
  const { message, data, injection, handler } = params;
  const validationInjection = createValidationInjection<TService, TInjection>(
    injection
  );
  let validationResult: NatsValidationResult;

  if (handler.validate) {
    validationResult = await handler.validate(data, validationInjection);

    if (validationResult.code !== 'OK') {
      if (handler.respondError) {
        await handler.respondError(
          data,
          {
            code: validationResult.code,
            errors: validationResult.errors,
          },
          injection
        );
      }

      respond({
        message,
        data: responseCodec.encode({
          ...data,
          code: validationResult.code as number,
          body: validationResult.errors,
        }),
      });
    }
  }

  return validationResult;
}

async function afterValidate<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown>
>(params: {
  message: Msg;
  data: NatsRequest<TService['request']>;
  injection: TInjection & NatsInjection;
  middlewareActions: Array<{
    middlewareId: string;
    handle: NatsAfterValidate<TService, TInjection>;
  }>;
  respondError: NatsHandler<TService, TInjection>['respondError'];
}) {
  const { message, data, injection, middlewareActions, respondError } = params;
  const validationInjection = createMiddlewareValidationInjection<
    TService,
    TInjection
  >(injection);
  let validationResult: NatsMiddlewareValidationResult<TService, TInjection>;

  if (middlewareActions.length > 0) {
    for (const middlewareAction of middlewareActions) {
      validationResult = await middlewareAction.handle(
        validationResult ? validationResult.data : data,
        validationInjection
      );

      if (validationResult.code !== 'OK') {
        if (respondError) {
          await respondError(
            validationResult.data,
            {
              code: validationResult.code,
              errors: validationResult.errors,
            },
            injection
          );
        }

        respond({
          message,
          data: responseCodec.encode({
            ...validationResult.data,
            code: validationResult.code,
            body: validationResult.errors,
          }),
        });
        break;
      }
    }
  }

  return validationResult;
}

async function beforeAuthorize<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown>
>(params: {
  message: Msg;
  data: NatsRequest<TService['request']>;
  injection: TInjection & NatsInjection;
  middlewareActions: Array<{
    middlewareId: string;
    handle: NatsBeforeAuthorize<TService, TInjection>;
  }>;
  respondError: NatsHandler<TService, TInjection>['respondError'];
}) {
  const { message, data, injection, middlewareActions, respondError } = params;
  const authorizationInjection = createMiddlewareAuthorizationInjection<
    TService,
    TInjection
  >(injection);
  let authorizationResult: NatsMiddlewareAuthorizationResult<
    TService,
    TInjection
  >;

  if (middlewareActions.length > 0) {
    for (const middlewareAction of middlewareActions) {
      authorizationResult = await middlewareAction.handle(
        authorizationResult ? authorizationResult.data : data,
        authorizationInjection
      );

      if (authorizationResult.code !== 'OK') {
        if (respondError) {
          await respondError(
            authorizationResult.data,
            {
              code: authorizationResult.code,
              errors: authorizationResult.errors,
            },
            injection
          );
        }

        respond({
          message,
          data: responseCodec.encode({
            ...authorizationResult.data,
            code: authorizationResult.code,
            body: authorizationResult.errors,
          }),
        });
        break;
      }
    }
  }

  return authorizationResult;
}

async function authorize<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown>
>(params: {
  message: Msg;
  data: NatsRequest<TService['request']>;
  injection: TInjection & NatsInjection;
  handler: NatsHandler<TService, TInjection>;
}) {
  const { message, data, injection, handler } = params;
  const authorizationInjection = createAuthorizationInjection<
    TService,
    TInjection
  >(injection);
  let authorizationResult: NatsAuthorizationResult;

  if (handler.authorize) {
    authorizationResult = await handler.authorize(data, authorizationInjection);

    if (authorizationResult.code !== 'OK') {
      if (handler.respondError) {
        await handler.respondError(
          data,
          {
            code: authorizationResult.code,
            errors: authorizationResult.errors,
          },
          injection
        );
      }

      respond({
        message,
        data: responseCodec.encode({
          ...data,
          code: authorizationResult.code as number,
          body: authorizationResult.errors,
        }),
      });
    }
  }

  return authorizationResult;
}

async function afterAuthorize<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown>
>(params: {
  message: Msg;
  data: NatsRequest<TService['request']>;
  injection: TInjection & NatsInjection;
  middlewareActions: Array<{
    middlewareId: string;
    handle: NatsAfterAuthorize<TService, TInjection>;
  }>;
  respondError: NatsHandler<TService, TInjection>['respondError'];
}) {
  const { message, data, injection, middlewareActions, respondError } = params;
  const authorizationInjection = createMiddlewareAuthorizationInjection<
    TService,
    TInjection
  >(injection);
  let authorizationResult: NatsMiddlewareAuthorizationResult<
    TService,
    TInjection
  >;

  if (middlewareActions.length > 0) {
    for (const middlewareAction of middlewareActions) {
      authorizationResult = await middlewareAction.handle(
        authorizationResult ? authorizationResult.data : data,
        authorizationInjection
      );

      if (authorizationResult.code !== 'OK') {
        if (respondError) {
          await respondError(
            authorizationResult.data,
            {
              code: authorizationResult.code,
              errors: authorizationResult.errors,
            },
            injection
          );
        }

        respond({
          message,
          data: responseCodec.encode({
            ...authorizationResult.data,
            code: authorizationResult.code,
            body: authorizationResult.errors,
          }),
        });
        break;
      }
    }
  }

  return authorizationResult;
}

async function beforeHandle<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown>
>(params: {
  message: Msg;
  data: NatsRequest<TService['request']>;
  injection: TInjection & NatsInjection;
  middlewareActions: Array<{
    middlewareId: string;
    handle: NatsBeforeHandle<TService, TInjection>;
  }>;
  respondError: NatsHandler<TService, TInjection>['respondError'];
}) {
  const { message, data, injection, middlewareActions, respondError } = params;
  const beforeHandleInjection = createMiddlewareBeforeHandleInjection<
    TService,
    TInjection
  >(injection);
  let beforeHandleResult: NatsMiddlewareBeforeHandleResult<
    TService,
    TInjection
  >;

  if (middlewareActions.length > 0) {
    for (const middlewareAction of middlewareActions) {
      beforeHandleResult = await middlewareAction.handle(
        beforeHandleResult ? beforeHandleResult.data : data,
        beforeHandleInjection
      );

      if (beforeHandleResult.code !== 'OK') {
        if (respondError) {
          await respondError(
            beforeHandleResult.data,
            {
              code: beforeHandleResult.code,
              errors: beforeHandleResult.errors,
            },
            injection
          );
        }

        respond({
          message,
          data: responseCodec.encode({
            ...beforeHandleResult.data,
            code: beforeHandleResult.code,
            body: beforeHandleResult.errors,
          }),
        });
        break;
      }
    }
  }

  return beforeHandleResult;
}

async function handle<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown>
>(params: {
  message: Msg;
  data: NatsRequest<TService['request']>;
  injection: TInjection & NatsInjection;
  handler: NatsHandler<TService, TInjection>;
}) {
  const { message, data, injection, handler } = params;
  const handleInjection = createHandleInjection<TService, TInjection>(
    injection
  );
  let handleResult: NatsHandleResult<TService>;

  if (handler.handle) {
    handleResult = await handler.handle(data, handleInjection);

    if (handleResult.code !== 'OK') {
      if (handler.respondError) {
        await handler.respondError(
          data,
          {
            code: handleResult.code,
            errors: handleResult.errors,
          },
          injection
        );
      }

      respond({
        message,
        data: responseCodec.encode({
          ...data,
          code: handleResult.code,
          body: handleResult.errors,
        }),
      });
    }
  }
  return handleResult;
}

async function afterHandle<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown>
>(params: {
  message: Msg;
  data: NatsRequest<TService['request']>;
  result: NatsHandleResult<TService>;
  injection: TInjection & NatsInjection;
  middlewareActions: Array<{
    middlewareId: string;
    handle: NatsAfterHandle<TService, TInjection>;
  }>;
  respondError: NatsHandler<TService, TInjection>['respondError'];
}) {
  const { message, data, result, injection, middlewareActions, respondError } =
    params;
  const handleInjection = createMiddlewareAfterHandleInjection<
    TService,
    TInjection
  >(injection);
  let handleResult: NatsMiddlewareAfterHandleResult<TService, TInjection>;

  if (middlewareActions.length > 0) {
    for (const middlewareAction of middlewareActions) {
      handleResult = await middlewareAction.handle(
        handleResult ? handleResult.data : data,
        handleResult ? handleResult.result : result,
        handleInjection
      );

      if (handleResult.code !== 'OK') {
        if (respondError) {
          await respondError(
            data,
            {
              code: handleResult.code,
              errors: handleResult.errors,
            },
            injection
          );
        }

        respond({
          message,
          data: responseCodec.encode({
            ...handleResult.data,
            code: handleResult.code,
            body: handleResult.errors,
          }),
        });
        break;
      }
    }
  }

  return handleResult;
}

async function afterAll<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown>
>(params: {
  message: Msg;
  data: NatsRequest<TService['request']>;
  result: NatsHandleResult<TService>;
  injection: TInjection & NatsInjection;
  middlewareActions: Array<{
    middlewareId: string;
    handle: NatsAfterAll<TService, TInjection>;
  }>;
  respondError: NatsHandler<TService, TInjection>['respondError'];
}) {
  const { message, data, result, injection, middlewareActions, respondError } =
    params;
  const afterAllInjection = createMiddlewareAfterAllInjection<
    TService,
    TInjection
  >(injection);
  let afterAllResult: NatsMiddlewareAfterAllResult<TService, TInjection>;

  if (middlewareActions.length > 0) {
    for (const middlewareAction of middlewareActions) {
      afterAllResult = await middlewareAction.handle(
        afterAllResult ? afterAllResult.data : data,
        afterAllResult ? afterAllResult.result : result,
        afterAllInjection
      );

      if (afterAllResult.code !== 'OK') {
        if (respondError) {
          await respondError(
            data,
            {
              code: afterAllResult.code,
              errors: afterAllResult.errors,
            },
            injection
          );
        }

        respond({
          message,
          data: responseCodec.encode({
            ...afterAllResult.data,
            code: afterAllResult.code,
            body: afterAllResult.errors,
          }),
        });
        break;
      }
    }
  }

  return afterAllResult;
}

async function respondUnhandledError<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown>
>(params: {
  message: Msg;
  data: NatsRequest<TService['request']>;
  error: Error;
  injection: TInjection & NatsInjection;
  handler: NatsHandler<TService, TInjection>;
}) {
  const { message, data, error, injection, handler } = params;

  if (handler.respondUnhandledError) {
    try {
      await handler.respondUnhandledError(data, error, injection);
    } catch (error) {
      injection?.logService?.error(
        `[${handler.subject}]respondUnhandledError`,
        error
      );
    }
  }

  respond({
    message,
    data: responseCodec.encode({
      ...data,
      body: data?.body,
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
    let natsHandlers: {
      [subject: string]: NatsHandler<
        NatsService<string, unknown, unknown>,
        Record<string, unknown>
      >;
    };
    let natsService: ReturnType<typeof createNatsService>;

    const client = {
      start: async () => {
        natsService = await start({
          urls,
          handlers: natsHandlers,
          injections,
          user,
          pass,
          verbose,
          namespace,
        });
      },
      stop: async () => {
        await stop(natsService);
        natsService = undefined;
        natsHandlers = {};
      },
      register: (
        handlers: Array<
          NatsHandler<NatsService<string, unknown, unknown>, TInjection>
        >
      ) => {
        natsHandlers = register({ natsService, handlers });
      },
    };

    return client;
  },
};
