import { connect, JSONCodec, Subscription } from "nats";

(async function main() {
  const nc = await connect();
  console.log("Connected to NATS");

  const sub = nc.subscribe("api.test.hello");
  handle(sub);
})();

const codec = JSONCodec();

type Hello = {
  msg: string;
};

async function handle(s: Subscription) {
  console.log("Listening for ", s.getSubject());
  for await (const m of s) {
    try {
      const body = codec.decode(m.data) as Hello;
      console.log("Receiving", JSON.stringify(body));
      const msg = body.msg.split("").reverse().join("");
      m.respond(codec.encode({ msg }));
    } catch (e) {
      console.error(e);
    }
  }
}
