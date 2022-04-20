#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */
require('colors');

const info = (...params) => console.log('natsu-runner -'.green, ...params);

const dotenv = require('dotenv');
info('.env files will not be watched, restart the process as needed');
if (process.env.DOT_ENV_PATH !== undefined) {
  info('DOT_ENV_PATH is pointed to', process.env.DOT_ENV_PATH);
  info('Loading DOT_ENV_PATH file into process.env');
  dotenv.config({ path: process.env.DOT_ENV_PATH });
} else {
  info('Try to load .env into process.env if any');
  dotenv.config();
}

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

info(
  `setting up esbuild to watch file changes. For now, it doesn't care that much about new file yet`
);

const NatsClient = require('@silenteer/natsu');
let natsClient;

async function register() {
  for (const file of files) {
    const jsFile = path.join(buildDir, file.replace('.ts', '.js'));
    const module = require(jsFile);

    await natsClient.register([module.default]);
    info('Registered', module.default.subject);
  }
}

async function start() {
  await natsClient.start();
}

esbuild
  .build({
    entryPoints: files,
    target: 'node12',
    format: 'cjs',
    platform: 'node',
    minify: false,
    bundle: true,
    watch: {
      async onRebuild(error) {
        if (error) console.error('watch build failed:', error);
        else {
          if (natsClient !== undefined) {
            info('Restarting natsClient');
            await natsClient.stop();
          }

          natsClient = NatsClient.default.setup({
            urls: [options.nats],
            verbose: options.verbose,
          });

          register()
            .then(() => start())
            .then(() => console.log('Server started successfully'))
            .catch((e) => {
              console.error(e);
              process.exit(1);
            });
        }
      },
    },
    outdir: buildDir,
  })
  .then(async () => {
    try {
      info('Files built');

      natsClient = NatsClient.default.setup({
        urls: [options.nats],
        verbose: options.verbose,
      });

      register()
        .then(() => start())
        .then(() => console.log('Server started successfully'))
        .catch((e) => {
          console.error(e);
          process.exit(1);
        });
    } catch (e) {
      console.error(e);
      process.exit(1);
    }
  });
