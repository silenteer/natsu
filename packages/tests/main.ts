import Natsu from 'natsu';
import { createClient } from 'natsu/client';
import type {Service} from '@natsu/types';

import { test, expect, beforeAll } from 'vitest';

type OkService = Service<'ok', {msg: string}, {msg: string}>
type FaultyService = Service<'faulty', {msg: string}, {msg: string}>

const okService: OkService = {
  subject: 'ok',
  handle: async (ctx) => {

    return ctx.ok(ctx.data)
  }
}

const faultyService: FaultyService = {
  subject: 'faulty',
  handle: async (ctx) => {
    return ctx.err('Not so good')
  }
}


async function main() {
  const {request, nc} = await Natsu({
    codec: 'json',
    units: [okService, faultyService]
  });

  await nc.close();
}

main();
