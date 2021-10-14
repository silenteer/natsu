import type { NatsConnection, RequestOptions, Subscription } from 'nats';
import { connect, JSONCodec } from 'nats';
import type {
  NatsPortWSResponse,
  NatsPortWSErrorResponse,
  NatsResponse,
} from '@silenteer/natsu-type';
import config from './configuration';

class Queue<TParams> {
  private _isProcessing: boolean;
  private _queue: TParams[] = [];

  constructor(private _onProcess: (params: TParams) => Promise<void>) {}

  add(params: TParams) {
    this._queue.unshift(params);
    if (!this._isProcessing) {
      this._process();
    }
  }

  private _process() {
    if (this._queue.length === 0) {
      return;
    }

    this._isProcessing = true;
    const params = this._queue.pop();
    this._onProcess(params).then(() => {
      this._isProcessing = false;
      this._process();
    });
  }
}

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
    subscriptions[subject]?.connections?.some(
      (item) => item.connectionId === connectionId
    )
  ) {
    return;
  }

  let shouldSubscribe: boolean;
  if (!subscriptions[subject]?.subscription) {
    const subscription = (await getConnection()).subscribe(subject);
    subscriptions[subject] = { subscription, connections: [] };
    shouldSubscribe = true;
  }
  subscriptions[subject].connections = [
    ...subscriptions[subject].connections,
    { connectionId, onHandle },
  ];

  if (!shouldSubscribe) {
    return;
  }

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
        subscriptions[subject]?.connections?.forEach(({ onHandle }) => {
          onHandle({
            subject,
            code: 500,
          });
        });
      }
    }
  })();
}

async function unsubscribe(params: { connectionId: string; subject: string }) {
  const { connectionId, subject } = params;

  if (!subscriptions[subject]) {
    return;
  }

  subscriptions[subject].connections = subscriptions[
    subject
  ].connections.filter((item) => item.connectionId !== connectionId);

  if (subscriptions[subject].connections.length === 0) {
    await subscriptions[subject].subscription.drain();
    delete subscriptions[subject];
  }
}

function encodeBody(body: unknown) {
  return body
    ? Buffer.from(JSONCodec().encode(body)).toString('base64')
    : undefined;
}

function decodeBody(body: string) {
  return body ? JSONCodec().decode(Buffer.from(body, 'base64')) : undefined;
}

const subscriptionQueue = new Queue(subscribe);
const unsubscriptionQueue = new Queue(unsubscribe);

export default {
  request,
  subscribe: (params: Parameters<typeof subscribe>[0]) =>
    subscriptionQueue.add(params),
  unsubscribe: (params: Parameters<typeof unsubscribe>[0]) =>
    unsubscriptionQueue.add(params),
  unsubscribeAllSubjects: (connectionId: string) => {
    for (const [subject, { connections }] of Object.entries(subscriptions)) {
      if (connections.some((item) => item.connectionId === connectionId)) {
        unsubscriptionQueue.add({ connectionId, subject });
      }
    }
  },
  encodeBody,
  decodeBody,
};
