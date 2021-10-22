#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const args = require('arg')({
  '--config': String,
  '--nats-uri': String,
  '--nats-auth-subjects': String,
  '--nats-non-auth-subjects': String,
  '--nats-user': String,
  '--nats-pass': String,
  '--server-port': Number,
  '--server-http-path': String,
  '--server-ws-path': String,
  '--help': Boolean,
});

if (args['--help']) {
  const Table = require('cli-table3');
  const guideTable = new Table({
    head: ['Argument', 'Required', 'Default', 'Description'],
    colWidths: [30, 20, 20],
  });
  guideTable.push(
    [
      '--nats-uri',
      false,
      'localhost:4222',
      `It's nats address which will be connected`,
    ],
    [
      '--nats-auth-subjects',
      false,
      'undefined',
      `It can be a string with many urls which delimited by ','.\nServer will send request to them for authentication.`,
    ],
    [
      '--nats-non-auth-subjects',
      false,
      'undefined',
      `It can be a string with many urls which delimited by ','.\nServer won't authenticate them even authentication enabled.`,
    ],
    [
      '--nats-user',
      false,
      'undefined',
      `It's nats user which is used to authenticate nats connection`,
    ],
    [
      '--nats-pass',
      false,
      'undefined',
      `It's nats pass which is used to authenticate nats connection`,
    ],
    ['--server-port', false, 8080, `It's port which server run at.`],
    [
      '--server-http-path',
      false,
      '/',
      `It's an endpoint which server will listen to convert http request to nats request then send back http response to client`,
    ],
    [
      '--server-ws-path',
      false,
      '/',
      `It's an endpoint which server will listen to handle websocket request.\nThe request can ask server to subscribe or unsubscribe to a nats subject`,
    ],
    [
      '--config',
      false,
      'undefined',
      `It's used to load configuration from a js file.\nThe file should export an object has fields:\nNATS_URI?: String\nNATS_AUTH_SUBJECTS?: String\nNATS_NON_AUTHORIZED_SUBJECTS?: String\nSERVER_PORT?: Number\nSERVER_PATH?: String`,
    ]
  );
  console.log(guideTable.toString());
  return;
}

if (args['--config']) {
  const configPath = path.join(process.cwd(), args['--config']);
  const config = require(configPath);
  if (!config) {
    throw new Error(`Not found config file at ${configPath}`);
  }
  Object.entries(config || {}).forEach(([key, value]) => {
    process.env[key] = value;
  });
}
if (args['--nats-uri']) {
  process.env['NATS_URI'] = args['--nats-uri'];
}
if (args['--nats-auth-subjects']) {
  process.env['NATS_AUTH_SUBJECTS'] = args['--nats-auth-subjects'];
}
if (args['--nats-non-auth-subjects']) {
  process.env['NATS_NON_AUTHORIZED_SUBJECTS'] =
    args['--nats-non-auth-subjects'];
}
if (args['--nats-user']) {
  process.env['NATS_USER'] = args['--nats-user'];
}
if (args['--nats-pass']) {
  process.env['NATS_PASS'] = args['--nats-pass'];
}
if (args['--server-port']) {
  process.env['SERVER_PORT'] = args['--server-port'];
}
if (args['--server-http-path']) {
  process.env['SERVER_HTTP_PATH'] = args['--server-http-path'];
}
if (args['--server-ws-path']) {
  process.env['SERVER_WS_PATH'] = args['--server-ws-path'];
}

const serverPath = path.join(__dirname, 'dist/index.js');
if (!serverPath) {
  throw new Error(`Not found entry file at ${serverPath}`);
}

process
  .on('unhandledRejection', console.error)
  .on('uncaughtException', console.error);

const server = require(serverPath).default;
server.start();
