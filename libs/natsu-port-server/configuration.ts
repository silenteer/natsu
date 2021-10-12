import * as yup from 'yup';

type Config = {
  natsURI: string;
  natsAuthSubjects: string[];
  natsNonAuthorizedSubjects: string[];
  natsUser: string;
  natsPass: string;
  httpPath: string;
  wsPath: string;
  port: number;
};

const schema = yup.object({
  natsURI: yup.string().trim().required(),
  natsAuthSubjects: yup.array(yup.string().trim()).min(1).notRequired(),
  natsNonAuthorizedSubjects: yup
    .array(yup.string().trim())
    .min(1)
    .notRequired(),
  natsUser: yup.string().trim().notRequired(),
  natsPass: yup.string().trim().notRequired(),
  httpPath: yup.string(),
  wsPath: yup.string(),
  port: yup.number().lessThan(65000).moreThan(0),
});

const config = {
  natsURI: process.env.NATS_URI || 'localhost:4222',
  natsAuthSubjects: process.env.NATS_AUTH_SUBJECTS?.split(',').filter(
    (item) => !!item
  ),
  natsNonAuthorizedSubjects: process.env.NATS_NON_AUTHORIZED_SUBJECTS?.split(
    ','
  ).filter((item) => !!item),
  natsUser: process.env.NATS_USER,
  natsPass: process.env.NATS_PASS,
  port: parseInt(process.env.SERVER_PORT) || 8080,
  httpPath: process.env.SERVER_HTTP_PATH || '/',
  wsPath: process.env.SERVER_WS_PATH || '/',
};

try {
  schema.validateSync(config);
} catch (error) {
  console.error('Config error', JSON.stringify(error.errors, undefined, 2));
  process.exit(1);
}

const result: Config = schema.cast(config);
console.log('Config set', JSON.stringify(result, undefined, 2));

export type { Config };
export default result;
