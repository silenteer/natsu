import type {
  NatsAuthorizationResult,
  NatsHandleResult,
  NatsValidationResult,
  NatsMiddlewareAuthorizationResult,
  NatsMiddlewareHandleResult,
  NatsMiddlewareValidationResult,
  NatsRequest,
} from './type';

const NatsValidationResultUtil = {
  ok: (): NatsValidationResult => ({ code: 'OK' }),
  error: (errors?: unknown): NatsValidationResult => ({ code: 400, errors }),
  notFound: (errors?: unknown): NatsValidationResult => ({ code: 404, errors }),
};

const NatsAuthorizationResultUtil = {
  ok: (): NatsAuthorizationResult => ({ code: 'OK' }),
  error: (errors?: unknown): NatsAuthorizationResult => ({
    code: 403,
    errors,
  }),
};

const NatsHandleResultUtil = {
  ok: <T>(
    body?: T,
    headers?: {
      [key: string]: unknown;
    }
  ): NatsHandleResult<T> => ({ code: 200, headers, body }),
  error: <T>(params?: {
    code: number;
    errors?: unknown;
  }): NatsHandleResult<T> => {
    const { code = 500, errors } = params || {};
    return {
      code,
      errors,
    };
  },
};

const NatsMiddlewareValidationResultUtil = {
  ok: <TRequest>(
    data: NatsRequest<TRequest>
  ): NatsMiddlewareValidationResult => ({ code: 'OK', data }),
  error: (params?: {
    code: number;
    errors: unknown;
  }): NatsMiddlewareValidationResult => {
    const { code = 400, errors } = params || {};
    return {
      code,
      errors,
    };
  },
};

const NatsMiddlewareAuthorizationResultUtil = {
  ok: <TRequest>(
    data: NatsRequest<TRequest>
  ): NatsMiddlewareAuthorizationResult => ({ code: 'OK', data }),
  error: (params?: {
    code: number;
    errors: unknown;
  }): NatsMiddlewareAuthorizationResult => {
    const { code = 403, errors } = params || {};
    return {
      code,
      errors,
    };
  },
};

const NatsMiddlewareHandleResultUtil = {
  ok: <TRequest, TResponse>(params: {
    data: NatsRequest<TRequest>;
    result?: NatsHandleResult<TResponse>;
  }): NatsMiddlewareHandleResult<TRequest, TResponse> => {
    const { data, result } = params || {};
    return {
      code: 'OK',
      data,
      result,
    };
  },
  error: (params?: {
    code: number;
    errors?: unknown;
  }): NatsMiddlewareHandleResult => {
    const { code = 500, errors } = params || {};
    return {
      code,
      errors,
    };
  },
};

export {
  NatsValidationResultUtil,
  NatsAuthorizationResultUtil,
  NatsHandleResultUtil,
  NatsMiddlewareValidationResultUtil,
  NatsMiddlewareAuthorizationResultUtil,
  NatsMiddlewareHandleResultUtil,
};
