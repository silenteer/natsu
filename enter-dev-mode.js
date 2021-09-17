/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// IMPORTANCE: Packages must be ordered correctly. If not, yarn build will fail
const packagesNeedToLink = [
  'libs/natsu-type',
  'libs/natsu',
  'libs/natsu-port-server',
  'libs/natsu-port',
];
const packagesUseLink = [
  'libs/natsu',
  'libs/natsu-port-server',
  'libs/natsu-port',
  'examples/example-type',
  'examples/example-natsu',
  'examples/example-server',
  'examples/example-client',
];
const packageNames = packagesNeedToLink.map((packagePath) => {
  return getPackageJson(packagePath).name;
});

packagesNeedToLink.forEach((packagePath) => {
  if (!fs.existsSync(`${packagePath}/dist`)) {
    execSync(`(cd ${packagePath} && yarn build && cd ./dist && yarn link)`);
  } else {
    execSync(`(cd ${packagePath}/dist && yarn link)`);
  }
});

packagesUseLink.forEach((packagePath) => {
  const packageJson = getPackageJson(packagePath);
  const packagesNeedToRemove = packageNames
    .map((packageName) => `node_modules/${packageName}`)
    .join(' ');

  execSync(`(cd ${packagePath} && rm -rf ${packagesNeedToRemove})`);

  const dependencies = Object.keys({
    ...packageJson.dependencies,
    ...packageJson.peerDependencies,
  }).filter((dependency) => dependency.startsWith('@silenteer/'));
  dependencies.forEach((dependency) => {
    execSync(
      `(cd ${packagePath} && rm -rf node_modules/${dependency} && yarn link ${dependency})`
    );
  });
});

function getPackageJson(packagePath) {
  const packageJson = require(path.join(
    __dirname,
    `${packagePath}/package.json`
  ));
  if (!packageJson) {
    throw new Error(`Not found package.json at ${packagePath}`);
  }
  return packageJson;
}
