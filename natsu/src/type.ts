import type { Msg, NatsConnection } from 'nats';

type NatsRequest<TBody> = {
  headers: { [key: string]: unknown };
  body?: TBody;
};

type NatsResponse<TBody> = {
  headers: { [key: string]: unknown };
  body?: TBody;
  code: number;
};

type NatsInjection = {
  message: Msg;
  natsService: NatsConnection;
};

type NatsHandleResult<TBody> = {
  code: 200;
  headers?: { [key: string]: unknown };
  body?: TBody;
};

type NatsAuthorizationResult = {
  code: 'OK' | 403;
  message?: string;
};

type NatsValidationResult = {
  code: 'OK' | 400;
  errors?: unknown;
};

type NatsValidate<TBody, TInjection extends Record<string, unknown>> = (
  data: NatsRequest<TBody>,
  injection: TInjection extends Record<string, unknown>
    ? TInjection & NatsInjection
    : NatsInjection
) => Promise<NatsValidationResult>;

type NatsAuthorize<TBody, TInjection extends Record<string, unknown>> = (
  data: NatsRequest<TBody>,
  injection: TInjection extends Record<string, unknown>
    ? TInjection & NatsInjection
    : NatsInjection
) => Promise<NatsAuthorizationResult>;

type NatsHandle<
  TBody,
  TResponse,
  TInjection extends Record<string, unknown>
> = (
  data: NatsRequest<TBody>,
  injection: TInjection extends Record<string, unknown>
    ? TInjection & NatsInjection
    : NatsInjection
) => Promise<NatsHandleResult<TResponse>>;

type NatsHandler<
  TBody,
  TResponse,
  TInjection extends Record<string, unknown>
> = {
  subject: string;
  validate: NatsValidate<TBody, TInjection>;
  authorize: NatsAuthorize<TBody, TInjection>;
  handle: NatsHandle<TBody, TResponse, TInjection>;
};

export type {
  NatsRequest,
  NatsResponse,
  NatsInjection,
  NatsHandleResult,
  NatsAuthorizationResult,
  NatsValidationResult,
  NatsValidate,
  NatsAuthorize,
  NatsHandle,
  NatsHandler,
};
