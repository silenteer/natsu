import {Natsu} from 'natsu';
import type { Service } from '@natsu/types';

import { test, expect, afterAll, describe } from 'vitest';

type OkService = Service<'ok', { msg: string }, { msg: string }>;
type FaultyService = Service<'faulty', { msg: string }, { msg: string }>;

const okService: OkService = {
  subject: 'ok',
  handle: async (ctx) => {
    return ctx.ok(ctx.data);
  },
};

const faultyService: FaultyService = {
  subject: 'faulty',
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
    const okResult = await request<OkService>('ok', { msg: 'hello' });
    expect(okResult.ok, 'Result should be fine');
    expect(okResult.unwrap().msg).toBe('hello')

    const faultyResult = await request<FaultyService>('faulty', { msg: 'hello' });
    expect(faultyResult.err, 'Result should not be fine');
  });


  afterAll(async () => {
    console.log("closing nats connectoin")
    await nc.close();
  })
});
