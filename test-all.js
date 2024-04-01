/* eslint-disable no-useless-escape */
/* eslint-disable @typescript-eslint/no-var-requires */
const { execSync } = require('child_process');

const projects = [
  'packages/natsu-port',
  'packages/natsu-port-server',
  'packages/natsu',
];

const commands = projects
  .map((projectPath) => {
    if (projectPath === 'packages/natsu-port-server') {
      return `\"(cd ${projectPath} && yarn test && yarn test:integration:install && yarn test:integration)\"`;
    }
    return `\"(cd ${projectPath} && yarn test)\"`;
  })
  .join(' ');
execSync(`yarn concurrently ${commands}`);
