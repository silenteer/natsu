import { connect, StringCodec, Subscription } from "nats";
import type { NatsPortReq } from "@natsu/types";

(async function main() {
  const nc = await connect();
  console.log("Connected to NATS");

  const sub = nc.subscribe("api.test.hello");
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
      const msg = JSON.parse(codec.decode(m.data)) as NatsPortReq<Hello>;

      const newmsg = msg.body.msg.split("").reverse().join("");
      m.respond(codec.encode(JSON.stringify({ msg: newmsg })));
    } catch (e) {
      console.error(e);
    }
  }
}
