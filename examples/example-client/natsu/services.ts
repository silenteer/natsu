import type {
  NatsGetCareProviders,
  NatsGetNamespace,
  NatsHelloNamespace,
  NatsHelloNamespaceChannel,
} from 'example-type';

export type Services =
  | NatsGetCareProviders
  | NatsGetNamespace
  | NatsHelloNamespace;
export type Channels = NatsHelloNamespaceChannel;
