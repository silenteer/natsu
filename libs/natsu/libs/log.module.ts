import type { ModuleConfig } from './module';

export type LogService = (msg: any) => void;

const logger: LogService = (msg) => {
  console.log(msg);
};

const logModule: ModuleConfig<LogService> = {
  name: 'log module',
  init: async (ctx) => {
    ctx.set(logger, logger);
  },
  get: async (ctx) => {
    return ctx.get(logger);
  },
};

export default logModule;
