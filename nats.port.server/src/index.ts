import fastify, { FastifyReply } from "fastify";
import fastifyCors from "fastify-cors";
import config from "./configuration";
import { request as natsRequest } from "./nats";
import { JSONCodec, headers as h } from "nats";

import type { NatsPortReq } from "@natsu/types";

const server = fastify();
server.register(fastifyCors, {
  origin: "*",
  methods: ["POST"],
});

const nastBinaryContentType = "application/json";
const codec = JSONCodec<any>();

function return400(reply: FastifyReply) {
  reply.statusCode = 400;
  reply.send();
}

server.post(config.path, async (request, reply) => {
  const contentType = request.headers["content-type"];
  const subject = request.headers["nats-subject"];

  if (subject === undefined || Array.isArray(subject)) {
    return400(reply);
    return;
  }

  if (contentType !== nastBinaryContentType) {
    return400(reply);
    return;
  }

  const _natsRequest: NatsPortReq<any> = {
    headers: request.headers,
    body: (request.body as never)?.["data"],
  };

  const result = await natsRequest(subject, codec.encode(_natsRequest));
  const natsResponse: NatsPortReq<any> = codec.decode(result.data);

  reply.send(natsResponse.body);
});

server.listen(config.port, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server listening at ${address}`);
});
