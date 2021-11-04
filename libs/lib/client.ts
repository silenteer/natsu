import type { NatsConnection } from 'nats';
import { getCodec } from './helpers';
import type {
  ChannelLike,
  ClientPublish,
  ClientRequest,
  ExtractRequest,
  ExtractResponse,
  ServiceLike,
} from './types';
import type { NatsuConfig } from './unit';

type CreateClient = {
  (nc: NatsConnection, config: NatsuConfig): {
    request: ClientRequest;
    publish: ClientPublish;
  };
};

const createClient: CreateClient = (nc, config) => {
  const codec = getCodec(config.codec);
  return {
    request: async <T extends ServiceLike>(
      subject: T['subject'],
      request?: ExtractRequest<T>
    ) => {
      const s = typeof subject === 'string' ? subject : subject.subject;
      const m = await nc.request(s, codec.encode(request));
      return codec.decode(m.data) as ExtractResponse<T>;
    },

    publish: async <T extends ChannelLike>(
      subject: T['subject'],
      request?: ExtractRequest<T>
    ) => {
      nc.publish(subject, codec.encode(request));
    },
  };
};

export { createClient };
