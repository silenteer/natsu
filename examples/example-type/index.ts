import type { NatsService } from '@silenteer/natsu-type';

export type NatsGetCareProviders = NatsService<
  'api.v2.mobile.patient.getCareProviders',
  { ids: string[] },
  Array<{
    id: string;
    name: string;
  }>
>;
