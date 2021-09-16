import * as yup from 'yup';
import { JSONCodec } from 'nats';
import type { FastifyReply } from 'fastify';
import fastify from 'fastify';
import fastifyCors from 'fastify-cors';
import type {
  NatsPortRequest,
  NatsPortResponse,
  NatsPortErrorResponse,
  NatsRequest,
  NatsResponse,
} from '@silenteer/natsu-type';
import config from './configuration';
import NatsService from './service-nats';

const schema = yup.object({
  subject: yup.string().trim().required(),
  contentType: yup
    .string()
    .trim()
    .test((value) => value === 'application/json'),
});

const requestCodec = JSONCodec<NatsRequest>();
const responseCodec = JSONCodec<NatsResponse>();

function start() {
  fastify()
    .register(fastifyCors, {
      origin: '*',
      methods: ['POST'],
    })
    .post(config.path, async (request, reply) => {
      try {
        const contentType = request.headers['content-type'];
        const subject = request.headers['nats-subject'] as string;

        if (!schema.isValidSync({ contentType, subject })) {
          return400(reply);
          return;
        }

        const natsRequest: NatsRequest = {
          headers: request.headers,
          body: (request.body as NatsPortRequest)?.data,
        };

        const message = await NatsService.request(
          subject,
          requestCodec.encode(natsRequest)
        );
        const natsResponse = responseCodec.decode(message.data);
        const portResponse: NatsPortResponse | NatsPortErrorResponse = {
          code: natsResponse.code as
            | NatsPortResponse['code']
            | NatsPortErrorResponse['code'],
          body: natsResponse.body,
        };
        reply.send(portResponse);
      } catch (error) {
        console.error(error);
        return500(reply);
      }
    })
    .listen(config.port, (error, address) => {
      if (error) {
        console.error(error);
        process.exit(1);
      }
      console.log(`Server listening at ${address}`);
    });
}

function return400(reply: FastifyReply) {
  reply.statusCode = 400;
  reply.send();
}

function return500(reply: FastifyReply) {
  reply.statusCode = 500;
  reply.send();
}

export default {
  start,
};
