import type { Msg, NatsConnection, PublishOptions, RequestOptions } from 'nats';
import type {
  NatsService,
  NatsRequest,
  NatsResponse,
} from '@silenteer/natsu-type';

type NatsInjection<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown> = Record<string, unknown>
> = {
  subject: string;
  message: Msg;
  handler: Pick<
    NatsHandler<TService, TInjection>,
    'validate' | 'authorize' | 'handle'
  >;
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

type NatsMiddlewareBeforeResult<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown> = Record<string, unknown>
> = {
  code: 'OK' | number;
  data: NatsRequest<TService['request']>;
  injection: TInjection & NatsInjection<TService, TInjection>;
  errors?: unknown;
};

type NatsMiddlewareAfterResult<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown> = Record<string, unknown>
> = {
  code: 'OK' | number;
  data: NatsRequest<TService['request']>;
  injection: TInjection & NatsInjection<TService, TInjection>;
  result: NatsHandleResult<TService>;
  errors?: unknown;
};

type NatsMiddlewareBeforeInjection<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown> = Record<string, unknown>
> = NatsInjection<TService, TInjection> & {
  ok: (params: {
    data: NatsRequest<TService['request']>;
    injection: NatsMiddlewareBeforeInjection<TService, TInjection>;
  }) => NatsMiddlewareBeforeResult<TService, TInjection>;
  error: (params: {
    data: NatsRequest<TService['request']>;
    injection: NatsMiddlewareBeforeInjection<TService, TInjection>;
    code?: number;
    errors: unknown;
  }) => NatsMiddlewareBeforeResult<TService, TInjection>;
};

type NatsMiddlewareAfterInjection<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown> = Record<string, unknown>
> = NatsInjection<TService, TInjection> & {
  ok: (params: {
    data: NatsRequest<TService['request']>;
    result: NatsHandleResult<TService>;
    injection: NatsMiddlewareAfterInjection<TService, TInjection>;
  }) => NatsMiddlewareAfterResult<TService, TInjection>;
  error: (params: {
    data: NatsRequest<TService['request']>;
    result: NatsHandleResult<TService>;
    injection: NatsMiddlewareAfterInjection<TService, TInjection>;
    code?: number;
    errors: unknown;
  }) => NatsMiddlewareAfterResult<TService, TInjection>;
};

type NatsValidationInjection<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown> = Record<string, unknown>
> = TInjection &
  NatsInjection<TService, TInjection> & {
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
  NatsInjection<TService, TInjection> & {
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
  NatsInjection<TService, TInjection> & {
    ok: (
      params: Pick<NatsHandleResult<TService>, 'headers' | 'body'>
    ) => NatsHandleResult<TService>;
    error: (params: {
      data: NatsRequest<TService['request']>;
      code?: number;
      errors: unknown;
    }) => NatsHandleResult<TService>;
  };

type NatsBefore<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown> = Record<string, unknown>
> = (params: {
  data: NatsRequest<TService['request']>;
  injection: NatsMiddlewareBeforeInjection<TService, TInjection>;
}) => Promise<NatsMiddlewareBeforeResult<TService, TInjection>>;

type NatsAfter<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown> = Record<string, unknown>
> = (params: {
  data: NatsRequest<TService['request']>;
  result: NatsHandleResult<TService>;
  injection: NatsMiddlewareAfterInjection<TService, TInjection>;
}) => Promise<NatsMiddlewareAfterResult<TService, TInjection>>;

type NatsValidate<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown> = Record<string, unknown>
> = (
  data: NatsRequest<TService['request']>,
  injection: NatsValidationInjection<TService, TInjection>
) => Promise<NatsValidationResult>;

type NatsAuthorize<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown> = Record<string, unknown>
> = (
  data: NatsRequest<TService['request']>,
  injection: NatsAuthorizationInjection<TService, TInjection>
) => Promise<NatsAuthorizationResult>;

type NatsHandle<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown> = Record<string, unknown>
> = (
  data: NatsRequest<TService['request']>,
  injection: NatsHandleInjection<TService, TInjection>
) => Promise<NatsHandleResult<TService>>;

type NatsMiddleware<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown> = Record<string, unknown>
> = {
  id: string;
  init: (params: { injection: TInjection }) => Promise<{
    before?: NatsBefore<TService, TInjection>;
    after?: NatsAfter<TService, TInjection>;
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
    error: {
      code: number;
      errors?: unknown;
    },
    injection: TInjection & NatsInjection<TService, TInjection>
  ) => Promise<void>;
  respondUnhandledError?: (
    data: NatsRequest<TService['request']>,
    error: Error,
    injection: TInjection & NatsInjection<TService, TInjection>
  ) => Promise<void>;
};

export type {
  NatsInjection,
  NatsValidationInjection,
  NatsAuthorizationInjection,
  NatsHandleInjection,
  NatsMiddlewareBeforeInjection,
  NatsMiddlewareAfterInjection,
  NatsValidationResult,
  NatsAuthorizationResult,
  NatsHandleResult,
  NatsMiddlewareBeforeResult,
  NatsMiddlewareAfterResult,
  NatsBefore,
  NatsAfter,
  NatsValidate,
  NatsAuthorize,
  NatsHandle,
  NatsMiddleware,
  NatsHandler,
};
