import * as yup from 'yup';
import type { NatsGetCareProviders } from 'example-type';
import type { NatsValidate, NatsAuthorize, NatsHandle } from '@silenteer/natsu';

const schema = yup.array(yup.string().trim()).required().min(1).required();

const validate: NatsValidate<NatsGetCareProviders> = async (
  data,
  injection
) => {
  try {
    schema.validateSync(data.body.ids);
    return injection.ok({ data });
  } catch (error) {
    return injection.error({ data, errors: error.errors });
  }
};

const authorize: NatsAuthorize<NatsGetCareProviders> = async (
  data,
  injection
) => {
  return injection.ok({ data });
};

const handle: NatsHandle<NatsGetCareProviders> = async (data, injection) => {
  return injection.ok({
    headers: data.headers,
    body: data.body.ids.map((id) => ({ id, name: `Care provider ${id}` })),
  });
};

export default {
  subject: 'api.getCareProviders',
  validate,
  authorize,
  handle,
};
