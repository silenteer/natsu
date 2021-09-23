import type { IncomingMessage, Server } from 'http';
import * as yup from 'yup';
import { JSONCodec } from 'nats';
import type { RouteGenericInterface } from 'fastify/types/route';
import type { FastifyReply, FastifyRequest } from 'fastify';
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

const requestCodec = JSONCodec<NatsRequest<string>>();
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

        let natsAuthResponse: NatsResponse;
        const shouldAuthenticate =
          config.natsAuthSubjects?.length > 0 &&
          !config.natsNonAuthorizedSubjects?.includes(subject);
        if (shouldAuthenticate) {
          natsAuthResponse = await sendNatsAuthRequest(request);

          if (natsAuthResponse.code !== 200) {
            const response: NatsPortResponse | NatsPortErrorResponse = {
              code: natsAuthResponse.code as
                | NatsPortResponse['code']
                | NatsPortErrorResponse['code'],
            };
            reply.send(response);
            return;
          }
        }

        const response = await sendNatsRequest({
          httpRequest: request,
          natsAuthResponse,
        });
        reply.send(response);
      } catch (error) {
        console.error(error);
        if (error.code) {
          reply.send(error);
        } else {
          return500(reply);
        }
      }
    })
    .listen(config.port, '0.0.0.0', (error, address) => {
      if (error) {
        console.error(error);
        process.exit(1);
      }
      console.log(`Server listening at ${address}`);
    });
}

async function sendNatsAuthRequest(
  request: FastifyRequest<RouteGenericInterface, Server, IncomingMessage>
) {
  let natsResponse: NatsResponse;
  for (const subject of config.natsAuthSubjects) {
    const natsRequest: NatsRequest<string> = {
      headers: natsResponse ? natsResponse.headers : request.headers,
    };

    const message = await NatsService.request(
      subject,
      requestCodec.encode(natsRequest)
    );
    natsResponse = responseCodec.decode(message.data);
    if (natsResponse.code !== 200) {
      break;
    }
  }

  return natsResponse;
}

async function sendNatsRequest(params: {
  httpRequest: FastifyRequest<RouteGenericInterface, Server, IncomingMessage>;
  natsAuthResponse: NatsResponse;
}) {
  const { httpRequest, natsAuthResponse } = params;
  const natsRequest: NatsRequest<string> = {
    headers: natsAuthResponse ? natsAuthResponse.headers : httpRequest.headers,
    body: encodeBody((httpRequest.body as NatsPortRequest)?.data),
  };

  const message = await NatsService.request(
    httpRequest.headers['nats-subject'] as string,
    requestCodec.encode(natsRequest)
  );
  const natsResponse = responseCodec.decode(message.data);
  const portResponse: NatsPortResponse | NatsPortErrorResponse = {
    code: natsResponse.code as
      | NatsPortResponse['code']
      | NatsPortErrorResponse['code'],
    body: decodeBody(natsResponse.body),
  };

  return portResponse;
}

function encodeBody(body: unknown) {
  return body
    ? Buffer.from(JSONCodec().encode(body)).toString('base64')
    : undefined;
}

function decodeBody(body: string) {
  return body ? JSONCodec().decode(Buffer.from(body, 'base64')) : undefined;
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
