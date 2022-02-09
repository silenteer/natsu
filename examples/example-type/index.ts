import type {
  NatsService,
  NatsChannel,
  NatsGetNamespace as OriginalNatsGetNamespace,
} from '@silenteer/natsu-type';

export type NatsGetNamespace = OriginalNatsGetNamespace<'api.getNamespace'>;

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

export type NatsErrorFunction = NatsService<
  'api.errorFunction',
  undefined,
  void
>;
