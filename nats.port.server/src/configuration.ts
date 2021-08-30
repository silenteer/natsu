import Joi from "joi";

const schema = Joi.object({
  natsURI: Joi.string().uri().required(),
  path: Joi.string(),
  port: Joi.number().less(65000).greater(0),
});

export type Config = {
  path: string;
  natsURI: string;
  port: number;
};

function getConfig() {
  const config = {
    natsURI: process.env.NATS_URI || "localhost:4222",
    port: process.env.NATS_PORT_PORT || "8080",
    path: process.env.NATS_PORT_PATH || "/",
  };

  const validationResult = schema.validate(config, { convert: true });
  if (validationResult.error) {
    console.error(
      "Config error",
      JSON.stringify(validationResult.error, undefined, 2)
    );
    process.exit(1);
  }

  console.log("Config set", JSON.stringify(validationResult, undefined, 2));
  return validationResult.value as Config;
}

export default getConfig();
