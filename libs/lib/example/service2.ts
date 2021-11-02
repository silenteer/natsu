import type { HelloworldString } from './service.types';
import { ok } from '../results';

const handle: HelloworldString['handle'] = async () => {
  return ok('aloha');
};

const service2: HelloworldString = {
  subject: 'hello',
  codec: 'string',
  handle,
};

export default service2;
