import type { IncomingMessage, Server } from 'http';
import * as yup from 'yup';
import { JSONCodec } from 'nats';
import type { Socket } from 'socket.io';
import type { RouteGenericInterface } from 'fastify/types/route';
import type { FastifyReply, FastifyRequest } from 'fastify';
import fastify from 'fastify';
import fastifyCors from 'fastify-cors';
import type { FastifyMultipartOptions } from '@fastify/multipart';
import fastifyMultipart from '@fastify/multipart';
import fastifyWebsocket from 'fastify-socket.io';
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

const SUBJECT_PATTERN = /^[A-Za-z0-9]+(\.[A-Za-z0-9]+){0,9}$/;

const httpRequestSchema = yup.object({
  subject: yup
    .string()
    .trim()
    .test((value) => !!value && SUBJECT_PATTERN.test(value)),
  traceId: yup.string().trim().notRequired(),
  contentType: yup
    .string()
    .trim()
    .test(
      (value) =>
        value === 'application/json' || value.includes('multipart/form-data')
    ),
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
const multipartOptions: FastifyMultipartOptions = {};

export type CustomFastifyRequest = FastifyRequest<any> & {
  parts: () => any;
  file?: Buffer;
};

export type OnBeforeSendNatsRequest = (
  request: CustomFastifyRequest
) => Promise<void>;

export type OnAfterSendNatsRequest = (
  request: CustomFastifyRequest,
  response: NatsPortResponse<unknown> | NatsPortErrorResponse
) => Promise<void>;

export type OnBeforeHandleSocket = (params: {
  subject: string;
  headers: {
    [key: string]: string;
  };
}) => Promise<{
  code: 'OK' | 400 | 401 | 403 | 429 | 500;
}>;

export type PortServerOptions = {
  onRequest?: (request: CustomFastifyRequest) => Promise<void>;
  onResponseSuccess?: (
    request: CustomFastifyRequest,
    response: NatsPortResponse<unknown> | NatsPortErrorResponse
  ) => Promise<void>;
  onResponseError?: (
    request: CustomFastifyRequest | NatsPortWSRequest,
    error: Error
  ) => Promise<void>;
  onBeforeSendNatsRequest?: OnBeforeSendNatsRequest;
  onAfterSendNatsRequest?: OnAfterSendNatsRequest;
  onBeforeHandleSocket?: OnBeforeHandleSocket;
  mapSubjectNamespace?: { [subject: string]: string }; // { [subject]: namespace }
};

function start(options?: PortServerOptions) {
  const app = fastify();

  app
    .register(fastifyCors, {
      origin: config.origin,
      credentials: config.credentials,
      methods: ['POST'],
    })
    .register(fastifyMultipart, multipartOptions)
    .register(fastifyWebsocket, {
      cors: {
        origin: config.origin,
        credentials: config.credentials,
        methods: ['GET', 'POST', 'OPTIONS'],
      },
      connectionStateRecovery: {
        maxDisconnectionDuration: config.maxDisconnectionDuration,
        skipMiddlewares: true,
      },
    });

  app.ready((error) => {
    if (error) {
      logger.error(error);
      process.exit(1);
    }

    app.io.on('connection', (socket) => {
      const connectionId = socket.id;

      socket.on('close', () => {
        NatsService.unsubscribeAllSubjects(connectionId);
      });

      socket.on('message', async (message) => {
        let wsRequest: NatsPortWSRequest;

        try {
          wsRequest = JSON.parse(message.toString()) as NatsPortWSRequest;

          const validationResult = await validateWSRequest(wsRequest);
          if (validationResult.code === 400) {
            const response: NatsPortWSErrorResponse = {
              subject: wsRequest.subject,
              code: validationResult.code,
            };
            sendWSResponse({ socket, response });
            return;
          }

          let headers = {
            ...wsRequest.headers,
            cookie: socket.handshake.headers.cookie,
            ['nats-subject']: wsRequest.subject,
          };

          const authenticationResult = await authenticate(headers);

          if (authenticationResult.code !== 'OK') {
            socket.disconnect(true);
            return;
          }

          headers = {
            ...headers,
            ...(authenticationResult.authResponse?.['headers'] || {}),
          };

          if (options?.onBeforeHandleSocket) {
            const result = await options.onBeforeHandleSocket({
              subject: wsRequest.subject,
              headers,
            });

            if (result.code !== 'OK') {
              socket.disconnect(true);
              return;
            }
          }

          const getNamespaceResult = await getNamespace({
            subject: wsRequest.subject,
            data: wsRequest.data as object,
            headers,
            options,
          });

          if (getNamespaceResult.code !== 'OK') {
            socket.disconnect(true);
            return;
          }

          if (wsRequest.action === 'subscribe') {
            NatsService.subscribe({
              connectionId,
              subject: wsRequest.subject,
              namespace: getNamespaceResult.namespace,
              onHandle: (response) => {
                sendWSResponse({ socket, response });
              },
            });
          } else if (wsRequest.action === 'unsubscribe') {
            NatsService.unsubscribe({
              connectionId,
              subject: wsRequest.subject,
              namespace: getNamespaceResult.namespace,
            });
          } else {
            socket.disconnect(true);
          }
        } catch (error) {
          const response: NatsPortWSErrorResponse = {
            subject: wsRequest?.subject,
            code: 500,
            body: JSON.stringify(error),
          };
          sendWSResponse({ socket, response });
        }
      });
    });
  });

  app
    .post(config.httpPath, async (request: CustomFastifyRequest, reply) => {
      const subject = request.headers['nats-subject'];

      if (options?.onRequest) {
        await options.onRequest(request);
      }

      try {
        reply.header('nats-subject', subject);

        logger.log(`----- [${subject}]Begin validate -----`, {
          headers: request.headers,
          body: request.body,
        });
        const validationResult = await validateHttpRequest(request);
        if (validationResult.code === 400) {
          return400(reply);
          return;
        }
        logger.log(`----- [${subject}]End validate -----`, validationResult);

        logger.log(`----- [${subject}]Begin authenticate -----`);
        const authenticationResult = await authenticate(request.headers);
        if (authenticationResult.code !== 'OK') {
          reply.send({
            code: authenticationResult.code,
            body: authenticationResult.authResponse?.body,
          });
          return;
        }
        logger.log(`----- [${subject}]End authenticate -----`);

        logger.log(`----- [${subject}]Begin send nats request -----`);

        if (options?.onBeforeSendNatsRequest) {
          await options.onBeforeSendNatsRequest(request);
        }

        const { headers, response } = await sendNatsRequest({
          httpRequest: request,
          natsAuthResponse: authenticationResult.authResponse as NatsResponse,
        });

        logger.log(`----- [${subject}]End send nats request -----`);

        if (headers['set-cookie']) {
          reply.header('set-cookie', headers['set-cookie']);
        }
        config.allowedCustomHeaders?.forEach((item) => {
          if (headers[item]) {
            reply.header(item, headers[item]);
          }
        });

        if (options?.onAfterSendNatsRequest) {
          await options.onAfterSendNatsRequest(request, response);
        }

        if (options?.onResponseSuccess) {
          await options.onResponseSuccess(request, response);
        }

        reply.send(response);
      } catch (error) {
        logger.error(subject, error);

        if (options?.onResponseError) {
          await options.onResponseError(request, error);
        }

        if (error.code) {
          reply.send(error);
        } else {
          return500(reply);
        }
      }
    })
    .listen(config.port, '0.0.0.0', (error, address) => {
      if (error) {
        logger.error(error);
        process.exit(1);
      }
      logger.info(`Server listening at ${address}`);
    });
}

async function validateHttpRequest(
  request: CustomFastifyRequest,
  options?: PortServerOptions
) {
  const contentType = request.headers['content-type'];
  const subject = request.headers['nats-subject'] as string;
  const traceId = request.headers['trace-id'] as string;
  let result:
    | {
        code: 'OK';
      }
    | {
        code: 400;
        errorCode: string;
      };

  if (!httpRequestSchema.isValidSync({ contentType, subject, traceId })) {
    result = { code: 400, errorCode: 'INVALID_HTTP_HEADERS' };

    logger.error('INVALID_HTTP_HEADERS', { subject, contentType, traceId });

    if (options?.onResponseError) {
      await options.onResponseError(
        request,
        new Error(
          `Invalid http headers: { subject: ${subject}, contentType: ${contentType}, traceId: ${traceId} }`
        )
      );
    }
    return result;
  }
  result = { code: 'OK' };
  return result;
}

async function validateWSRequest(
  request: NatsPortWSRequest,
  options?: PortServerOptions
) {
  const contentType = request.headers['content-type'];
  const subject = request.headers['nats-subject'] as string;
  const traceId = request.headers['trace-id'] as string;
  let result:
    | {
        code: 'OK';
      }
    | {
        code: 400;
        errorCode: string;
      };

  if (!wsRequestSchema.isValidSync({ contentType, subject, traceId })) {
    result = { code: 400, errorCode: 'INVALID_WS_HEADERS' };

    logger.error('INVALID_WS_HEADERS', { subject, contentType, traceId });

    if (options?.onResponseError) {
      await options.onResponseError(
        request,
        new Error(
          `Invalid ws headers: { subject: ${subject}, contentType: ${contentType}, traceId: ${traceId} }`
        )
      );
    }
    return result;
  }

  result = { code: 'OK' };
  return result;
}

async function authenticate(headers: FastifyRequest['headers']) {
  let result: {
    code: 'OK' | 401 | 403 | 500;
    authResponse?: NatsPortResponse | NatsPortErrorResponse;
  };
  const subject = headers['nats-subject'] as string;

  const shouldAuthenticate =
    config.natsAuthSubjects?.length > 0 &&
    !config.natsNonAuthorizedSubjects?.includes(subject);
  if (shouldAuthenticate) {
    logger.log(`----- [${subject}]Begin send nats auth request -----`);
    const natsAuthResponse = await sendNatsAuthRequest(headers);

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

const getNamespaceSubject = (
  subject: string,
  options: PortServerOptions
): string => {
  const mapSubjectNamespace = options?.mapSubjectNamespace || {};

  if (mapSubjectNamespace[subject]) {
    return mapSubjectNamespace[subject];
  }

  return config.getNamespaceSubject;
};

async function getNamespace(params: {
  subject: string;
  data: object;
  headers: NatsResponse['headers'];
  options: PortServerOptions;
}) {
  const { subject, headers, options, data = {} } = params;

  let result: {
    code: 'OK' | 400 | 401 | 403 | 500;
    namespace?: string;
  };

  const shouldSetNamespace = config.natsNamespaceSubjects?.includes(subject);

  if (shouldSetNamespace) {
    const natsRequest: NatsRequest<unknown> = {
      headers,
      body: { subject, ...data },
    };

    const message = await NatsService.request({
      subject: getNamespaceSubject(subject, options),
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

async function sendNatsAuthRequest(headers: FastifyRequest['headers']) {
  let natsResponse: NatsResponse;
  for (const subject of config.natsAuthSubjects) {
    const natsRequest: NatsRequest<string> = {
      headers: natsResponse ? natsResponse.headers : headers,
    };
    logger.log(
      `----- [${headers['nats-subject']}][${subject}] Sending -----`,
      natsRequest
    );
    const message = await NatsService.request({
      subject,
      data: requestCodec.encode(natsRequest),
    });
    natsResponse = responseCodec.decode(message.data);
    logger.log(
      `----- [${headers['nats-subject']}][${subject}] Ending -----`,
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
  socket: Socket;
  response: NatsPortWSResponse<string> | NatsPortWSErrorResponse<string>;
}) {
  const { socket, response } = params;
  if (response?.subject) {
    socket.send(JSON.stringify(response));
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

export { SUBJECT_PATTERN };
export default {
  start,
};
