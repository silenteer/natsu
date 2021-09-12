import { connect, JSONCodec, Subscription } from "nats";
import type { NatsPortReq, NatsResponse, ErrorResponse } from "@natsu/types";
import type { GetCareProviders, GetCareProvidersResponse } from "service-types";
import GetCareProvidersHandler from "./handler";

(async function main() {
  const nc = await connect();
  console.log("Connected to NATS");

  const sub = nc.subscribe(GetCareProvidersHandler.subject);
  handle(sub);
})();

const codec = JSONCodec();

async function handle(s: Subscription) {
  console.log("Listening for ", s.getSubject());
  for await (const message of s) {
    try {
      let response: NatsResponse<GetCareProvidersResponse> | ErrorResponse =
        {} as never;
      const natsData = codec.decode(message.data) as NatsPortReq<
        GetCareProviders["request"]
      >;

      const validationResult = await GetCareProvidersHandler.validate(natsData);
      const isValidated = validationResult.code === 200;
      if (!isValidated) {
        response = { ...validationResult } as ErrorResponse;
      }
      let isAuthorized = false;
      if (isValidated) {
        const authorizationResult = await GetCareProvidersHandler.authorize(
          natsData
        );
        isAuthorized = authorizationResult.code === 200;
        if (!isAuthorized) {
          response = { ...authorizationResult } as ErrorResponse;
        }
      }
      if (isAuthorized) {
        const result = await GetCareProvidersHandler.handle(natsData);
        console.log(result);
        response = {
          code: 200,
          body: result,
        } as NatsResponse<GetCareProvidersResponse>;
      }

      if (message.reply) {
        const natsResponse: NatsPortReq<
          NatsResponse<GetCareProvidersResponse> | ErrorResponse
        > = {
          headers: message.headers,
          body: response,
        };
        message.respond(codec.encode(natsResponse));
      }
    } catch (e) {
      console.error(e);
      if (message.reply) {
        const natsResponse: NatsPortReq<ErrorResponse> = {
          headers: message.headers,
          body: { code: 500 } as ErrorResponse,
        };
        message.respond(codec.encode(natsResponse));
      }
    }
  }
}
