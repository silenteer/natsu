import type { NatsHelloNamespace } from '@silenteer/example-type';
import type { NatsHandle, NatsResponse } from '@silenteer/natsu';
import { NatsHandleResultUtil } from '@silenteer/natsu';

const handle: NatsHandle<NatsHelloNamespace> = async (data, injection) => {
  const message = `Hello ${data.headers['user-id']}`;
  const natsResponse: NatsResponse = {
    code: 200,
    headers: data.headers,
    body: { message },
  };

  await injection.natsService.publish('ws.helloNamespace', natsResponse);

  return NatsHandleResultUtil.ok();
};

export default { subject: 'api.helloNamespace', handle };
