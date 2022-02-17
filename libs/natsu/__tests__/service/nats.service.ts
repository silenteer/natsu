import type { NatsConnection } from 'nats';
import { JSONCodec } from 'nats';
import { connect } from 'nats';
import NatsClient from '../../nats-client';

const responseCodec = JSONCodec();

function init() {
  let natsConnection: NatsConnection;
  const natsClient = NatsClient.setup({
    urls: ['0.0.0.0:4222'],
    verbose: true,
  });

  return {
    ...natsClient,
    stop: () => {
      natsConnection?.drain();
      return natsClient.stop();
    },
    request: async (params: {
      subject: string;
      data: { code: number; body?: unknown };
    }) => {
      const { subject, data } = params;

      if (!natsConnection) {
        natsConnection = await connect({
          servers: ['0.0.0.0:4222'],
          pingInterval: 30 * 1000,
          maxPingOut: 10,
          verbose: true,
        });
      }

      await natsConnection.request(
        subject,
        responseCodec.encode({
          code: data.code,
          body: encodeBody(data.body),
        })
      );
    },
  };
}

function encodeBody(body: unknown) {
  return body
    ? Buffer.from(JSONCodec().encode(body)).toString('base64')
    : undefined;
}

export default {
  init,
};
