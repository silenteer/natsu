import type { Msg, NatsConnection } from 'nats/lib/nats-base-client/types';

/** Context type, to be shared across services */
export type Context = {
  nc: NatsConnection;
  log: typeof console.log;
  request: ClientRequest;
  publish: ClientPublish;
};

export type RequestContext<Input, Response> = Context & {
  id?: string;
  message: Msg;
  data?: Input;
  handleUnit: ServiceLike;
  ok: (data: Response) => Result<Response, any>;
  notOk: <T>(data?: T) => Result<undefined, T>;
};

export type ResponseContext<T = any> = RequestContext<unknown, unknown> & {
  response?: T;
  error?: any;
};

export type Codec = 'string' | 'json';

export type InitialContext = Context & {
  beforeMiddlewares: MiddlewareOps[];
  afterMiddlewares: Array<MiddlewareOps<ResponseContext>>;
  closeMiddlewares: MiddlewareOps[];
  errorMiddlewares: MiddlewareOps[];
};

export type Req = string | Record<string, any> | void;
export type Ret = string | Record<string, any> | void;

// Middleware
export type OkOps<T> = {
  type: 'ok';
  data?: T;
};

export type NotOkOps<T> = {
  type: 'error';
  errorCode?: string;
  errorMessage?: string;
  data?: T;
};

export type Result<R, E> = [OkOps<R>, undefined] | [undefined, NotOkOps<E>];

type MiddlewareOps<T = {}> = (
  ctx: RequestContext<unknown, unknown> & T
) => Promise<Result<void, void>>;

type MiddlewareStruct<T = {}> = {
  before?: MiddlewareOps<T>;
  after?: MiddlewareOps<ResponseContext & T>;
  error?: MiddlewareOps<T>;
  close?: MiddlewareOps<T>;
};

export type Middleware<T = {}> = (
  initialContext: InitialContext
) => Promise<MiddlewareStruct<T>>;

export type ProtocolConfig =
  | string
  | {
      subject: string;
      queue?: string;
      codec?: Codec;
    };

export type Service<
  S extends ProtocolConfig,
  Input extends Req,
  Return extends Ret,
  Er = any
> = {
  subject: S;
  middlewares?: Middleware[];
  handle: (ctx: RequestContext<Input, Return>) => Promise<Result<Return, Er>>;
  validate?: (ctx: RequestContext<Input, Return>) => Promise<Result<void, Er>>;
  authorize?: (ctx: RequestContext<Input, Return>) => Promise<Result<void, Er>>;
};

export type ServiceLike = Service<ProtocolConfig, any, any>;

export type Handler<T extends Service<any, any, any>> = T['handle'];
export type Validator<T extends Service<any, any, any>> = T['validate'];
export type Authorizor<T extends Service<any, any, any>> = T['authorize'];

export type Channel<S extends ProtocolConfig, Input> = Service<S, Input, void>;
export type ChannelLike = Channel<string, any>;

export type ExtractRequest<Type> = Type extends Service<any, infer X, any>
  ? X
  : never;
export type ExtractResponse<Type> = Type extends Service<any, any, infer X>
  ? X
  : never;

export type ClientRequest = <T extends ServiceLike>(
  subject: T['subject'],
  request?: ExtractRequest<T>
) => Promise<ExtractResponse<T>>;

export type ClientPublish = <T extends ChannelLike>(
  subject: T['subject'],
  request?: ExtractRequest<T>
) => void;
