/* eslint-disable @typescript-eslint/no-var-requires */
const { program } = require('commander');

const { version } = require('./package.json');

program
  .version(version)
  .option(
    '-n --nats <nats-address>',
    'Nats address, default to localhost:4222',
    'localhost:4222'
  )
  .option('-v --verbose <true|false>', 'Lousy log, default to false', false)
  .option(
    '-p --pattern <*.natsu.ts,*.natsu.js>',
    'Natsu patterns, default to *.natsu.ts | *.natsu.js',
    '*.natsu.ts,*.natsu.js'
  )
  .parse(process.argv);

module.exports = program.opts();
