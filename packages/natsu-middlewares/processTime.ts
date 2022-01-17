import type { Middleware } from '@natsu/types';

const ProcessTime: Middleware<{ startTime: number }> = async (middlewareContext) => {
  return  {
    name: 'process-time',
    before: async (ctx) => {
      const startTime = new Date().getUTCMilliseconds();
      ctx.startTime = startTime;
      return ctx.ok(null);
    },

    after: async (ctx) => {
      const endTime = new Date().getUTCMilliseconds();
      const startTime = ctx.startTime;

      middlewareContext.log(ctx.id, `${ctx.error ? 'ko' : 'ok'} processTime: ${endTime - startTime}`);
      return ctx.ok(null);
    },
  };
};

export default ProcessTime;
