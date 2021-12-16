import type { Msg, NatsConnection, PublishOptions, RequestOptions } from 'nats';
import type {
  NatsService,
  NatsRequest,
  NatsResponse,
} from '@silenteer/natsu-type';

type NatsInjection = {
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

type NatsHandleResult<TBody> = {
  code: number;
  headers?: { [key: string]: unknown };
  body?: TBody;
  errors?: unknown;
};

type NatsAuthorizationResult = {
  code: 'OK' | 403;
  message?: string;
};

type NatsValidationResult = {
  code: 'OK' | 400 | 404;
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
  subject: TService['subject'];
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
