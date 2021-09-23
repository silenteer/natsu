import type { HelloService } from 'example-type';
import type { NatsHandle } from '@silenteer/natsu';
import { NatsHandleResultUtil } from '@silenteer/natsu';

const handler: NatsHandle<HelloService> = async (data) => {
  return NatsHandleResultUtil.ok(data.body);
};

export default { handler };
