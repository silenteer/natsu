// eslint-disable-next-line @typescript-eslint/no-var-requires
const withTM = require('next-transpile-modules')([
  '@silenteer/natsu',
  '@silenteer/natsu-react',
  'example-type',
]); // pass the modules you would like to see transpiled

module.exports = withTM({});
