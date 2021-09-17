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

const commands = projects
  .map((projectPath) => {
    if (isCheckFile) {
      return `\"(cd ${projectPath} && yarn install --check-files)\"`;
    }
    return `\"(cd ${projectPath} && yarn)\"`;
  })
  .join(' ');

if (isCheckFile) {
  execSync(`yarn install --check-files && concurrently ${commands}`);
} else {
  execSync(`yarn && concurrently ${commands}`);
}
