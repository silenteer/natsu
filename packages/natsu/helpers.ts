import { StringCodec, JSONCodec } from 'nats';
import { Ok, Err } from 'ts-results';
import type { Result } from 'ts-results';

export function getCodec(codec: 'string' | 'json') {
  switch (codec) {
    case 'json':
      return JSONCodec();
    case 'string':
      return StringCodec();

    default:
      throw new Error(
        `Invalid codec requested, requested ${codec}, expected 'string' or 'json'`
      );
  }
}

export async function tryAwait<T>(fn: Promise<T>): Promise<Result<T, any>> {
  try {
    return Ok(await fn);
  } catch (e) {
    return Err(e);
  }
}
