import type { PingService, PongService } from 'example-type';

const pingService: PingService = {
  subject: 'ping',
  handle: async (ctx) => {
    setTimeout(async () => {
      ctx.request<PongService>('pong');
    }, 1000);

    return ctx.ok();
  },
};

const pongService: PongService = {
  subject: 'pong',
  handle: async (ctx) => {
    ctx.log(ctx.data);
    setTimeout(() => {
      ctx.request<PingService>('ping');
    }, 1000);
    return ctx.ok();
  },
};

export { pingService, pongService };
