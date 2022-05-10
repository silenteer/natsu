import type { Config } from './configuration';
import Configuration from './configuration';

let logLevels: Config['logLevels'];
if (Configuration.logLevels.includes('none')) {
  logLevels = [];
} else if (Configuration.logLevels.includes('all')) {
  logLevels = ['log', 'info', 'error'];
} else {
  Configuration.logLevels.forEach((logLevel) => {
    if (['log', 'info', 'error'].includes(logLevel)) {
      if (logLevels) {
        logLevels = [];
      }
      logLevels.push(logLevel);
    }
  });
}

function log(message?: any, ...optionalParams: any[]) {
  if (logLevels.includes('log')) {
    console.log(message, ...optionalParams);
  }
}

function info(message?: any, ...optionalParams: any[]) {
  if (logLevels.includes('info')) {
    console.info(message, ...optionalParams);
  }
}

function error(message?: any, ...optionalParams: any[]) {
  if (logLevels.includes('error')) {
    console.error(message, ...optionalParams);
  }
}

export default {
  log,
  info,
  error,
};
