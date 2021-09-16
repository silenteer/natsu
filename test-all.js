/* eslint-disable no-useless-escape */
/* eslint-disable @typescript-eslint/no-var-requires */
const { execSync } = require('child_process');

const projects = ['libs/natsu-port'];

const commands = projects
  .map((projectPath) => `\"(cd ${projectPath} && yarn test)\"`)
  .join(' ');
execSync(`concurrently ${commands}`);
