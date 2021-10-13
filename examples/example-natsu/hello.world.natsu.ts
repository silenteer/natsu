import type { HelloService } from '@silenteer/example-type';
import type { NatsHandle } from '@silenteer/natsu';
import { NatsHandleResultUtil } from '@silenteer/natsu';

const handler: NatsHandle<HelloService> = async (data) => {
  return NatsHandleResultUtil.ok({ msg: 'hello' + data.body.msg });
};

export default { subject: 'hello.world', handler };
