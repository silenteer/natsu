/* eslint-disable no-useless-escape */
/* eslint-disable @typescript-eslint/no-var-requires */
const { execSync } = require('child_process');
const isCheckFile = !!process.env.CHECK_FILE;

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

projects.forEach((projectPath) => {
  if (isCheckFile) {
    execSync(`(cd ${projectPath} && yarn install --check-files)`);
  }
  execSync(`(cd ${projectPath} && yarn)`);
});
