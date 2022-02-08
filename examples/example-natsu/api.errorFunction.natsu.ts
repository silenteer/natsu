import type { NatsErrorFunction } from '@silenteer/example-type';
import type { NatsValidate, NatsAuthorize, NatsHandle } from '@silenteer/natsu';
import {
  NatsValidationResultUtil,
  NatsAuthorizationResultUtil,
  NatsHandleResultUtil,
} from '@silenteer/natsu';

const validate: NatsValidate<NatsErrorFunction> = async () => {
  return NatsValidationResultUtil.ok();
};

const authorize: NatsAuthorize<NatsErrorFunction> = async () => {
  return NatsAuthorizationResultUtil.ok();
};

const handle: NatsHandle<NatsErrorFunction> = async () => {
  foo();

  return NatsHandleResultUtil.ok();
};

export default {
  subject: 'api.errorFunction',
  validate,
  authorize,
  handle,
};
