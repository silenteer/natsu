import type { Msg } from 'nats';

type Context = Map<any, any>;

type DefaultContext = Context;
type RequestContext = DefaultContext & {
  m: Msg;
};

type Init = {
  (context: DefaultContext): Promise<void>;
};

type Next = {
  (ctx: DefaultContext): void;
};

type OnMessage = {
  (context: RequestContext, next: Next): Promise<void>;
};

type Get<T> = {
  (context: RequestContext | DefaultContext): Promise<T>;
};

export type ModuleConfig<T> = {
  name: string;
  depends?: Array<ModuleConfig<any>>;
  init?: Init;
  onMessage?: OnMessage;
  get: Get<T>;
};

export type {
  Context,
  DefaultContext,
  RequestContext,
  Init,
  Next,
  OnMessage,
  Get,
};
