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
      user: config.natsUser,
      pass: config.natsPass,
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
  namespace?: string;
  onHandle: (response: NatsPortWSResponse | NatsPortWSErrorResponse) => void;
}) {
  const { connectionId, subject, namespace, onHandle } = params;
  const _subject = namespace ? `${subject}.${namespace}` : subject;

  if (
    subscriptions[_subject]?.connections?.some(
      (item) => item.connectionId === connectionId
    )
  ) {
    return;
  }

  let shouldSubscribe: boolean;
  if (!subscriptions[_subject]?.subscription) {
    const subscription = (await getConnection()).subscribe(_subject);
    subscriptions[_subject] = { subscription, connections: [] };
    shouldSubscribe = true;
  }
  subscriptions[_subject].connections = [
    ...subscriptions[_subject].connections,
    { connectionId, onHandle },
  ];

  if (!shouldSubscribe) {
    return;
  }

  const codec = JSONCodec<NatsResponse>();
  (async () => {
    for await (const message of subscriptions[_subject].subscription) {
      try {
        const data = message.data ? codec.decode(message.data) : undefined;

        if (data) {
          subscriptions[_subject].connections.forEach(({ onHandle }) => {
            onHandle({
              subject,
              code: data.code as
                | NatsPortWSResponse['code']
                | NatsPortWSErrorResponse['code'],
              body: data.body,
            });
          });
        }
      } catch (error) {
        console.error(error);
        subscriptions[_subject]?.connections?.forEach(({ onHandle }) => {
          onHandle({
            subject,
            code: 500,
          });
        });
      }
    }
  })();
}

async function unsubscribe(params: {
  connectionId: string;
  subject: string;
  namespace?: string;
}) {
  const { connectionId, subject, namespace } = params;
  const _subject = namespace ? `${subject}.${namespace}` : subject;

  if (!subscriptions[_subject]) {
    return;
  }

  subscriptions[_subject].connections = subscriptions[
    _subject
  ].connections.filter((item) => item.connectionId !== connectionId);

  if (subscriptions[_subject].connections.length === 0) {
    await subscriptions[_subject].subscription.drain();
    delete subscriptions[_subject];
  }
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
    Object.entries(subscriptions).forEach(([subject, { connections }]) => {
      if (connections.some((item) => item.connectionId === connectionId)) {
        unsubscriptionQueue.add({ connectionId, subject });
      }
    });
  },
};
