import type { Middleware } from '../types';

import { ok } from '../results';

const RequestLogMiddleware: Middleware = async () => {
  return {
    before: async (ctx) => {
      const m = ctx.message;
      const length = m.data.length;
      ctx.log(`data ${length}`);

      return ok();
    },
  };
};

export default RequestLogMiddleware;
