import type { NatsConnection } from 'nats';
import { JSONCodec } from 'nats';
import { connect } from 'nats';
import type { NatsService } from '@silenteer/natsu-type';
import NatsClient from '../../nats-client';

const responseCodec = JSONCodec();

type TestService = NatsService<string, unknown, unknown>;
type TestInjection = {
  logService: {
    log: () => void;
    info: () => void;
    warn: () => void;
    error: () => void;
  };
};

function init(params?: {
  logService?: {
    log: (message?: any, ...optionalParams: any[]) => void;
    info: (message?: any, ...optionalParams: any[]) => void;
    warn: (message?: any, ...optionalParams: any[]) => void;
    error: (message?: any, ...optionalParams: any[]) => void;
  };
}) {
  const { logService } = params || {};
  let natsConnection: NatsConnection;

  const natsClient = NatsClient.setup({
    urls: ['0.0.0.0:4222'],
    verbose: true,
    logLevels: logService ? 'all' : 'none',
    injections: {
      logService,
    },
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
        responseCodec.encode(
          data
            ? {
                code: data.code,
                body: data.body,
              }
            : undefined
        )
      );
    },
  };
}

export type { TestService, TestInjection };
export default {
  init,
};
