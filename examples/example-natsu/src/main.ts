import { default as NatsClient } from '@silenteer/natsu';
import NatsGetCareProviders from './api.v2.mobile.patient.getCareProviders';

async function start() {
  try {
    const natsClient = NatsClient.setup({
      urls: ['localhost:4222'],
      verbose: true,
    });
    natsClient.register([NatsGetCareProviders]);
    await natsClient.start();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

start();
