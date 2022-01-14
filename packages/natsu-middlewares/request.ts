import type { Middleware } from '@natsu/types';

const RequestLogMiddleware: Middleware = async () => {
  return {
    name: 'request-log',
    before: async (ctx) => {
      const m = ctx.message;
      const length = m.data.length;
      ctx.log(`data ${length}`);

      return ctx.ok();
    },
  };
};

export default RequestLogMiddleware;
