import * as yup from 'yup';
import type { NatsGetCareProviders } from '@silenteer/example-type';
import type { NatsValidate, NatsAuthorize, NatsHandle } from '@silenteer/natsu';
import {
  NatsValidationResultUtil,
  NatsAuthorizationResultUtil,
  NatsHandleResultUtil,
} from '@silenteer/natsu';

const schema = yup.array(yup.string().trim()).required().min(1).required();

const validate: NatsValidate<NatsGetCareProviders> = async (data) => {
  try {
    schema.validateSync(data.body.ids);
    return NatsValidationResultUtil.ok();
  } catch (error) {
    return NatsValidationResultUtil.error(error.errors);
  }
};

const authorize: NatsAuthorize<NatsGetCareProviders> = async () => {
  return NatsAuthorizationResultUtil.ok();
};

const handle: NatsHandle<NatsGetCareProviders> = async (data) => {
  return NatsHandleResultUtil.ok(
    data.body.ids.map((id) => ({ id, name: `Care provider ${id}` }))
  );
};

export default {
  subject: 'api.getCareProviders',
  validate,
  authorize,
  handle,
};
