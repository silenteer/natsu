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
    stop: async () => {
      await natsConnection?.drain();
      await natsClient.stop();
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
          body: data.body,
        })
      );
    },
  };
}

export default {
  init,
};
