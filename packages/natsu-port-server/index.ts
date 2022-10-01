import { randomUUID } from 'crypto';
import type { IncomingMessage, Server } from 'http';
import * as yup from 'yup';
import { JSONCodec } from 'nats';
import type { RouteGenericInterface } from 'fastify/types/route';
import type { FastifyReply, FastifyRequest } from 'fastify';
import fastify from 'fastify';
import fastifyCors from 'fastify-cors';
import type { SocketStream } from 'fastify-websocket';
import fastifyWebsocket from 'fastify-websocket';
import 'colors';
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
import logger from './logger';
import NatsService from './service-nats';

const httpRequestSchema = yup.object({
  subject: yup.string().trim().required(),
  traceId: yup.string().trim().notRequired(),
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

const requestCodec = JSONCodec<NatsRequest<unknown>>();
const responseCodec = JSONCodec<NatsResponse>();

function start() {
  fastify()
    .register(fastifyCors, {
      origin: config.origin,
      credentials: config.credentials,
      methods: ['POST'],
    })
    .register(fastifyWebsocket)
    .post(config.httpPath, async (request, reply) => {
      const subject = request.headers['nats-subject'];

      try {
        reply.header('nats-subject', subject);

        logger.log(`----- [${subject}]Begin validate -----`, {
          headers: request.headers,
          body: request.body,
        });
        const validationResult = validateHttpRequest(request);
        if (validationResult.code === 400) {
          return400(reply);
          return;
        }
        logger.log(`----- [${subject}]End validate -----`, validationResult);

        logger.log(`----- [${subject}]Begin authenticate -----`);
        const authenticationResult = await authenticate(request);
        if (authenticationResult.code !== 'OK') {
          reply.send({
            code: authenticationResult.code,
            body: authenticationResult.authResponse?.body,
          });
          return;
        }
        logger.log(`----- [${subject}]End authenticate -----`);

        logger.log(`----- [${subject}]Begin send nats request -----`);

        const { headers, response } = await sendNatsRequest({
          httpRequest: request,
          natsAuthResponse: authenticationResult.authResponse as NatsResponse,
        });

        logger.log(`----- [${subject}]End send nats request -----`);

        if (headers['set-cookie']) {
          reply.header('set-cookie', headers['set-cookie']);
        }

        reply.send(response);
      } catch (error) {
        logger.error(subject, error);
        if (error.code) {
          reply.send(error);
        } else {
          return500(reply);
        }
      }
    })
    .get(config.wsPath, { websocket: true }, (connection, request) => {
      const connectionId = randomUUID();

      connection.socket.on('close', () => {
        NatsService.unsubscribeAllSubjects(connectionId);
      });

      connection.socket.on('message', async (message) => {
        let wsRequest: NatsPortWSRequest;

        try {
          wsRequest = JSON.parse(message.toString()) as NatsPortWSRequest;
          request.headers = {
            ...wsRequest.headers,
            ...request.headers,
            ['nats-subject']: wsRequest.subject,
          };

          const validationResult = validateWSRequest(wsRequest);
          if (validationResult.code === 400) {
            const response: NatsPortWSErrorResponse = {
              subject: wsRequest.subject,
              code: validationResult.code,
            };
            sendWSResponse({ connection, response });
            return;
          }

          const authenticationResult = await authenticate(request);
          if (authenticationResult.code !== 'OK') {
            connection.destroy(
              new Error(JSON.stringify({ code: authenticationResult.code }))
            );
            return;
          }

          const getNamespaceResult = await getNamespace({
            httpRequest: request,
            natsAuthResponse: authenticationResult.authResponse as NatsResponse,
          });
          if (getNamespaceResult.code !== 'OK') {
            connection.destroy(
              new Error(JSON.stringify({ code: authenticationResult.code }))
            );
            return;
          }

          if (wsRequest.action === 'subscribe') {
            NatsService.subscribe({
              connectionId,
              subject: wsRequest.subject,
              namespace: getNamespaceResult.namespace,
              onHandle: (response) => {
                sendWSResponse({ connection, response });
              },
            });
          } else if (wsRequest.action === 'unsubscribe') {
            NatsService.unsubscribe({
              connectionId,
              subject: wsRequest.subject,
              namespace: getNamespaceResult.namespace,
            });
          } else {
            connection.destroy(new Error('Unsupported operation'));
          }
        } catch (error) {
          const response: NatsPortWSErrorResponse = {
            subject: wsRequest?.subject,
            code: 500,
            body: JSON.stringify(error),
          };
          sendWSResponse({ connection, response });
        }
      });
    })
    .listen(config.port, '0.0.0.0', (error, address) => {
      if (error) {
        logger.error(error);
        process.exit(1);
      }
      logger.info(`Server listening at ${address}`);
    });
}

function validateHttpRequest(
  request: FastifyRequest<RouteGenericInterface, Server, IncomingMessage>
) {
  const contentType = request.headers['content-type'];
  const subject = request.headers['nats-subject'] as string;
  const traceId = request.headers['trace-id'] as string;
  let result: {
    code: 'OK' | 400;
  };

  if (!httpRequestSchema.isValidSync({ contentType, subject, traceId })) {
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
  const subject = request.headers['nats-subject'] as string;

  const shouldAuthenticate =
    config.natsAuthSubjects?.length > 0 &&
    !config.natsNonAuthorizedSubjects?.includes(subject);
  if (shouldAuthenticate) {
    logger.log(`----- [${subject}]Begin send nats auth request -----`);
    const natsAuthResponse = await sendNatsAuthRequest(request);

    if (natsAuthResponse.code !== 200) {
      result = {
        code: natsAuthResponse.code as any,
        authResponse: natsAuthResponse as
          | NatsPortResponse
          | NatsPortErrorResponse,
      };
    } else {
      result = {
        code: 'OK',
        authResponse: natsAuthResponse as
          | NatsPortResponse
          | NatsPortErrorResponse,
      };
    }
    logger.log(`----- [${subject}]End send nats auth request -----`);
    return result;
  }

  result = { code: 'OK' };
  return result;
}

async function getNamespace(params: {
  httpRequest: FastifyRequest<RouteGenericInterface, Server, IncomingMessage>;
  natsAuthResponse: NatsResponse;
}) {
  const { httpRequest, natsAuthResponse } = params;
  const subject = httpRequest.headers['nats-subject'] as string;
  let result: {
    code: 'OK' | 400 | 401 | 403 | 500;
    namespace?: string;
  };

  const shouldSetNamespace = config.natsNamespaceSubjects?.includes(subject);
  if (shouldSetNamespace) {
    const natsRequest: NatsRequest<unknown> = {
      headers: natsAuthResponse
        ? natsAuthResponse.headers
        : httpRequest.headers,
      body: { subject },
    };

    const message = await NatsService.request({
      subject: config.getNamespaceSubject,
      data: requestCodec.encode(natsRequest),
    });
    const natsResponse = responseCodec.decode(message.data);
    const namespace =
      natsResponse.code === 200 ? natsResponse.body?.namespace : undefined;

    if (namespace) {
      result = { code: 'OK', namespace };
      return result;
    } else {
      result = { code: natsResponse.code as any };
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
    logger.log(
      `----- [${request.headers['nats-subject']}][${subject}] Sending -----`,
      natsRequest
    );
    const message = await NatsService.request({
      subject,
      data: requestCodec.encode(natsRequest),
    });
    natsResponse = responseCodec.decode(message.data);
    logger.log(
      `----- [${request.headers['nats-subject']}][${subject}] Ending -----`,
      natsResponse
    );
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
  const natsRequest: NatsRequest<unknown> = {
    headers: natsAuthResponse ? natsAuthResponse.headers : httpRequest.headers,
    body: (httpRequest.body as NatsPortRequest)?.data,
  };
  logger.log(
    `----- [${natsRequest.headers['nats-subject']}] Sending -----`,
    natsRequest
  );
  const message = await NatsService.request({
    subject: httpRequest.headers['nats-subject'] as string,
    data: requestCodec.encode(natsRequest),
  });
  const natsResponse = responseCodec.decode(message.data);

  const portResponse: NatsPortResponse | NatsPortErrorResponse = {
    code: natsResponse.code as
      | NatsPortResponse['code']
      | NatsPortErrorResponse['code'],
    body: natsResponse.body,
  };

  logger.log(
    `----- [${natsRequest.headers['nats-subject']}] Ending -----`,
    portResponse
  );

  return { headers: natsResponse.headers, response: portResponse };
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
