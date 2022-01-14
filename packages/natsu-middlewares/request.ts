import type { Middleware } from '@natsu/types';

const RequestLogMiddleware: Middleware = async (middlewareContext) => {
  return {
    name: 'request-log',
    before: async (ctx) => {
      const m = ctx.message;
      const length = m.data.length;
      middlewareContext.log(`data ${length}`);

      return ctx.ok();
    },
  };
};

export default RequestLogMiddleware;
