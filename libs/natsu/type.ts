import type { Msg, NatsConnection, PublishOptions, RequestOptions } from 'nats';
import type {
  NatsService,
  NatsRequest,
  NatsResponse,
} from '@silenteer/natsu-type';

type NatsInjection = {
  subject: string;
  message: Msg;
  natsService: {
    request: (
      subject: string,
      data?: NatsRequest,
      opts?: RequestOptions
    ) => Promise<Msg>;
    publish: (
      subject: string,
      data?: NatsResponse,
      opts?: PublishOptions
    ) => Promise<void>;
    subscribe: NatsConnection['subscribe'];
    drain: NatsConnection['drain'];
  };
  logService: {
    log: (message?: any, ...optionalParams: any[]) => void;
    info: (message?: any, ...optionalParams: any[]) => void;
    warn: (message?: any, ...optionalParams: any[]) => void;
    error: (message?: any, ...optionalParams: any[]) => void;
  };
};

type NatsValidationResult = {
  code: 'OK' | number;
  errors?: unknown;
};

type NatsAuthorizationResult = {
  code: 'OK' | number;
  errors?: unknown;
};

type NatsHandleResult<TService extends NatsService<string, unknown, unknown>> =
  {
    code: 'OK' | number;
    headers?: { [key: string]: unknown };
    body?: TService['response'];
    errors?: unknown;
  };

type NatsMiddlewareBeforeAllResult<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown> = Record<string, unknown>
> = {
  code: 'OK' | number;
  data: NatsRequest<TService['request']>;
  injection: TInjection & NatsInjection;
  errors?: unknown;
};

type NatsMiddlewareAfterAllResult<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown> = Record<string, unknown>
> = {
  code: 'OK' | number;
  data: NatsRequest<TService['request']>;
  injection: TInjection & NatsInjection;
  result: NatsHandleResult<TService>;
  errors?: unknown;
};

type NatsMiddlewareValidationResult<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown> = Record<string, unknown>
> = {
  code: 'OK' | number;
  data: NatsRequest<TService['request']>;
  injection: TInjection & NatsInjection;
  errors?: unknown;
};

type NatsMiddlewareAuthorizationResult<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown> = Record<string, unknown>
> = {
  code: 'OK' | number;
  data: NatsRequest<TService['request']>;
  injection: TInjection & NatsInjection;
  errors?: unknown;
};

type NatsMiddlewareBeforeHandleResult<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown> = Record<string, unknown>
> = {
  code: 'OK' | number;
  data: NatsRequest<TService['request']>;
  injection: TInjection & NatsInjection;
  errors?: unknown;
};

type NatsMiddlewareAfterHandleResult<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown> = Record<string, unknown>
> = {
  code: 'OK' | number;
  data: NatsRequest<TService['request']>;
  injection: TInjection & NatsInjection;
  result: NatsHandleResult<TService>;
  errors?: unknown;
};

type NatsValidationInjection<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown> = Record<string, unknown>
> = TInjection &
  NatsInjection & {
    ok: (params: {
      data: NatsRequest<TService['request']>;
    }) => NatsValidationResult;
    error: (params: {
      data: NatsRequest<TService['request']>;
      code?: number;
      errors: unknown;
    }) => NatsValidationResult;
  };

type NatsAuthorizationInjection<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown> = Record<string, unknown>
> = TInjection &
  NatsInjection & {
    ok: (params: {
      data: NatsRequest<TService['request']>;
    }) => NatsAuthorizationResult;
    error: (params: {
      data: NatsRequest<TService['request']>;
      code?: number;
      errors: unknown;
    }) => NatsAuthorizationResult;
  };

type NatsHandleInjection<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown> = Record<string, unknown>
> = TInjection &
  NatsInjection & {
    ok: (params: {
      data: NatsRequest<TService['request']>;
    }) => NatsHandleResult<TService>;
    error: (params: {
      data: NatsRequest<TService['request']>;
      code?: number;
      errors: unknown;
    }) => NatsHandleResult<TService>;
  };

type NatsMiddlewareBeforeAllInjection<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown> = Record<string, unknown>
> = NatsInjection & {
  ok: (params: {
    data: NatsRequest<TService['request']>;
    injection: NatsMiddlewareBeforeAllInjection<TService, TInjection>;
  }) => NatsMiddlewareBeforeAllResult<TService, TInjection>;
  error: (params: {
    data: NatsRequest<TService['request']>;
    injection: NatsMiddlewareBeforeAllInjection<TService, TInjection>;
    code?: number;
    errors: unknown;
  }) => NatsMiddlewareBeforeAllResult<TService, TInjection>;
};

