import type { Msg, NatsConnection } from 'nats';
import type {
  NatsService,
  NatsRequest,
  NatsResponse,
} from '@silenteer/natsu-type';

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

type NatsValidate<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown> = Record<string, unknown>
> = (
  data: NatsRequest<TService['request']>,
  injection: TInjection & NatsInjection
) => Promise<NatsValidationResult>;

type NatsAuthorize<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown> = Record<string, unknown>
> = (
  data: NatsRequest<TService['request']>,
  injection: TInjection & NatsInjection
) => Promise<NatsAuthorizationResult>;

type NatsHandle<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown> = Record<string, unknown>
> = (
  data: NatsRequest<TService['request']>,
  injection: TInjection & NatsInjection
) => Promise<NatsHandleResult<TService['response']>>;

type NatsHandler<
  TService extends NatsService<string, unknown, unknown>,
  TInjection extends Record<string, unknown> = Record<string, unknown>
> = {
  subject: string;
  validate: NatsValidate<TService, TInjection>;
  authorize: NatsAuthorize<TService, TInjection>;
  handle: NatsHandle<TService, TInjection>;
};

export type {
  NatsService,
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
