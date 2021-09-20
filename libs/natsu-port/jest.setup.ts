import Server from './__tests__/utility/server';

beforeAll(() => {
  global.fetch = require('node-fetch-polyfill');
  Server.listen();
});

afterEach(() => {
  Server.resetHandlers();
});