type NatsMiddlewareAfterAllInjection<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown> = Record<string, unknown>
> = NatsInjection & {
  ok: (params: {
    data: NatsRequest<TService['request']>;
    result: NatsHandleResult<TService>;
    injection: NatsMiddlewareAfterAllInjection<TService, TInjection>;
  }) => NatsMiddlewareAfterAllResult<TService, TInjection>;
  error: (params: {
    data: NatsRequest<TService['request']>;
    result: NatsHandleResult<TService>;
    injection: NatsMiddlewareAfterAllInjection<TService, TInjection>;
    code?: number;
    errors: unknown;
  }) => NatsMiddlewareAfterAllResult<TService, TInjection>;
};

type NatsMiddlewareValidationInjection<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown> = Record<string, unknown>
> = NatsInjection & {
  ok: (params: {
    data: NatsRequest<TService['request']>;
    injection: NatsMiddlewareValidationInjection<TService, TInjection>;
  }) => NatsMiddlewareValidationResult<TService, TInjection>;
  error: (params: {
    data: NatsRequest<TService['request']>;
    injection: NatsMiddlewareValidationInjection<TService, TInjection>;
    code?: number;
    errors: unknown;
  }) => NatsMiddlewareValidationResult<TService, TInjection>;
};

type NatsMiddlewareAuthorizationInjection<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown> = Record<string, unknown>
> = NatsInjection & {
  ok: (params: {
    data: NatsRequest<TService['request']>;
    injection: NatsMiddlewareAuthorizationInjection<TService, TInjection>;
  }) => NatsMiddlewareAuthorizationResult<TService, TInjection>;
  error: (params: {
    data: NatsRequest<TService['request']>;
    injection: NatsMiddlewareAuthorizationInjection<TService, TInjection>;
    code?: number;
    errors: unknown;
  }) => NatsMiddlewareAuthorizationResult<TService, TInjection>;
};

type NatsMiddlewareBeforeHandleInjection<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown> = Record<string, unknown>
> = NatsInjection & {
  ok: (params: {
    data: NatsRequest<TService['request']>;
    injection: NatsMiddlewareBeforeHandleInjection<TService, TInjection>;
  }) => NatsMiddlewareBeforeHandleResult<TService, TInjection>;
  error: (params: {
    data: NatsRequest<TService['request']>;
    injection: NatsMiddlewareBeforeHandleInjection<TService, TInjection>;
    code?: number;
    errors: unknown;
  }) => NatsMiddlewareBeforeHandleResult<TService, TInjection>;
};

type NatsMiddlewareAfterHandleInjection<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown> = Record<string, unknown>
> = NatsInjection & {
  ok: (params: {
    data: NatsRequest<TService['request']>;
    result: NatsHandleResult<TService>;
    injection: NatsMiddlewareAfterHandleInjection<TService, TInjection>;
  }) => NatsMiddlewareAfterHandleResult<TService, TInjection>;
  error: (params: {
    data: NatsRequest<TService['request']>;
    result: NatsHandleResult<TService>;
    injection: NatsMiddlewareAfterHandleInjection<TService, TInjection>;
    code?: number;
    errors: unknown;
  }) => NatsMiddlewareAfterHandleResult<TService, TInjection>;
};

type NatsBeforeAll<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown> = Record<string, unknown>
> = (
  data: NatsRequest<TService['request']>,
  injection: NatsMiddlewareBeforeAllInjection<TService, TInjection>
) => Promise<NatsMiddlewareBeforeAllResult<TService, TInjection>>;

type NatsAfterAll<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown> = Record<string, unknown>
> = (
  data: NatsRequest<TService['request']>,
  result: NatsHandleResult<TService>,
  injection: NatsMiddlewareAfterAllInjection<TService, TInjection>
) => Promise<NatsMiddlewareAfterAllResult<TService, TInjection>>;

type NatsBeforeValidate<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown> = Record<string, unknown>
> = (
  data: NatsRequest<TService['request']>,
  injection: NatsMiddlewareValidationInjection<TService, TInjection>
) => Promise<NatsMiddlewareValidationResult<TService, TInjection>>;

type NatsValidate<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown> = Record<string, unknown>
> = (
  data: NatsRequest<TService['request']>,
  injection: NatsValidationInjection<TService, TInjection>
) => Promise<NatsValidationResult>;

type NatsAfterValidate<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown> = Record<string, unknown>
> = (
  data: NatsRequest<TService['request']>,
  injection: NatsMiddlewareValidationInjection<TService, TInjection>
) => Promise<NatsMiddlewareValidationResult<TService, TInjection>>;

