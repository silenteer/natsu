#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */

const esbuild = require('esbuild');
const options = require('./command');
const path = require('path');
const fs = require('fs');

const glob = require('matched');
const files = glob.sync('*.natsu.ts');

const buildDir = path.join(process.cwd(), '.natsu', 'build');
fs.mkdirSync('.natsu/build', { recursive: true });

const envPath = path.join(process.cwd(), '.env.natsu');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
}

esbuild.buildSync({
  entryPoints: files,
  target: 'node12',
  format: 'cjs',
  platform: 'node',
  minify: false,
  bundle: true,
  outdir: buildDir,
});

const NatsClient = require('@silenteer/natsu');
const natsClient = NatsClient.default.setup({
  urls: [options.nats],
  verbose: options.verbose,
});

async function register() {
  for (const file of files) {
    const jsFile = path.join(buildDir, file.replace('.ts', '.js'));
    const module = require(jsFile);

    await natsClient.register([module.default]);
    console.log('Registered', module.default.subject);
  }
}

async function start() {
  await natsClient.start();
}

register()
  .then(() => start())
  .then(() => console.log('Server started successfully'))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
