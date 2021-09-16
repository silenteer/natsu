/* eslint-disable no-useless-escape */
/* eslint-disable @typescript-eslint/no-var-requires */
const { execSync } = require('child_process');

const projects = [
  'libs/natsu',
  'libs/natsu-port',
  'libs/natsu-port-server',
  'libs/natsu-type',
  'examples/example-client',
  'examples/example-server',
  'examples/example-natsu',
  'examples/example-type',
];

const commands = projects
  .map((projectPath) => `\"(cd ${projectPath} && yarn)\"`)
  .join(' ');
execSync(`yarn && concurrently ${commands}`);
