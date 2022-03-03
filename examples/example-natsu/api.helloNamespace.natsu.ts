import type { NatsHelloNamespace } from '@silenteer/example-type';
import type { NatsResponse } from '@silenteer/natsu-type';
import type { NatsHandle } from '@silenteer/natsu';
import NatsServiceMiddleware from './middlewares/middleware-nats-service';

const handle: NatsHandle<NatsHelloNamespace> = async (data, injection) => {
  const message = `Hello ${data.headers['user-id']}`;
  const natsResponse: NatsResponse = {
    code: 200,
    headers: data.headers,
    body: { message },
  };

  await injection.natsService.publish('ws.helloNamespace', natsResponse);

  return injection.ok({ headers: data.headers, body: data.body });
};

export default {
  subject: 'api.helloNamespace',
  handle,
  middlewares: [NatsServiceMiddleware],
};
