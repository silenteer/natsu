import type { NatsConnection } from 'nats/lib/nats-base-client/types';
import { getCodec } from './helpers';
import type {
  ChannelLike,
  ClientPublish,
  ClientRequest,
  ExtractRequest,
  ExtractResponse,
  ServiceLike,
} from '@natsu/types';

import { Err, Ok, Result } from 'ts-results';
import type { NatsuConfig } from '.';

type CreateClient = {
  (nc: NatsConnection, config: NatsuConfig): {
    request: ClientRequest;
    publish: ClientPublish;
  };
};

const createClient: CreateClient = (nc, config) => {
  const defaultCodec = getCodec(config.codec);
  return {
    request: async <T extends ServiceLike>(
      subject: T['subject'],
      request?: ExtractRequest<T>
    ) => {
      try {
      const s = typeof subject === 'string' ? subject : subject.subject;
      const codec = typeof subject === 'string' ? defaultCodec : subject.codec ? getCodec(subject.codec) : defaultCodec;
      const m = await nc.request(s, codec.encode(request));
      console.log(codec.decode(m.data));
      const tryToBeResult = codec.decode(m.data) as Result<ExtractResponse<T>,any>;
      console.log('---', tryToBeResult);
      // TODO validate result here
      if (tryToBeResult.ok) {
        return Ok(tryToBeResult.val);
      } else {
        return Err(tryToBeResult.val);
      }
    } catch(e) {
      console.log(e);
      throw e;
    }
    },

    publish: async <T extends ChannelLike>(
      subject: T['subject'],
      request?: ExtractRequest<T>
    ) => {
      nc.publish(subject, defaultCodec.encode(request));
    },
  };
};

export { createClient };
