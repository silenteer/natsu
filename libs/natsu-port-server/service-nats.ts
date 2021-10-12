import type { NatsConnection, RequestOptions, Subscription } from 'nats';
import { connect, JSONCodec } from 'nats';
import type {
  NatsPortWSResponse,
  NatsPortWSErrorResponse,
  NatsResponse,
} from '@silenteer/natsu-type';
import config from './configuration';

const subscriptions: { [subject: string]: Subscription } = {};
let natsConnection: NatsConnection;

async function getConnection(): Promise<NatsConnection> {
  if (!natsConnection) {
    natsConnection = await connect({
      servers: config.natsURI,
    });
  }

  return natsConnection;
}

const defaultRequestOptions: RequestOptions = {
  timeout: 60 * 1000,
};

async function request(params: {
  subject: string;
  data?: Uint8Array;
  options?: Partial<RequestOptions>;
}) {
  const { subject, data, options } = params;
  return (await getConnection()).request(subject, data, {
    ...defaultRequestOptions,
    ...options,
  });
}

async function subscribe(
  subject: string,
  onHandle: (response: NatsPortWSResponse | NatsPortWSErrorResponse) => void
) {
  if (subscriptions[subject]) {
    return;
  }

  const subcription = (await getConnection()).subscribe(subject);
  subscriptions[subject] = subcription;

  const codec = JSONCodec<NatsResponse>();
  (async () => {
    for await (const message of subcription) {
      try {
        const data = message.data ? codec.decode(message.data) : undefined;

        if (data) {
          onHandle({
            subject,
            code: data.code as
              | NatsPortWSResponse['code']
              | NatsPortWSErrorResponse['code'],
            body: decodeBody(data.body),
          });
        }
      } catch (error) {
        console.error(error);
        onHandle({
          subject,
          code: 500,
        });
      }
    }
  })();
}

async function unsubscribe(subject: string) {
  return subscriptions[subject]?.unsubscribe();
}

function encodeBody(body: unknown) {
  return body
    ? Buffer.from(JSONCodec().encode(body)).toString('base64')
    : undefined;
}

function decodeBody(body: string) {
  return body ? JSONCodec().decode(Buffer.from(body, 'base64')) : undefined;
}

export default {
  request,
  subscribe,
  unsubscribe,
  encodeBody,
  decodeBody,
};
