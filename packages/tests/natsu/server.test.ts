import { Natsu } from 'natsu';
import type { Middleware, Implementation, Definition } from '@natsu/types';

import { test, expect, afterAll, describe } from 'vitest';

type TestMiddleware = Middleware<{ logger: string }>;

type OkDefinition = Definition<'ok', { msg: string }, { msg: string }>;
type FaultyDefinition = Definition<'faulty', { msg: string }, { msg: string }>;

type OkService = Implementation<OkDefinition, [TestMiddleware]>;
type FaultyService = Implementation<FaultyDefinition>;

const testMiddleware: TestMiddleware = async () => {
  return {
    name: 'test-middleware',
  };
};

const otherMiddleware: Middleware<{ startTime: string }> = async () => {
  return {
    name: 'start-middleware',
  };
};

const okService: OkService = {
  subject: 'ok',
  handle: async (ctx) => {
    return ctx.ok(ctx.data);
  },
  middlewares: [testMiddleware],
};

const faultyService: FaultyService = {
  subject: 'faulty',
  middlewares: [],
  handle: async (ctx) => {
    return ctx.err('Not so good');
  },
};

describe('Basic natsu functional', async () => {
  const { request, nc } = await Natsu({
    codec: 'json',
    units: [okService, faultyService],
  });

  test('Expect natsu to handle ok and faulty request', async () => {
    const okResult = await request<OkDefinition>('ok', { msg: 'hello' });
    expect(okResult.ok, 'Result should be fine');
    expect(okResult.unwrap().msg).toBe('hello');

    const faultyResult = await request<FaultyDefinition>('faulty', {
      msg: 'hello',
    });
    expect(faultyResult.err, 'Result should not be fine');
  });

  afterAll(async () => {
    console.log('closing nats connectoin');
    await nc.close();
  });
});
