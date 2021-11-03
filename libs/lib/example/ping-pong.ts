import { notOk, ok } from '../results';
import type { PingService, PongService } from './service.types';

const pingService: PingService = {
  subject: 'ping',
  handle: async (ctx) => {
    setTimeout(async () => {
      ctx.request<PongService>('pong', { msg: new Date().getTime() + '' });
    }, 1000);

    // pseudo error
    const numb = parseInt(ctx?.data?.msg as string, 10);
    if (numb % 2 === 0) {
      return notOk('Cannot take even number');
    }

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
