import type { NatsGetNamespace } from 'example-type';
import type { NatsHandle } from '@silenteer/natsu';

const handle: NatsHandle<NatsGetNamespace> = async (data, injection) => {
  return injection.ok({
    body: { namespace: data.headers['user-id'] as string },
  });
};

export default { subject: 'api.getNamespace', handle };
