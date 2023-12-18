import * as yup from 'yup';
import type { NatsValidate, NatsAuthorize, NatsHandle } from '@silenteer/natsu';
import NatsuClient from '@silenteer/natsu';
import NatsPortServer from '../index';

type NatsHello = {
  subject: 'api.hello';
  request: { name: string };
  response: { message: string };
};
let natsuClient: ReturnType<typeof NatsuClient.setup>;

process.on('beforeExit', () => {
  natsuClient?.stop();
});

(async () => {
  const schema = yup.object({
    name: yup.string().trim().required(),
  });

  const subject: NatsHello['subject'] = 'api.hello';

  const validate: NatsValidate<NatsHello> = async (data, injection) => {
    try {
      schema.validateSync(data.body);
      return injection.ok();
    } catch (error) {
      return injection.error({ errors: error.errors });
    }
  };

  const authorize: NatsAuthorize<NatsHello> = async (data, injection) => {
    return injection.ok();
  };

  const handle: NatsHandle<NatsHello> = async (data, injection) => {
    const { name } = data.body;

    return injection.ok({
      headers: data.headers,
      body: { message: `Hello ${name}` },
    });
  };
  natsuClient = NatsuClient.setup({
    urls: ['0.0.0.0:4222'],
    verbose: true,
  });

  natsuClient.register([
    {
      subject,
      validate,
      authorize,
      handle,
    },
  ]);

  await natsuClient.start();

  console.log('Started natsu');
})().then(() => {
  NatsPortServer.start();

  console.log('Started natsu-port-server');
});
