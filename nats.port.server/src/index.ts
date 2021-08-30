import fastify from "fastify";
import fastifyCors from "fastify-cors";
import config from "./configuration";
import { request as natsRequest } from "./nats";
import { JSONCodec, MsgHdrs } from "nats";

const server = fastify();
server.register(fastifyCors, {
  origin: "*",
  methods: ["POST"],
});

const natsJsonContentType = "application/json+nats";

const codec = JSONCodec();

server.post(config.path, async (request, reply) => {
  const contentType = request.headers["content-type"];
  const subject = request.headers["nats-subject"];

  if (subject === undefined || Array.isArray(subject)) {
    reply.statusCode = 400;
    reply.send();
    return;
  }

  if (contentType === natsJsonContentType) {
    const body = request.body;
    const result = await natsRequest(subject, codec.encode(body as string));

    if (result) {
      reply.send(
        JSON.stringify({
          headers: result.headers,
          data: codec.decode(result.data),
        })
      );
    } else {
      reply.send();
    }

    return;
  } else {
    reply.statusCode = 400;
    reply.send();
    return;
  }
});

server.listen(config.port, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server listening at ${address}`);
});
