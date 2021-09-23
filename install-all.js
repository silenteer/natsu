/* eslint-disable @typescript-eslint/no-var-requires */
const { execSync } = require('child_process');

const projects = [
  'libs/natsu',
  'libs/natsu-port',
  'libs/natsu-port-server',
  'libs/natsu-runner',
  'libs/natsu-type',
  'examples/example-client',
  'examples/example-server',
  'examples/example-natsu',
  'examples/example-type',
];

execSync(`yarn install --check-files`);

projects.forEach((projectPath) => {
  execSync(`(cd ${projectPath} && yarn install --check-files)`);
});
