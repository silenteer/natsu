/* eslint-disable @typescript-eslint/no-var-requires */
const project = process.env.PROJECT;
if (!project) {
  throw new Error(
    `Use arg 'PROJECT' to declare the project path. Ex: PROJECT=packages/natsu yarn release`
  );
}

const path = require('path');
const packageJson = require(path.join(__dirname, project, 'package.json'));
if (!packageJson) {
  throw new Error(`Not found package.json at ${project}`);
}

const { publishConfig, files, scripts } = packageJson;

if (!publishConfig?.registry) {
  throw new Error(
    `Missing 'publishConfig.registry' in package.json at ${project}`
  );
}
if (!files || files.length === 0) {
  throw new Error(`Missing 'files' in package.json at ${project}`);
}

const fs = require('fs');
const { execSync } = require('child_process');

require('dotenv').config();
if (!process.env.NPM_CONFIG_TOKEN) {
  throw new Error(`'process.env.NPM_CONFIG_TOKEN' is required`);
}

const shouldUnitTest = !!scripts?.test;
if (shouldUnitTest) {
  execSync(`(cd ${project} && yarn test)`);
}

const shouldIntegrationTest = !!scripts?.['test:integration'];
if (shouldIntegrationTest) {
  execSync(`(cd ${project} && yarn test:integration)`);
}

const shouldBuild = !!scripts?.build;
if (shouldBuild) {
  execSync(
    `(cd ${project} && rm -rf node_modules yarn.lock && yarn && yarn build)`
  );
} else {
  execSync(`(cd ${project} && rm -rf node_modules yarn.lock && yarn)`);
}

execSync(
  `cd ${project} && rm -rf release && mkdir release && cp -r dist release && cp package.json release`
);

files
  .filter((file) => !file.includes('dist') && file.includes('.js'))
  .forEach((file) => {
    execSync(`(cd ${project} && cp ${file} release)`);
  });

const npmrcPath = path.join(__dirname, project, 'release/.npmrc');
execSync(`cd ${project} && rm -rf release/.npmrc`);
fs.appendFileSync(npmrcPath, `strict-ssl=false\n`);
fs.appendFileSync(
  npmrcPath,
  `@silenteer:registry=https://registry.npmjs.org/\n`
);
fs.appendFileSync(
  npmrcPath,
  `//registry.npmjs.org/:_authToken=${process.env.NPM_CONFIG_TOKEN}\n`
);
