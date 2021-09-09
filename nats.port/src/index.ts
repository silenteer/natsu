import type { NatsService, NatsResponse, ErrorResponse } from "@natsu/types";

export type ConnectionOptions = {
  serverURL: URL;
  authorization?: string;
};

const connect = (options: ConnectionOptions) => {
  const request = async <T extends NatsService<string, unknown, unknown>>(
    subject: T["subject"],
    body: T["request"]
  ): Promise<T["response"]> => {
    try {
      const response: NatsResponse<T["response"]> | ErrorResponse = await fetch(
        options.serverURL.toString(),
        {
          method: "POST",
          mode: "cors",
          headers: {
            "nats-subject": subject,
            "Content-Type": "application/json",
            Authorization: options.authorization,
          },
          body:
            body !== undefined && body !== null
              ? JSON.stringify({
                  data: body,
                })
              : "{}",
        }
      ).then((response) => response.json());

      if (response.code === 200) {
        return response.body;
      } else if ([400, 401, 403, 500].includes(response.code)) {
        throw response;
      } else {
        throw new Error("Unknown response.");
      }
    } catch (e) {
      throw e;
    }
  };

  return request;
};

export const request = connect({ serverURL: new URL("http://localhost:8080") });
