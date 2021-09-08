import { connect, StringCodec, Subscription } from "nats";
import type { NatsPortReq, IGetCareProviders } from "@natsu/types";

(async function main() {
  const nc = await connect();
  console.log("Connected to NATS");

  const sub = nc.subscribe("api.v2.mobile.patient.getCareProviders");
  handle(sub);
})();

const codec = StringCodec();

type Hello = {
  msg: string;
};

async function handle(s: Subscription) {
  console.log("Listening for ", s.getSubject());
  for await (const m of s) {
    try {
      const msg = JSON.parse(codec.decode(m.data)) as NatsPortReq<
        IGetCareProviders["request"]
      >;
      const result: IGetCareProviders["response"] = msg.body.ids.map((id) => ({
        id,
        name: `${id}`,
      }));

      const natsResponse: NatsPortReq<any> = {
        headers: m.headers,
        body: result,
      };
      m.respond(codec.encode(JSON.stringify(natsResponse)));
    } catch (e) {
      console.error(e);
    }
  }
}
