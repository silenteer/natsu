export type NatsService<TSubject extends string, TRequest, TResponse> = {
  subject: TSubject;
  request: TRequest;
  response: TResponse;
};

export type NatsChannel<
  TSubject extends string,
  TResponse extends object
> = NatsService<TSubject, never, TResponse>;

// export type NatsPublisher<C extends NatsChannel<any, any> = NatsService<C['subject'], C['response'], never>;

export type NatsRequest<TBody = unknown> = {
  headers: { [key: string]: unknown };
  body?: TBody;
};

export type NatsResponse = {
  headers: { [key: string]: unknown };
  body?: string;
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

export type NatsPortWSRequest<TSubject = string, TBody = unknown> = {
  subject: TSubject;
  action: 'subscribe' | 'unsubscribe';
  data?: TBody;
};

export type NatsPortWSResponse<TSubject = string, TBody = unknown> = {
  subject: TSubject;
  code: 200;
  body?: TBody;
};

export type NatsPortWSErrorResponse<TSubject = string> = {
  subject: TSubject;
  code: 400 | 401 | 403 | 404 | 500;
  body?: unknown;
};
