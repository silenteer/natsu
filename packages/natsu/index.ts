import type {
  InitialContext,
  RequestContext,
  Middleware,
  ServiceLike,
  ResponseContext,
} from '@natsu/types';

import { Err, Ok } from 'ts-results';
import type { Result } from 'ts-results';
import { tryAwait } from './helpers';

type Unit = ServiceLike;

export type NatsuConfig = {
  units?: Unit[];
  codec: 'string' | 'json';
  middlewares?: Array<Middleware<any>>;
  connectionOpts?: ConnectionOptions;
};

import { createClient } from './client';

async function Natsu(config: NatsuConfig) {
  const defaultLogger = (...data: any) =>
    console.log('[', 'natsu', ']', ...data);
  const startNc = await tryAwait(startNats(config));

  if (!startNc.ok) {
    defaultLogger('Unable to connect to Nats');
    process.exit(1);
  }

  const nc = startNc.val;

  const { publish, request } = createClient(nc, config);
  const initialContext: InitialContext = {
    nc: nc,
    log: defaultLogger,
    beforeMiddlewares: [],
    afterMiddlewares: [],
    closeMiddlewares: [],
    errorMiddlewares: [],
    publish,
    request,
    ok: () => Ok(null),
    err: (e) => Err(e),
  };

  await loadMiddlewares(config, initialContext);

  await loadHandlers(config, initialContext);

  return {
    nc,
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
    const mCtx = { ...ctx };
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
      const rCtx: RequestContext<any, any> = {
        ...ctx,
        subject: m.subject,
        id: new Date().getTime() + '',
        message: m,
        data: m.data && codec.decode(m.data),
        handleUnit: unit,
        log: (...data: any) => ctx.log('[', rCtx.id, ']', '-', ...data),
        ok: (response: any) => Ok(response),
        err: (e: any) => Err(e),
      };
      ctx.log(`Received request to ${m.subject} - ${m.sid}`);

      rCtx.log(`Before process`);
      for (const before of ctx.beforeMiddlewares) {
        await before(rCtx);
      }
      rCtx.log(`Processing the handle`);

      const respond = async (data: Result<unknown, unknown>) => {
        try {
          if (data.ok) {
            const rsCtx: ResponseContext = {
              ...rCtx,
              response: data.val,
            };

            for (const after of ctx.afterMiddlewares) {
              await after(rsCtx);
            }

            if (!rsCtx.response) {
              m.respond(codec.encode(Ok(null)));
            } else {
              m.respond(codec.encode(Ok(rsCtx.response)));
            }
          } else {
            m.respond(codec.encode(data));
          }
        } catch (e) {
          m.respond(codec.encode(Err(data)));
        }
      };

      if (unit.validate) {
        const result = await unit.validate(rCtx);
        if (result.err) {
          respond(result);
          continue;
        }
      }

      if (unit.authorize) {
        const result = await unit.authorize(rCtx);
        if (result.err) {
          respond(result);
          continue;
        }
      }

      if (unit.handle) {
        const result = await unit.handle(rCtx);
        respond(result);
        continue;
      }
    }
  }

  subs.forEach((s) => handle(s).catch((err) => ctx.log(err)));
}
/** End of loading handler */

export {Natsu};
