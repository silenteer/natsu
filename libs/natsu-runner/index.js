#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */

const esbuild = require('esbuild');

const path = require('path');
const fs = require('fs');

const glob = require('matched');
const files = glob.sync('*.natsu.ts');

const buildDir = path.join(process.cwd(), '.natsu', 'build');
fs.mkdirSync('.natsu/build', { recursive: true });

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
  urls: ['localhost:4222'],
  verbose: true,
});

files.forEach((file) => {
  const jsFile = path.join(buildDir, file.replace('.ts', '.js'));
  const module = require(jsFile);

  natsClient.register([module.default]);
});

async function start() {
  await natsClient.start();
}

start()
  .then(() => console.log('Server started successfully'))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
