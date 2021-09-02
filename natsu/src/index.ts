import type { Msg, MsgHdrs } from "nats";
import forever from "async/forever";

export type Config = {
  subject: string;
  selfHandling?: boolean;
};

export type GetConfig = () => Promise<Config>;

export type NatsHandler<Input, Output = void> = {
  (input: Input, headers: MsgHdrs, msg: Msg): Promise<Output>;
};

type NatsuModule = {
  natsHandler?: NatsHandler<any>;
  getConfig?: GetConfig;
};

let resolve, reject;
const shutdownHook = new Promise((_resolve, _reject) => {
  resolve = _resolve;
  reject = _reject;
});

export const natsu = () => {
  const registration: {
    [key: string]: [Config, NatsHandler<any>];
  } = {};

  const registry: (() => Promise<void>)[] = [];

  // Check for module service here
  const prepare = () => {};

  const register = async (x: Promise<NatsuModule | any>) => {
    const mod = (await x) as NatsuModule;

    if (!mod.natsHandler || !isFunc(mod.natsHandler)) {
      console.error("export default is expected to be a function");
      process.exit(1001);
    }

    if (!mod.getConfig && !isFunc(mod.getConfig)) {
      console.error("getConfig is expected to be a function");
      process.exit(1002);
    }

    const config = await mod.getConfig();
    console.log("Registering nats subject", config.subject);
    registration[config.subject] = [config, mod.natsHandler];
  };

  const start = async (callback: Function = noOp) => {
    // await Promise.allSettled(registry).then(() => {});
    callback();
    keepProcessAlive();
    setupCleanup();
  };

  const stop = async () => {
    resolve();
  };

  return {
    prepare,
    register,
    start,
    stop,
  };
};

const isFunc = (object: any) => {
  return object instanceof Function;
};

const keepProcessAlive = () => {
  process.stdin.resume();
};

const noOp = () => {};

function setupCleanup(callback: Function = noOp) {
  // attach user callback to the process event emitter
  // if no callback, it will still exit gracefully on Ctrl-C
  callback = callback || noOp;
  // process.on("cleanup", callback);

  // do app specific cleaning before exiting
  process.on("exit", function () {});

  // catch ctrl+c event and exit normally
  process.on("SIGINT", function () {
    console.log("Terminating ...");
    process.exit(2);
  });

  //catch uncaught exceptions, trace, then exit normally
  process.on("uncaughtException", function (e) {
    console.log("Uncaught Exception...");
    console.log(e.stack);
    process.exit(99);
  });
}
