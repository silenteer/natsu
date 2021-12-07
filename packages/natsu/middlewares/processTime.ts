import type { Middleware } from '../../natsu-types';
import { PongService } from '../example/service.types';

import { ok } from '../results';

const ProcessTime: Middleware<{ startTime: number }> = async () => {
  return {
    before: async (ctx) => {
      const startTime = new Date().getUTCMilliseconds();
      ctx.startTime = startTime;
      return ok();
    },

    after: async (ctx) => {
      const endTime = new Date().getUTCMilliseconds();
      const startTime = ctx.startTime;

      ctx.log(`${ctx.error ? 'ko' : 'ok'} processTime: ${endTime - startTime}`);
      return ok();
    },
  };
};

export default ProcessTime;
