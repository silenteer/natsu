import type { PingService, PongService } from './service.types';

const pingService: PingService = {
  subject: { subject: 'ping', codec: 'string' },
  handle: async (ctx) => {
    setTimeout(async () => {
      ctx.request<PongService>('pong');
    }, 1000);

    return ctx.ok({ msg: 'abc' });
  },
};

const pongService: PongService = {
  subject: 'pong',
  handle: async (ctx) => {
    ctx.log(ctx.data);
    setTimeout(() => {
      ctx.request<PingService>({ subject: 'ping', codec: 'string' });
    }, 1000);
    return ctx.ok();
  },
};

export { pingService, pongService };
