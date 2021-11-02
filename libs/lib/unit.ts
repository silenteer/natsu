import type {
  InitialContext,
  RequestContext,
  Middleware,
  ServiceLike,
} from './types';

type Unit = ServiceLike;

type NatsuConfig = {
  units?: Unit[];
  middlewares?: Array<Middleware<any>>;
  connectionOpts?: ConnectionOptions;
};

async function Natsu(config: NatsuConfig) {
  const nc = await startNats(config);
  const initialContext: InitialContext = {
    nc: nc,
    log: console.log,
    beforeMiddlewares: [],
    afterMiddlewares: [],
    closeMiddlewares: [],
    errorMiddlewares: [],
  };

  await loadMiddlewares(config, initialContext);

  await loadHandlers(config, initialContext);

  return {
    close: async () => nc.close(),
  };
}

/** Construct nats */
import type { ConnectionOptions, NatsConnection, Subscription } from 'nats';
import { connect } from 'nats';
async function startNats({
  connectionOpts = {},
}: NatsuConfig): Promise<NatsConnection> {
  return await connect(connectionOpts);
}
/** End of constructing nats */

/** Loading middlewares */
async function loadMiddlewares(
  { middlewares = [] }: NatsuConfig,
  ctx: InitialContext
) {
  for (const m of middlewares) {
    const { after, before, error, close } = await m(ctx);
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

async function loadHandler(
  unit: Unit,
  config: NatsuConfig,
  ctx: InitialContext
) {
  const nc = ctx.nc;
  const subject = unit.subject;

  // Check type of subject, can be subscription detail as well, only string for now
  // Array to prep for future
  const subs = [nc.subscribe(subject)];

  async function handle(s: Subscription) {
    const subject = s.getSubject();
    ctx.log(-1, `Listening for ${subject}`);

    for await (const m of s) {
      const rCtx: RequestContext = {
        id: m.sid + '',
        message: m,
        handleUnit: unit,
        ...ctx,
        log: (...data) => ctx.log(m.sid, '-', ...data),
      };
      rCtx.log(`Received request to ${m.subject} - ${m.sid}`);

      rCtx.log(`Before process`);
      for (const before of ctx.beforeMiddlewares) {
        await before(rCtx);
      }
      rCtx.log(`Processing the handle`);

      unit.handle && unit.handle(rCtx, rCtx.data);

      rCtx.log(`After process`);
      for (const after of ctx.afterMiddlewares) {
        await after(rCtx);
      }
    }
  }

  subs.forEach((s) => handle(s).catch((err) => ctx.log(err)));
}
/** End of loading handler */

import Service from './example/service';
import RequestLog from './middlewares/request';
import ProcessTime from './middlewares/processTime';

async function main() {
  Natsu({
    middlewares: [RequestLog, ProcessTime],
    units: [Service],
  });
}

main();
