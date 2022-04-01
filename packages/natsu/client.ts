import type { NatsChannel, NatsService } from '@silenteer/natsu-type';
import type { ConnectionOptions, Msg, RequestOptions } from 'nats';
import { connect, JSONCodec, headers } from 'nats';

type Service = NatsService<string, unknown, unknown>;
type Channel = NatsChannel<string, unknown, unknown>;

function createHeaders(entries: Record<string, string[]>) {
  const container = headers();
  Object.entries(entries).forEach(([key, value]) => {
    value.forEach((v) => container.append(key, v));
  });
  return container;
}

type ClientOptions = ConnectionOptions & {
  defaultRequestOptions?: RequestOptions;
  defaultSubsOptions?: RequestOptions;
};

function createClient<A extends Service, B extends Channel>(
  clientOptions?: ClientOptions
) {
  const nc = connect(clientOptions);
  const { encode, decode } = JSONCodec();

  const request = async <T extends A['subject']>(
    subject: T,
    data?: Extract<A, { subject: T }>['request'],
    options?: RequestOptions
  ): Promise<Extract<A, { subject: T }>['response']> => {
    const connection = await nc;
    const body = encode(data);
    const msg = await connection.request(subject, body, {
      ...clientOptions?.defaultRequestOptions,
      ...options,
    });

    return decode(msg.data) as Extract<A, { subject: T }>['response'];
  };

  const subscribe = async <T extends B['subject']>(
    subject: T,
    handler: (
      data: Extract<B, { subject: T }>['response'],
      context: { msg: Msg }
    ) => Promise<void>
  ) => {
    const connection = await nc;
    const sub = connection.subscribe(
      subject,
      clientOptions?.defaultSubsOptions
    );
    (async () => {
      for await (const m of sub) {
        const body = decode(m.data) as Extract<B, { subject: T }>['response'];
        handler(body, { msg: m });
      }
    })();
  };

  return { request, subscribe, createHeaders };
}

export { createClient };
