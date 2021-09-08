import type { NatsInfo } from "@natsu/types";

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
  const request = async <T extends NatsInfo>(
    subject: T["subject"],
    body: T["request"]
  ): Promise<T["response"]> => {
    const response = await fetch(options.serverURL.toString(), {
      method: "POST",
      mode: "cors",
      headers: {
        "nats-subject": subject,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    return (await response.json()) as T["response"];
  };

  return request;
};

export const request = connect({ serverURL: new URL("http://localhost:8080") });
