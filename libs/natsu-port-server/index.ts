import type { IncomingMessage, Server } from 'http';
import * as yup from 'yup';
import { JSONCodec } from 'nats';
import type { RouteGenericInterface } from 'fastify/types/route';
import type { FastifyReply, FastifyRequest } from 'fastify';
import fastify from 'fastify';
import fastifyCors from 'fastify-cors';
import type { SocketStream } from 'fastify-websocket';
import fastifyWebsocket from 'fastify-websocket';
import type {
  NatsPortRequest,
  NatsPortResponse,
  NatsPortErrorResponse,
  NatsPortWSRequest,
  NatsPortWSResponse,
  NatsPortWSErrorResponse,
  NatsRequest,
  NatsResponse,
} from '@silenteer/natsu-type';
import config from './configuration';
import NatsService from './service-nats';

const httpRequestSchema = yup.object({
  subject: yup.string().trim().required(),
  contentType: yup
    .string()
    .trim()
    .test((value) => value === 'application/json'),
});

const wsRequestSchema = yup.object({
  subject: yup.string().trim().required(),
  action: yup
    .string()
    .oneOf(['subscribe', 'unsubscribe'] as Array<
      NatsPortWSRequest<string>['action']
    >),
});

const requestCodec = JSONCodec<NatsRequest<string>>();
const responseCodec = JSONCodec<NatsResponse>();

function start() {
  fastify()
    .register(fastifyCors, {
      origin: '*',
      methods: ['POST'],
    })
    .register(fastifyWebsocket)
    .post(config.httpPath, async (request, reply) => {
      try {
        const validationResult = validateHttpRequest(request);
        if (validationResult.code === 400) {
          return400(reply);
          return;
        }

        const authenticationResult = await authenticate(request);
        if (authenticationResult.code !== 'OK') {
          reply.send(authenticationResult.authResponse);
        }

        const response = await sendNatsRequest({
          httpRequest: request,
          natsAuthResponse: authenticationResult.authResponse as NatsResponse,
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
    .get(config.wsPath, { websocket: true }, async (connection, request) => {
      try {
        const authenticationResult = await authenticate(request);
        if (authenticationResult.code !== 'OK') {
          connection.destroy(
            new Error(JSON.stringify({ code: authenticationResult.code }))
          );
          return;
        }
      } catch (error) {
        console.error(error);
        if (error.code) {
          connection.socket.send(error);
        } else {
          connection.socket.send({ code: 500 });
        }
        return;
      }

      connection.socket.on('message', (message) => {
        let wsRequest: NatsPortWSRequest;

        try {
          wsRequest = JSON.parse(message) as NatsPortWSRequest;

          const validationResult = validateWSRequest(wsRequest);
          if (validationResult.code === 400) {
            const response: NatsPortWSErrorResponse = {
              subject: wsRequest.subject,
              code: validationResult.code,
            };
            sendWSResponse({ connection, response });
            return;
          }

          if (wsRequest.action === 'subscribe') {
            NatsService.subscribe(wsRequest.subject, (response) => {
              sendWSResponse({ connection, response });
            });
          } else if (wsRequest.action === 'unsubscribe') {
            NatsService.unsubscribe(wsRequest.subject);
          }
        } catch (error) {
          const response: NatsPortWSErrorResponse = {
            subject: wsRequest?.subject,
            code: 500,
          };
          sendWSResponse({ connection, response });
        }
      });
    })
    .listen(config.port, '0.0.0.0', (error, address) => {
      if (error) {
        console.error(error);
        process.exit(1);
      }
      console.log(`Server listening at ${address}`);
    });
}

function validateHttpRequest(
  request: FastifyRequest<RouteGenericInterface, Server, IncomingMessage>
) {
  const contentType = request.headers['content-type'];
  const subject = request.headers['nats-subject'] as string;
  let result: {
    code: 'OK' | 400;
  };

  if (!httpRequestSchema.isValidSync({ contentType, subject })) {
    result = { code: 400 };
    return result;
  }

  result = { code: 'OK' };
  return result;
}

function validateWSRequest(request: NatsPortWSRequest) {
  let result: {
    code: 'OK' | 400;
  };

  if (!wsRequestSchema.isValidSync(request)) {
    result = { code: 400 };
    return result;
  }

  result = { code: 'OK' };
  return result;
}

async function authenticate(
  request: FastifyRequest<RouteGenericInterface, Server, IncomingMessage>
) {
  let result: {
    code: 'OK' | 401 | 403 | 500;
    authResponse?: NatsPortResponse | NatsPortErrorResponse;
  };
  const subject = (request.headers['nats-subject'] ||
    request.body['subject']) as string;

  const shouldAuthenticate =
    config.natsAuthSubjects?.length > 0 &&
    !config.natsNonAuthorizedSubjects?.includes(subject);
  if (shouldAuthenticate) {
    const natsAuthResponse = await sendNatsAuthRequest(request);

    if (natsAuthResponse.code !== 200) {
      result = {
        code: natsAuthResponse.code as any,
        authResponse: natsAuthResponse as
          | NatsPortResponse
          | NatsPortErrorResponse,
      };
      return result;
    } else {
      result = {
        code: 'OK',
        authResponse: natsAuthResponse as
          | NatsPortResponse
          | NatsPortErrorResponse,
      };
      return result;
    }
  }

  result = { code: 'OK' };
  return result;
}

async function sendNatsAuthRequest(
  request: FastifyRequest<RouteGenericInterface, Server, IncomingMessage>
) {
  let natsResponse: NatsResponse;
  for (const subject of config.natsAuthSubjects) {
    const natsRequest: NatsRequest<string> = {
      headers: natsResponse ? natsResponse.headers : request.headers,
    };

    const message = await NatsService.request({
      subject,
      data: requestCodec.encode(natsRequest),
    });
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
    body: NatsService.encodeBody((httpRequest.body as NatsPortRequest)?.data),
  };

  const message = await NatsService.request({
    subject: httpRequest.headers['nats-subject'] as string,
    data: requestCodec.encode(natsRequest),
  });
  const natsResponse = responseCodec.decode(message.data);
  const portResponse: NatsPortResponse | NatsPortErrorResponse = {
    code: natsResponse.code as
      | NatsPortResponse['code']
      | NatsPortErrorResponse['code'],
    body: NatsService.decodeBody(natsResponse.body),
  };

  return portResponse;
}

function sendWSResponse(params: {
  connection: SocketStream;
  response: NatsPortWSResponse<string> | NatsPortWSErrorResponse<string>;
}) {
  const { connection, response } = params;
  if (response?.subject) {
    connection.socket.send(JSON.stringify(response));
  }
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
