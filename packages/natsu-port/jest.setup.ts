import Server from './__tests__/utility/server';

import 'isomorphic-fetch';

beforeAll(() => {
  Server.listen();
});

afterEach(() => {
  Server.resetHandlers();
});
