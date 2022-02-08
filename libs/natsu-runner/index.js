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
let namespaceConfig;
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
  const { NATS_GET_NAMESPACE_SUBJECT, NATS_NAMESPACE_SUBJECTS } = process.env;
  if (NATS_GET_NAMESPACE_SUBJECT && NATS_NAMESPACE_SUBJECTS) {
    namespaceConfig = {
      getNamespaceSubject: NATS_GET_NAMESPACE_SUBJECT,
      namespaceSubjects: NATS_NAMESPACE_SUBJECTS,
    };
  }
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
  namespace: namespaceConfig,
  ...(process.env.SENTRY_DSN
    ? {
        sentry: {
          options: {
            dsn: process.env.SENTRY_DSN,
            environment: 'localhost',
          },
          getUser: () => ({ name: 'Example natsu runner' }),
        },
      }
    : {}),
});

files.forEach((file) => {
  const jsFile = path.join(buildDir, file.replace('.ts', '.js'));
  const module = require(jsFile);

  natsClient.register([module.default]);
  console.log('Registered', module.default.subject);
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
