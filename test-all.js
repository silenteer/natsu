/* eslint-disable no-useless-escape */
/* eslint-disable @typescript-eslint/no-var-requires */
const { execSync } = require('child_process');

const projects = ['packages/natsu-port', 'packages/natsu'];

const commands = projects
  .map((projectPath) => `\"(cd ${projectPath} && yarn test)\"`)
  .join(' ');
execSync(`yarn concurrently ${commands}`);
