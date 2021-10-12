import type { ModuleConfig } from './module';

// Module cache
const loadedModule = new Map();

const defaultContext = new Map();

const initModule = async (mod: ModuleConfig<any>) => {
  if (!loadedModule.has(mod)) {
    mod.init && (await mod.init(defaultContext));
    loadedModule.set(mod, mod);
  }
};

const initDependencies = async (dependencies: Array<ModuleConfig<any>>) => {
  for (const mod of dependencies) {
    if (!mod.depends) {
      await initModule(mod);
    } else {
      await initDependencies(mod.depends);
      await initModule(mod);
    }
  }
};

export { initModule, initDependencies };
