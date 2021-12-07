import { StringCodec, JSONCodec } from 'nats';

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
