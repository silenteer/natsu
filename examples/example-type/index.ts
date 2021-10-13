import type { NatsService, NatsChannel } from '@silenteer/natsu-type';

export type NatsGetCareProviders = NatsService<
  'api.v2.mobile.patient.getCareProviders',
  { ids: string[] },
  Array<{
    id: string;
    name: string;
  }>
>;

export type HelloService = NatsService<
  'hello.world',
  { msg: string },
  { msg: string }
>;

export type HelloWorldChannel = NatsChannel<
  'hello.world',
  undefined,
  { msg: string }
>;
