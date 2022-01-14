import type {
  InitialContext,
  RequestContext,
  Middleware,
  ServiceLike,
  ResponseContext,
  ResultStruct,
} from '@natsu/types';

import { Ok, Err } from 'pratica';

type Unit = ServiceLike;

export type NatsuConfig = {
  units?: Unit[];
  codec: 'string' | 'json';
  middlewares?: Array<Middleware<any>>;
  connectionOpts?: ConnectionOptions;
};

import { createClient } from './client';

async function Natsu(config: NatsuConfig) {
  const nc = await startNats(config);
  const { publish, request } = createClient(nc, config);
  const initialContext: InitialContext = {
    nc: nc,
    log: (...data: any) => console.log('[', 'natsu', ']', ...data),
    beforeMiddlewares: [],
    afterMiddlewares: [],
    closeMiddlewares: [],
    errorMiddlewares: [],
    publish,
    request,
    ok: (arg?: any) => Ok(arg),
    err: (arg?: any) => Err(arg),
  };

  await loadMiddlewares(config, initialContext);

  await loadHandlers(config, initialContext);

  return {
    close: async () => nc.close(),
    publish,
    request,
  };
}

/** Construct nats */
import type {
  Codec,
  ConnectionOptions,
  NatsConnection,
  Subscription,
} from 'nats';
import { connect } from 'nats';
async function startNats({
  connectionOpts = {},
}: NatsuConfig): Promise<NatsConnection> {
  return await connect(connectionOpts);
}
/** End of constructing nats */

/** Loading middlewares */
async function loadMiddlewares(
  { middlewares = [], units = [] }: NatsuConfig,
  ctx: InitialContext
) {
  const loaded = [];
  for (const m of middlewares) {
    const mCtx= {...ctx};
    const { after, before, error, close, name } = await m(mCtx);
    mCtx.log = (...data: any) => console.log('[', name, ']', ...data);
    loaded.push(m);

    after && ctx.afterMiddlewares.push(after);
    before && ctx.beforeMiddlewares.push(before);
    error && ctx.errorMiddlewares.push(error);
    close && ctx.closeMiddlewares.push(close);
  }
}
/** End of loading middlewares */

/** Load handlers */
async function loadHandlers(
  config: NatsuConfig,
  initialContext: InitialContext
) {
  if (!config.units) return;
  return Promise.allSettled(
    config.units.map((u) => loadHandler(u, config, initialContext))
  );
}

import { getCodec } from './helpers';

async function loadHandler(
  unit: Unit,
  config: NatsuConfig,
  ctx: InitialContext
) {
  const nc = ctx.nc;
  const subject = unit.subject;

  let codec: Codec<any> = getCodec(config.codec);
  let subjects: string[];

  if (typeof subject === 'string') {
    subjects = [subject];
  } else if (Array.isArray(subject)) {
    subjects = subject;
  } else {
    codec = getCodec(subject.codec || config.codec);

    if (Array.isArray(subject.subject)) {
      subjects = subject.subject;
    } else {
      subjects = [subject.subject];
    }
  }

  const subs = subjects.map((s) => nc.subscribe(s));

  async function handle(s: Subscription) {
    const subject = s.getSubject();
    ctx.log(`Listening for ${subject}`);

    for await (const m of s) {
      const rCtx: RequestContext<unknown, unknown> = {
        ...ctx,
        subject: m.subject,
        id: new Date().getTime() + '',
        message: m,
        data: m.data && codec.decode(m.data),
        handleUnit: unit,
        log: (...data: any) => ctx.log('[', rCtx.id, ']', '-', ...data),
        ok: Ok,
        err: Err,
      };
      ctx.log(`Received request to ${m.subject} - ${m.sid}`);

      rCtx.log(`Before process`);
      for (const before of ctx.beforeMiddlewares) {
        await before(rCtx);
      }
      rCtx.log(`Processing the handle`);

      const respond = async (
        data: ResultStruct<unknown, unknown>
      ) => {
        if (data.isOk) {
          const rsCtx: ResponseContext = {
            ...rCtx,
            response: data.data
          };

          rCtx.log(`After process`);
          for (const after of ctx.afterMiddlewares) {
            await after(rsCtx);
          }

          if (!rsCtx.response) m.respond(codec.encode(JSON.stringify({ isOk: true })));
          else {
            m.respond(
              codec.encode(
                JSON.stringify({
                  isOk: true,
                  data: rsCtx.response,
                } as ResultStruct<any, any>)
              )
            );
          }
        }

        else {
          rCtx.log(`Error detected, responding with error`, data);
          m.respond(
            codec.encode(
              JSON.stringify({
                isOk: false,
                error: data,
              } as ResultStruct<any, any>)
            )
          );
        }
      };

      if (unit.validate) {
        const result = await unit.validate(rCtx);
        if (result.isErr()) {
          respond({ isOk: false, error: result.swap().toMaybe().value()});
          continue;
        }
      }

      if (unit.authorize) {
        const result = await unit.authorize(rCtx);
        if (result.isErr()) {
          respond({ isOk: false, error: result.swap().toMaybe().value()});
          continue;
        }
      }

      if (unit.handle) {
        const result = await unit.handle(rCtx);
        if (result.isErr()) {
          respond({ isOk: false, error: result.swap().toMaybe().value()});
          continue;
        } else {
          respond({ isOk: true, data: result.toMaybe().value()});
        }
      }
    }
  }

  subs.forEach((s) => handle(s).catch((err) => ctx.log(err)));
}
/** End of loading handler */

export default Natsu;
