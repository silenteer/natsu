import { NatsService } from "@natsu/types";

export type GetCareProvidersRequest = {
  ids: Array<string>;
};

export type GetCareProvidersResponse = Array<{ id: string; name: string }>;

export type GetCareProviders = NatsService<
  "api.v2.mobile.patient.getCareProviders",
  GetCareProvidersRequest,
  GetCareProvidersResponse
>;
