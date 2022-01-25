import type { PingService, PongService } from 'example-type';
import type { Implementation, Middleware } from '@natsu/types';

const pingService: Implementation<PingService> = {
  subject: 'ping',
  handle: async (ctx) => {
    setTimeout(async () => {
      ctx.request<PongService>('pong');
    }, 1000);

    return ctx.ok();
  },
};

const pongService: Implementation<PongService> = {
  subject: 'pong',
  handle: async (ctx) => {
    setTimeout(() => {
      ctx.request<PingService>('ping');
    }, 1000);
    return ctx.ok();
  }
};

export { pingService, pongService };
