import * as yup from 'yup';

import dotenv from 'dotenv';
dotenv.config();

type Config = {
  logLevels: Array<'all' | 'none' | 'error' | 'info' | 'log'>;
  maxDisconnectionDuration: number;
  natsURI: string;
  natsAuthSubjects: string[];
  natsNonAuthorizedSubjects: string[];
  natsNamespaceSubjects: string[];
  getNamespaceSubject: string;
  allowedCustomHeaders: string[];
  natsUser: string;
  natsPass: string;
  httpPath: string;
  wsPath: string;
  port: number;
  credentials: boolean;
  origin: string[];
};

const schema = yup.object({
  logLevels: yup
    .array(yup.string().oneOf(['all', 'none', 'error', 'info', 'log']))
    .required(),
  maxDisconnectionDuration: yup.number().moreThan(0).required(),
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
  allowedCustomHeaders: yup.array(yup.string().trim()).min(1).notRequired(),
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
  maxDisconnectionDuration:
    parseInt(process.env.MAX_DISCONNECTION_DURATION) || 5 * 60 * 1000,
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
  allowedCustomHeaders: process.env.ALLOWED_CUSTOM_HEADERS?.split(',').filter(
    (item) => !!item
  ),
  natsUser: process.env.NATS_USER,
  natsPass: process.env.NATS_PASS,
  port: parseInt(process.env.SERVER_PORT) || 8080,
  httpPath: process.env.SERVER_HTTP_PATH || '/',
  wsPath: process.env.SERVER_WS_PATH || '/',
  origin: process.env.SERVER_ORIGIN
    ? [].concat(
        ...process.env.SERVER_ORIGIN.split(',').map((item) => {
          if (item.startsWith('/') && item.endsWith('/')) {
            return new RegExp(item.slice(1, item.length - 1));
          }
          return item;
        })
      )
    : ['*'],
  credentials: process.env.SERVER_CREDENTIALS === 'true',
};

try {
  console.log(config);
  schema.validateSync(config);
} catch (error) {
  console.error('Config error', JSON.stringify(error.errors, undefined, 2));
  process.exit(1);
}

export type { Config };
export default config as Config;
