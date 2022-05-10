import * as yup from 'yup';

import dotenv from 'dotenv';
dotenv.config();

type Config = {
  logLevels: Array<'all' | 'none' | 'error' | 'info' | 'log'>;
  natsURI: string;
  natsAuthSubjects: string[];
  natsNonAuthorizedSubjects: string[];
  natsNamespaceSubjects: string[];
  getNamespaceSubject: string;
  natsUser: string;
  natsPass: string;
  httpPath: string;
  wsPath: string;
  port: number;
};

const schema = yup.object({
  logLevels: yup
    .array(yup.string().oneOf(['all', 'none', 'error', 'info', 'log']))
    .required(),
  natsURI: yup.string().trim().required(),
  natsAuthSubjects: yup.array(yup.string().trim()).min(1).notRequired(),
  natsNonAuthorizedSubjects: yup
    .array(yup.string().trim())
    .min(1)
    .notRequired(),
  natsNamespaceSubjects: yup.array(yup.string().trim()).min(1).notRequired(),
  getNamespaceSubject: yup.string().when('natsNamespaceSubjects', {
    is: (natsNamespaceSubjects) =>
      natsNamespaceSubjects?.every((item) => !!item.trim()),
    then: yup.string().trim().required(),
    otherwise: yup.string().trim().notRequired(),
  }),
  natsUser: yup.string().trim().notRequired(),
  natsPass: yup.string().trim().notRequired(),
  httpPath: yup.string(),
  wsPath: yup.string(),
  port: yup.number().lessThan(65000).moreThan(0),
});

const config: Config = {
  logLevels: (process.env.LOG_LEVELS
    ? process.env.LOG_LEVELS.split(',').filter((item) => !!item)
    : ['all']) as Config['logLevels'],
  natsURI: process.env.NATS_URI || 'localhost:4222',
  natsAuthSubjects: process.env.NATS_AUTH_SUBJECTS?.split(',').filter(
    (item) => !!item
  ),
  natsNonAuthorizedSubjects: process.env.NATS_NON_AUTHORIZED_SUBJECTS?.split(
    ','
  ).filter((item) => !!item),
  natsNamespaceSubjects: process.env.NATS_NAMESPACE_SUBJECTS?.split(',').filter(
    (item) => !!item
  ),
  getNamespaceSubject: process.env.NATS_GET_NAMESPACE_SUBJECT,
  natsUser: process.env.NATS_USER,
  natsPass: process.env.NATS_PASS,
  port: parseInt(process.env.SERVER_PORT) || 8080,
  httpPath: process.env.SERVER_HTTP_PATH || '/',
  wsPath: process.env.SERVER_WS_PATH || '/',
};

try {
  console.log(config);
  schema.validateSync(config);
} catch (error) {
  console.error('Config error', JSON.stringify(error.errors, undefined, 2));
  process.exit(1);
}

const result = schema.cast(config);
console.log('Config set', JSON.stringify(result, undefined, 2));

export type { Config };
export default result as Config;
