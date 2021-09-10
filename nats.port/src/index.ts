import type { NatsService, NatsResponse, ErrorResponse } from "@natsu/types";

export type ConnectionOptions = {
  serverURL: URL;
} & RequestInit;

const connect = (options: ConnectionOptions) => {
  const request = async <T extends NatsService<string, unknown, unknown>>(
    subject: T["subject"],
    body: T["request"]
  ): Promise<T["response"]> => {
    try {
      const result = await fetch(options.serverURL.toString(), {
        ...options,
        method: "POST",
        mode: "cors",
        headers: {
          "nats-subject": subject,
          "Content-Type": "application/json",
          ...options.headers,
        },
        ...(body !== undefined && body !== null
          ? {
              body: JSON.stringify({
                data: body,
              }),
            }
          : {}),
      });

      let response: NatsResponse<T["response"]> | ErrorResponse;
      try {
        response = await result.json();
      } catch (e) {
        throw new Error("Response is not JSON");
      }

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

export default connect;
