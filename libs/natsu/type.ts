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
};

type NatsValidationResult = {
  code: 'OK' | 400 | 404;
  errors?: unknown;
};

type NatsAuthorizationResult = {
  code: 'OK' | 403;
  errors?: unknown;
};

type NatsHandleResult<TBody> = {
  code: number;
  headers?: { [key: string]: unknown };
  body?: TBody;
  errors?: unknown;
};

type NatsMiddlewareValidationResult<TRequest = unknown> = {
  code: 'OK' | number;
  data?: NatsRequest<TRequest>;
  errors?: unknown;
};

type NatsMiddlewareAuthorizationResult<TRequest = unknown> = {
  code: 'OK' | number;
  data?: NatsRequest<TRequest>;
  errors?: unknown;
};

type NatsMiddlewareHandleResult<TRequest = unknown, TResponse = unknown> = {
  code: 'OK' | number;
  data?: NatsRequest<TRequest>;
  result?: NatsHandleResult<TResponse>;
  errors?: unknown;
};

type NatsBeforeValidate<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown> = Record<string, unknown>
> = (
  data: NatsRequest<TService['request']>,
  injection: TInjection & NatsInjection
) => Promise<NatsMiddlewareValidationResult>;

type NatsValidate<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown> = Record<string, unknown>
> = (
  data: NatsRequest<TService['request']>,
  injection: TInjection & NatsInjection
) => Promise<NatsValidationResult>;

type NatsAfterValidate<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown> = Record<string, unknown>
> = (
  data: NatsRequest<TService['request']>,
  injection: TInjection & NatsInjection
) => Promise<NatsMiddlewareValidationResult>;

type NatsBeforeAuthorize<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown> = Record<string, unknown>
> = (
  data: NatsRequest<TService['request']>,
  injection: TInjection & NatsInjection
) => Promise<NatsMiddlewareAuthorizationResult>;

type NatsAuthorize<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown> = Record<string, unknown>
> = (
  data: NatsRequest<TService['request']>,
  injection: TInjection & NatsInjection
) => Promise<NatsAuthorizationResult>;

type NatsAfterAuthorize<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown> = Record<string, unknown>
> = (
  data: NatsRequest<TService['request']>,
  injection: TInjection & NatsInjection
) => Promise<NatsMiddlewareAuthorizationResult>;

type NatsBeforeHandle<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown> = Record<string, unknown>
> = (
  data: NatsRequest<TService['request']>,
  injection: TInjection & NatsInjection
) => Promise<NatsMiddlewareHandleResult>;

type NatsHandle<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown> = Record<string, unknown>
> = (
  data: NatsRequest<TService['request']>,
  injection: TInjection & NatsInjection
) => Promise<NatsHandleResult<TService['response']>>;

type NatsAfterHandle<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown> = Record<string, unknown>
> = (
  data: NatsRequest<TService['request']>,
  result: NatsHandleResult<TService['response']>,
  injection: TInjection & NatsInjection
) => Promise<NatsMiddlewareHandleResult>;

type NatsBeforeValidateMiddleware<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown> = Record<string, unknown>
> = {
  id: string;
  handle: NatsBeforeValidate<TService, TInjection>;
};

type NatsAfterValidateMiddleware<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown> = Record<string, unknown>
> = {
  id: string;
  handle: NatsAfterValidate<TService, TInjection>;
};

type NatsBeforeAuthorizeMiddleware<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown> = Record<string, unknown>
> = {
  id: string;
  handle: NatsBeforeAuthorize<TService, TInjection>;
};

type NatsAfterAuthorizeMiddleware<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown> = Record<string, unknown>
> = {
  id: string;
  handle: NatsAfterAuthorize<TService, TInjection>;
};

type NatsBeforeHandleMiddleware<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown> = Record<string, unknown>
> = {
  id: string;
  handle: NatsBeforeHandle<TService, TInjection>;
};

type NatsAfterHandleMiddleware<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown> = Record<string, unknown>
> = {
  id: string;
  handle: NatsAfterHandle<TService, TInjection>;
};

type NatsHandler<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown> = Record<string, unknown>
> = {
  subject: TService['subject'];
  validate: NatsValidate<TService, TInjection>;
  authorize: NatsAuthorize<TService, TInjection>;
  handle: NatsHandle<TService, TInjection>;
  beforeValidateMiddlewares?: Array<
    NatsBeforeValidateMiddleware<TService, TInjection>
  >;
  afterValidateMiddlewares?: Array<
    NatsAfterValidateMiddleware<TService, TInjection>
  >;
  beforeAuthorizeMiddlewares?: Array<
    NatsBeforeAuthorizeMiddleware<TService, TInjection>
  >;
  afterAuthorizeMiddlewares?: Array<
    NatsAfterAuthorizeMiddleware<TService, TInjection>
  >;
  beforeHandleMiddlewares?: Array<
    NatsBeforeHandleMiddleware<TService, TInjection>
  >;
  afterHandleMiddlewares?: Array<
    NatsAfterHandleMiddleware<TService, TInjection>
  >;
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
};

export type {
  NatsService,
  NatsRequest,
  NatsResponse,
  NatsInjection,
  NatsValidationResult,
  NatsAuthorizationResult,
  NatsHandleResult,
  NatsMiddlewareValidationResult,
  NatsMiddlewareAuthorizationResult,
  NatsMiddlewareHandleResult,
  NatsBeforeValidate,
  NatsValidate,
  NatsAfterValidate,
  NatsBeforeAuthorize,
  NatsAuthorize,
  NatsAfterAuthorize,
  NatsBeforeHandle,
  NatsHandle,
  NatsAfterHandle,
  NatsHandler,
  NatsBeforeValidateMiddleware,
  NatsAfterValidateMiddleware,
  NatsBeforeAuthorizeMiddleware,
  NatsAfterAuthorizeMiddleware,
  NatsBeforeHandleMiddleware,
  NatsAfterHandleMiddleware,
};
