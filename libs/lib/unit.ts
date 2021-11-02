import type {
  InitialContext,
  RequestContext,
  Middleware,
  ServiceLike,
  ResponseContext,
} from './types';

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
    log: console.log,
    beforeMiddlewares: [],
    afterMiddlewares: [],
    closeMiddlewares: [],
    errorMiddlewares: [],
    publish,
    request,
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
  { middlewares = [], units = [] }: NatsuConfig,
  ctx: InitialContext
) {
  const loaded = [];
  for (const m of middlewares) {
    const { after, before, error, close } = await m(ctx);
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
  const codec = getCodec(config.codec);

  // Check type of subject, can be subscription detail as well, only string for now
  // Array to prep for future
  const subs = [nc.subscribe(subject)];

  async function handle(s: Subscription) {
    const subject = s.getSubject();
    ctx.log(-1, `Listening for ${subject}`);

    for await (const m of s) {
      const rCtx: RequestContext = {
        id: new Date().getTime() + '',
        message: m,
        data: codec.decode(m.data),
        handleUnit: unit,
        ...ctx,
        log: (...data: any) => ctx.log(rCtx.id, '-', ...data),
      };
      rCtx.log(`Received request to ${m.subject} - ${m.sid}`);

      rCtx.log(`Before process`);
      for (const before of ctx.beforeMiddlewares) {
        await before(rCtx);
      }
      rCtx.log(`Processing the handle`);

      if (unit.handle) {
        const [result, error] = await unit.handle(rCtx);

        const rsCtx: ResponseContext = {
          ...rCtx,
          response: result,
          error: error,
        };

        rCtx.log(`After process`);
        for (const after of ctx.afterMiddlewares) {
          await after(rsCtx);
        }

        if (rsCtx.data) {
          m.respond(codec.encode(JSON.stringify(rsCtx.data)));
        }
      }
    }
  }

  subs.forEach((s) => handle(s).catch((err) => ctx.log(err)));
}
/** End of loading handler */

import { pingService, pongService } from './example/ping-pong';
import RequestLog from './middlewares/request';
import ProcessTime from './middlewares/processTime';
import type { PingService } from './example/service.types';
async function main() {
  const { request } = await Natsu({
    codec: 'json',
    middlewares: [RequestLog, ProcessTime],
    units: [pingService, pongService],
  });

  request<PingService>('ping', { msg: new Date().getUTCMilliseconds() + '' });
}

main();
