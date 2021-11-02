import type { Msg } from 'nats';

/** Context type, to be shared across services */
type Context = {};

type RequestContext = Context & {};

type InitialContext = Context & {};

// Middleware

type Ops = {
  type: 'ok';
};

type MidldewareFunc = (ctx: RequestContext, m: Msg) => Promise<Ops>;

type Middleware = (initialContext: InitialContext) => MidldewareFunc;

export type {};
