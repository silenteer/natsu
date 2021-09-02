import type { GetConfig, NatsHandler } from "./index";

type Hello = {
  msg: string;
};

export const natsHandler: NatsHandler<Hello, Hello> = async (input) => {
  return { msg: "" };
};

export const getConfig: GetConfig = async () => {
  return {
    subject: "api.hello.test",
  };
};
