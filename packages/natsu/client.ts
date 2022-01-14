import type { NatsConnection } from 'nats/lib/nats-base-client/types';
import { getCodec } from './helpers';
import type {
  ChannelLike,
  ClientPublish,
  ClientRequest,
  ExtractRequest,
  ExtractResponse,
  ServiceLike,
  ResultStruct
} from '@natsu/types';

import {Ok, Err} from 'pratica';
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
      const s = typeof subject === 'string' ? subject : subject.subject;
      const codec = typeof subject === 'string' ? defaultCodec : subject.codec ? getCodec(subject.codec) : defaultCodec;
      const m = await nc.request(s, codec.encode(request));

      if (m.data.length === 0) {
        return Ok();
      } else {
        return Ok(codec.decode(m.data) as ResultStruct<ExtractResponse<T>, any>);
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
