export type NatsPortReq<T> = {
  headers: any;
  body: T;
};

export interface NatsInfo {
  subject: string;
  request: unknown;
  response: unknown;
}

export interface IGetCareProviders extends NatsInfo {
  subject: "api.v2.mobile.patient.getCareProviders";
  request: { ids: string[] };
  response: Array<{ id: string; name: string }>;
}
