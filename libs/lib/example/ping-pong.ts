import { ok } from '../results';
import type { PingService, PongService } from './service.types';

const pingService: PingService = {
  subject: 'ping',
  handle: async (ctx) => {
    ctx.log(ctx.data);

    setTimeout(() => {
      ctx.request<PongService>('pong', { msg: new Date().getTime() + '' });
    }, 1000);
    return ok();
  },
};

const pongService: PongService = {
  subject: 'pong',
  handle: async (ctx) => {
    ctx.log(ctx.data);
    setTimeout(() => {
      ctx.request<PingService>('ping', { msg: new Date().getTime() + '' });
    }, 1000);
    return ok();
  },
};

export { pingService, pongService };
