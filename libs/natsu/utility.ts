import type {
  NatsAuthorizationResult,
  NatsHandleResult,
  NatsValidationResult,
} from './type';

const NatsValidationResultUtil = {
  ok: (): NatsValidationResult => ({ code: 'OK' }),
  error: (errors?: unknown): NatsValidationResult => ({ code: 400, errors }),
  notFound: (errors?: unknown): NatsValidationResult => ({ code: 404, errors }),
};

const NatsAuthorizationResultUtil = {
  ok: (): NatsAuthorizationResult => ({ code: 'OK' }),
  error: (message?: string): NatsAuthorizationResult => ({
    code: 403,
    message,
  }),
};

const NatsHandleResultUtil = {
  ok: <T>(
    body?: T,
    headers?: {
      [key: string]: unknown;
    }
  ): NatsHandleResult<T> => ({ code: 200, headers, body }),
  error: <T>(params: { code: number; errors?: unknown }): NatsHandleResult<T> =>
    params,
};

export {
  NatsValidationResultUtil,
  NatsAuthorizationResultUtil,
  NatsHandleResultUtil,
};