type NatsBeforeAuthorize<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown> = Record<string, unknown>
> = (
  data: NatsRequest<TService['request']>,
  injection: NatsMiddlewareAuthorizationInjection<TService, TInjection>
) => Promise<NatsMiddlewareAuthorizationResult<TService, TInjection>>;

type NatsAuthorize<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown> = Record<string, unknown>
> = (
  data: NatsRequest<TService['request']>,
  injection: NatsAuthorizationInjection<TService, TInjection>
) => Promise<NatsAuthorizationResult>;

type NatsAfterAuthorize<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown> = Record<string, unknown>
> = (
  data: NatsRequest<TService['request']>,
  injection: NatsMiddlewareAuthorizationInjection<TService, TInjection>
) => Promise<NatsMiddlewareAuthorizationResult<TService, TInjection>>;

type NatsBeforeHandle<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown> = Record<string, unknown>
> = (
  data: NatsRequest<TService['request']>,
  injection: NatsMiddlewareBeforeHandleInjection<TService, TInjection>
) => Promise<NatsMiddlewareBeforeHandleResult<TService, TInjection>>;

type NatsHandle<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown> = Record<string, unknown>
> = (
  data: NatsRequest<TService['request']>,
  injection: NatsHandleInjection<TService, TInjection>
) => Promise<NatsHandleResult<TService>>;

type NatsAfterHandle<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown> = Record<string, unknown>
> = (
  data: NatsRequest<TService['request']>,
  result: NatsHandleResult<TService>,
  injection: NatsMiddlewareAfterHandleInjection<TService, TInjection>
) => Promise<NatsMiddlewareAfterHandleResult<TService, TInjection>>;

type NatsMiddleware<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown> = Record<string, unknown>
> = {
  id: string;
  getActions: (injection: TInjection & NatsInjection) => Promise<{
    beforeAll?: NatsBeforeAll<TService, TInjection>;
    beforeValidate?: NatsBeforeValidate<TService, TInjection>;
    afterValidate?: NatsAfterValidate<TService, TInjection>;
    beforeAuthorize?: NatsBeforeAuthorize<TService, TInjection>;
    afterAuthorize?: NatsAfterAuthorize<TService, TInjection>;
    beforeHandle?: NatsBeforeHandle<TService, TInjection>;
    afterHandle?: NatsAfterHandle<TService, TInjection>;
    afterAll?: NatsAfterAll<TService, TInjection>;
  }>;
};

type NatsHandler<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown> = Record<string, unknown>
> = {
  subject: TService['subject'];
  validate: NatsValidate<TService, TInjection>;
  authorize: NatsAuthorize<TService, TInjection>;
  handle: NatsHandle<TService, TInjection>;
  middlewares?: Array<NatsMiddleware<TService, TInjection>>;
  respondError?: (
    data: NatsRequest<TService['request']>,
    error: { code: number; errors?: unknown },
    injection: TInjection & NatsInjection
  ) => Promise<void>;
  respondUnhandledError?: (
    data: NatsRequest<TService['request']>,
    error: Error,
    injection: TInjection & NatsInjection
  ) => Promise<void>;
  sortMiddlewareActions?: (params: {}) => {
    beforeAll: Array<{
      middlewareId: string;
      handle: NatsBeforeAll<TService, TInjection>;
    }>;
    beforeValidate: Array<{
      middlewareId: string;
      handle: NatsBeforeValidate<TService, TInjection>;
    }>;
    afterValidate: Array<{
      middlewareId: string;
      handle: NatsAfterValidate<TService, TInjection>;
    }>;
    beforeAuthorize: Array<{
      middlewareId: string;
      handle: NatsBeforeAuthorize<TService, TInjection>;
    }>;
    afterAuthorize: Array<{
      middlewareId: string;
      handle: NatsAfterAuthorize<TService, TInjection>;
    }>;
    beforeHandle: Array<{
      middlewareId: string;
      handle: NatsBeforeHandle<TService, TInjection>;
    }>;
    afterHandle: Array<{
      middlewareId: string;
      handle: NatsAfterHandle<TService, TInjection>;
    }>;
    afterAll: Array<{
      middlewareId: string;
      handle: NatsAfterAll<TService, TInjection>;
    }>;
  };
};

export type {
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
  NatsAfterAll,
  NatsBeforeValidate,
  NatsValidate,
  NatsAfterValidate,
  NatsBeforeAuthorize,
  NatsAuthorize,
  NatsAfterAuthorize,
  NatsBeforeHandle,
  NatsHandle,
  NatsAfterHandle,
  NatsMiddleware,
  NatsHandler,
};
