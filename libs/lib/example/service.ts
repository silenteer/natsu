import type { HelloworldService } from './service.types';
import { ok } from '../results';

const handle: HelloworldService['handle'] = async () => {
  return ok({ msg: 'hello' });
};

const service: HelloworldService = {
  subject: 'hello.world',
  handle,
};

export default service;
