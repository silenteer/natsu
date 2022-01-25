import type { Msg, NatsConnection } from 'nats/lib/nats-base-client/types';

import type { Ok, Err, Result } from 'ts-results';

export type RequestHolder = {
  request: <D extends AnyDefinition>(
    subject: ExtractSubject<D>,
    input?: ExtractRequest<D>
  ) => Promise<Result<ExtractResponse<D>, ExtractError<D>>>;
};

export type RequestType = RequestHolder['request'];

export type Context = {
  nc: NatsConnection;
  log: typeof console.log;
} & RequestHolder;

export type RequestContext<Input, Response> = Context & {
  id?: string;
  subject: string;
  message: Msg;
  data?: Input;
  ok: (resp?: Response) => Ok<Response>;
  err: (e: any) => Err<any>;
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

  ok: () => Ok<any>;
  err: (e: any) => Err<any>;
};

export type Req = string | Record<string, any> | void;
export type Ret = string | Record<string, any> | void;

// Middleware

type MiddlewareOps<T = {}> = (
  ctx: RequestContext<unknown, unknown> & T
) => Promise<Result<unknown, any>>;

type MiddlewareStruct<T = {}> = {
  name: string;
  onRequest?: MiddlewareOps<T>;
  onPublish?: MiddlewareOps<T>;
  before?: MiddlewareOps<T>;
  after?: MiddlewareOps<ResponseContext & T>;
  error?: MiddlewareOps<T>;
  close?: MiddlewareOps<T>;
};

export type Middleware<T = {}> = (
  middlewareContext: InitialContext
) => Promise<MiddlewareStruct<T>>;

export type ProtocolConfig =
  | string
  | {
      subject: string;
      queue?: string;
      codec?: Codec;
    };

type MiddlewareUnionType<T> = T extends undefined
  ? {}
  : T extends Array<Middleware<infer U>>
  ? U
  : {};

export type Definition<
  S extends string,
  Input extends Req,
  Return extends Ret,
  Er extends Error = Error
> = {
  (subject: S, input?: Input): Promise<Result<Return, Er>>;
};

export type Implementation<
  T extends Definition<any, any, any, any>,
  Deps extends Array<Middleware<any>> = []
> = {
  subject:
    | ExtractSubject<T>
    | {
        subject: ExtractSubject<T>;
        queue: string;
        protocol: 'string' | 'json';
      };
  middlewares?: Deps;
  test?: MiddlewareUnionType<Deps>;
  handle: (
    ctx: RequestContext<ExtractRequest<T>, ExtractResponse<T>> &
      MiddlewareUnionType<Deps>
  ) => Promise<Result<ExtractResponse<T>, ExtractError<T>>>;
  validate?: (
    ctx: RequestContext<ExtractRequest<T>, ExtractResponse<T>> &
      MiddlewareUnionType<Deps>
  ) => Promise<Result<void, ExtractError<T>>>;
  authorize?: (
    ctx: RequestContext<ExtractRequest<T>, ExtractResponse<T>> &
      MiddlewareUnionType<Deps>
  ) => Promise<Result<void, ExtractError<T>>>;
};

export type ExtractRequest<Type> = Type extends Definition<
  any,
  infer X,
  any,
  any
>
  ? X
  : never;
export type ExtractResponse<Type> = Type extends Definition<
  any,
  any,
  infer X,
  any
>
  ? X
  : never;
export type ExtractError<Type> = Type extends Definition<any, any, any, infer X>
  ? X
  : never;
export type ExtractSubject<Type> = Type extends Definition<
  infer X,
  any,
  any,
  any
>
  ? X extends String
    ? X
    : never
  : never;

export type AnyDefinition = Definition<any, any, any, any>;
export type AnyImplementation = Implementation<
  AnyDefinition,
  Middleware<any>[]
>;
export type UnknownDefinition = Definition<
  any,
  unknown,
  unknown,
  any extends Error ? Error : never
>;

export type ClientRequest<D extends AnyDefinition> = Definition<
  ExtractSubject<D>,
  ExtractRequest<D>,
  ExtractResponse<D>,
  ExtractError<D>
>;
