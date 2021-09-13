export type NatsPortReq<T> = {
  headers: any;
  body: T;
};

export type NatsService<Subject extends string, Req, Res> = {
  subject: Subject;
  request: Req;
  response: Res;
};

export type NatsResponse<T = unknown> = {
  code: 200;
  body?: T;
};

export type ErrorResponse = {
  code: 400 | 401 | 403 | 500;
  messsage?: string;
  body?: unknown;
};

// Shared types, will move later
export type GetCareProvidersRequest = {
  ids: string[];
};

export type GetCareProvidersResponse = Array<{ id: string; name: string }>;

export type GetCareProviders = NatsService<
  "api.v2.mobile.patient.getCareProviders",
  GetCareProvidersRequest,
  GetCareProvidersResponse
>;
