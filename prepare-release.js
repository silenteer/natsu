/* eslint-disable @typescript-eslint/no-var-requires */
const project = process.env.PROJECT;
if (!project) {
  throw new Error(
    `Use arg 'PROJECT' to declare the project path. Ex: PROJECT=libs/natsu yarn release`
  );
}

const path = require('path');
const packageJson = require(path.join(__dirname, project, 'package.json'));
if (!packageJson) {
  throw new Error(`Not found package.json at ${project}`);
}

const { publishConfig, files, scripts } = packageJson;
if (!publishConfig?.access) {
  throw new Error(
    `Missing 'publishConfig.access' in package.json at ${project}`
  );
}
if (!publishConfig?.registry) {
  throw new Error(
    `Missing 'publishConfig.registry' in package.json at ${project}`
  );
}
if (!files || files.length === 0) {
  throw new Error(`Missing 'files' in package.json at ${project}`);
}
if (!scripts?.build) {
  throw new Error(`Missing 'scripts.build' in package.json at ${project}`);
}

const fs = require('fs');
const { execSync } = require('child_process');

execSync('node ./config-npm-token.js');
if (!fs.existsSync('.env')) {
  throw new Error(`file '.env' for NPM_CONFIG_TOKEN is required`);
}
require('dotenv').config();
if (!process.env.NPM_CONFIG_TOKEN) {
  throw new Error(`'process.env.NPM_CONFIG_TOKEN' is required`);
}

const npmrcPath = path.join(__dirname, project, '.npmrc');
execSync(`cd ${project} && rm -rf .npmrc`);
fs.appendFileSync(npmrcPath, `strict-ssl=false\n`);
fs.appendFileSync(
  npmrcPath,
  `@silenteer:registry=https://registry.npmjs.org/\n`
);
fs.appendFileSync(
  npmrcPath,
  `//registry.npmjs.org/:_authToken=${process.env.NPM_CONFIG_TOKEN}\n`
);

execSync(`(cd ${project} && yarn build)`);