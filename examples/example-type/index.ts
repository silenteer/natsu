import type { NatsService, NatsChannel } from '@silenteer/natsu-type';

export type NatsGetNamespace = NatsService<
  'api.getNamespace',
  {
    subject: string;
  },
  {
    namespace: string;
  }
>;

export type NatsHelloNamespace = NatsService<
  'api.helloNamespace',
  undefined,
  void
>;

export type NatsHelloNamespaceChannel = NatsChannel<
  'ws.helloNamespace',
  undefined,
  { message: string }
>;

export type NatsGetCareProviders = NatsService<
  'api.getCareProviders',
  { ids: string[] },
  Array<{
    id: string;
    name: string;
  }>
>;
