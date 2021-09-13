import type { NatsConnection, RequestOptions } from 'nats';
import { connect } from 'nats';
import config from './configuration';

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

export async function request(
  subject: string,
  data?: Uint8Array,
  options?: Partial<RequestOptions>
) {
  return (await getConnection()).request(subject, data, {
    ...defaultRequestOptions,
    ...options,
  });
}
