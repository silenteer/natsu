import type { NatsPortReq } from "@natsu/types";

export type ConnectionOptions = {
  serverURL: URL;
  method?: "POST";
  contentType?: string;
};

const defaultOptions = {
  method: "POST",
  contentType: "application/nats",
};

const connect = (options: ConnectionOptions) => {
  const request = async <T>(subject: string, data?: any) => {
    const response = await fetch(options.serverURL.toString(), {
      method: "POST",
      mode: "cors",
      headers: {
        "nats-subject": subject,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        body: data,
      }),
    });

    return (await response.json()) as NatsPortReq<T>;
  };

  return request;
};

export const request = connect({ serverURL: new URL("http://localhost:8080") });
