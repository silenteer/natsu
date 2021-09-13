import * as yup from 'yup';

type Config = {
  path: string;
  natsURI: string;
  port: number;
};

const schema = yup.object({
  natsURI: yup.string().trim().required(),
  path: yup.string(),
  port: yup.number().lessThan(65000).moreThan(0),
});

const config = {
  natsURI: process.env.NATS_URI || 'localhost:4222',
  port: process.env.NATS_PORT_PORT || '8080',
  path: process.env.NATS_PORT_PATH || '/',
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
