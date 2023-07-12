import Server from './__tests__/utility/server';

beforeAll(() => {
  // TODO: change 'node-fetch-polyfill' to another package, one of package dependencies can't be pulled from github
  // global.fetch = require('node-fetch-polyfill');
  Server.listen();
});

afterEach(() => {
  Server.resetHandlers();
});
