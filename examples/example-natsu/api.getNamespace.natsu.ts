import type { NatsGetNamespace } from '@silenteer/example-type';
import type { NatsHandle } from '@silenteer/natsu';
import { NatsHandleResultUtil } from '@silenteer/natsu';

const handle: NatsHandle<NatsGetNamespace> = async (data) => {
  return NatsHandleResultUtil.ok({
    namespace: data.headers['user-id'] as string,
  });
};

export default { subject: 'api.getNamespace', handle };
