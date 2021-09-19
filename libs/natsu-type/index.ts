export type NatsService<TSubject extends string, TRequest, TResponse> = {
  subject: TSubject;
  request: TRequest;
  response: TResponse;
};

export type NatsRequest<TBody = unknown> = {
  headers: { [key: string]: unknown };
  body?: TBody;
};

export type NatsResponse<TBody = unknown> = {
  headers: { [key: string]: unknown };
  body?: TBody;
  code: number;
};

export type NatsPortRequest<TBody = unknown> = {
  data?: TBody;
};

export type NatsPortResponse<TBody = unknown> = {
  code: 200;
  body?: TBody;
};

export type NatsPortErrorResponse = {
  code: 400 | 401 | 403 | 404 | 500;
  body?: unknown;
};
