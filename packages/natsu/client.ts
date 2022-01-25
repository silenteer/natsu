import type { NatsConnection } from 'nats/lib/nats-base-client/types';
import { getCodec } from './helpers';
import type {
  RequestHolder,
} from '@natsu/types';

import { Err, Ok, Result } from 'ts-results';
import type { NatsuConfig } from './runner';

type CreateClient = {
  (nc: NatsConnection, config: NatsuConfig): RequestHolder
};

const createClient: CreateClient = (nc, config) => {
  const defaultCodec = getCodec(config.codec);
  return {
    request: async (subject, request?) => {
      try {
        const s = subject;
        const codec =
          typeof subject === 'string'
            ? defaultCodec
            : subject.codec
            ? getCodec(subject.codec)
            : defaultCodec;
        const m = await nc.request(s, codec.encode(request));
        console.log(codec.decode(m.data));
        const tryToBeResult = codec.decode(m.data) as Result<any, any>;

        // TODO validate result here
        if (tryToBeResult.ok) {
          return Ok(tryToBeResult.val);
        } else {
          return Err(tryToBeResult.val);
        }
      } catch (e) {
        console.log(e);
        throw e;
      }
    },
  };
};

export { createClient };
