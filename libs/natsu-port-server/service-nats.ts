import type { NatsConnection, RequestOptions, Subscription } from 'nats';
import { connect, JSONCodec } from 'nats';
import type {
  NatsPortWSResponse,
  NatsPortWSErrorResponse,
  NatsResponse,
} from '@silenteer/natsu-type';
import config from './configuration';

const subscriptions: {
  [subject: string]: {
    subscription: Subscription;
    connections: Array<{
      connectionId: string;
      onHandle: (
        response: NatsPortWSResponse | NatsPortWSErrorResponse
      ) => void;
    }>;
  };
} = {};
let natsConnection: NatsConnection;

async function getConnection(): Promise<NatsConnection> {
  if (!natsConnection) {
    natsConnection = await connect({
      servers: config.natsURI,
    });
  }

  return natsConnection;
}

const defaultRequestOptions: RequestOptions = {
  timeout: 60 * 1000,
};

async function request(params: {
  subject: string;
  data?: Uint8Array;
  options?: Partial<RequestOptions>;
}) {
  const { subject, data, options } = params;
  return (await getConnection()).request(subject, data, {
    ...defaultRequestOptions,
    ...options,
  });
}

async function subscribe(params: {
  connectionId: string;
  subject: string;
  onHandle: (response: NatsPortWSResponse | NatsPortWSErrorResponse) => void;
}) {
  const { connectionId, subject, onHandle } = params;

  if (
    subscriptions[subject]?.connections?.some((item) => {
      item.connectionId === connectionId;
    })
  ) {
    return;
  }

  if (!subscriptions[subject]?.subscription) {
    const subscription = (await getConnection()).subscribe(subject);
    subscriptions[subject] = { subscription, connections: [] };
  }
  subscriptions[subject].connections = [
    ...subscriptions[subject].connections,
    { connectionId, onHandle },
  ];

  const codec = JSONCodec<NatsResponse>();
  (async () => {
    for await (const message of subscriptions[subject].subscription) {
      try {
        const data = message.data ? codec.decode(message.data) : undefined;

        if (data) {
          subscriptions[subject].connections.forEach(({ onHandle }) => {
            onHandle({
              subject,
              code: data.code as
                | NatsPortWSResponse['code']
                | NatsPortWSErrorResponse['code'],
              body: decodeBody(data.body),
            });
          });
        }
      } catch (error) {
        console.error(error);
        subscriptions[subject].connections.forEach(({ onHandle }) => {
          onHandle({
            subject,
            code: 500,
          });
        });
      }
    }
  })();
}

function unsubscribe(params: { connectionId: string; subject: string }) {
  const { connectionId, subject } = params;

  if (!subscriptions[subject]) {
    return;
  }

  subscriptions[subject].connections = subscriptions[
    subject
  ].connections.filter((item) => item.connectionId !== connectionId);

  if (subscriptions[subject].connections.length === 0) {
    subscriptions[subject].subscription.unsubscribe();
    delete subscriptions[subject];
  }
}

function unsubscribeAllSubjects(connectionId: string) {
  Object.entries(subscriptions).forEach(([subject, { connections }]) => {
    if (connections.some((item) => item.connectionId === connectionId)) {
      unsubscribe({ connectionId, subject });
    }
  });
}

function encodeBody(body: unknown) {
  return body
    ? Buffer.from(JSONCodec().encode(body)).toString('base64')
    : undefined;
}

function decodeBody(body: string) {
  return body ? JSONCodec().decode(Buffer.from(body, 'base64')) : undefined;
}

export default {
  request,
  subscribe,
  unsubscribe,
  unsubscribeAllSubjects,
  encodeBody,
  decodeBody,
};
