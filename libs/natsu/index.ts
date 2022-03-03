import NatsClient from './nats-client';

export type {
  NatsInjection,
  NatsValidationInjection,
  NatsAuthorizationInjection,
  NatsHandleInjection,
  NatsMiddlewareBeforeInjection,
  NatsMiddlewareAfterInjection,
  NatsValidationResult,
  NatsAuthorizationResult,
  NatsHandleResult,
  NatsMiddlewareBeforeResult,
  NatsMiddlewareAfterResult,
  NatsBefore,
  NatsAfter,
  NatsValidate,
  NatsAuthorize,
  NatsHandle,
  NatsMiddleware,
  NatsHandler,
} from './type';

export default NatsClient;
