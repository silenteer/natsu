import type {
  Codec,
  JetStreamClient,
  JetStreamManager,
  JetStreamOptions,
  Msg,
  NatsConnection,
  PublishOptions,
  Stats,
  Status,
  Subscription,
  SubscriptionOptions,
} from "nats.ws";
import { JSONCodec } from "nats.ws";

const NotSupportedError = new Error(
  "Method is not supported, please use nats.ws instead"
);

export type ConnectionOptions = {
  serverURL: URL;
  codec?: Codec<unknown>;
  method?: "POST";
  contentType?: string;
};

const defaultOptions = {
  codec: JSONCodec(),
  method: "POST",
  contentType: "application/nats",
};

class NatsPort implements NatsConnection {
  connectionOptions: { serverURL: URL; codec: Codec<unknown> };

  constructor(connectionOptions: ConnectionOptions) {
    this.connectionOptions = { ...defaultOptions, ...connectionOptions };
  }

  closed(): Promise<void | Error> {
    throw NotSupportedError;
  }

  close(): Promise<void> {
    throw NotSupportedError;
  }

  publish(subject: string, data?: Uint8Array, options?: PublishOptions): void {
    throw NotSupportedError;
  }

  subscribe(subject: string, opts?: SubscriptionOptions): Subscription {
    throw NotSupportedError;
  }

  flush(): Promise<void> {
    throw new Error("Method not implemented.");
  }

  drain(): Promise<void> {
    throw new Error("Method not implemented.");
  }

  isClosed(): boolean {
    return true;
  }

  isDraining(): boolean {
    throw new Error("Method not implemented.");
  }

  getServer(): string {
    throw new Error("Method not implemented.");
  }

  status(): AsyncIterable<Status> {
    throw new Error("Method not implemented.");
  }

  stats(): Stats {
    throw NotSupportedError;
  }

  jetstreamManager(opts?: JetStreamOptions): Promise<JetStreamManager> {
    throw NotSupportedError;
  }

  jetstream(opts?: JetStreamOptions): JetStreamClient {
    throw NotSupportedError;
  }

  async request<T>(subject: string, data?: any): Promise<JsMsg<T>> {
    const response = await fetch(this.connectionOptions.serverURL.toString(), {
      method: "POST",
      mode: "cors",
      headers: {
        "nats-subject": subject,
        "Content-Type": "application/json+nats",
      },
      body: JSON.stringify(data),
    });

    const msg: JsMsg<T> = (await response.json()) as JsMsg<T>;
    return msg;
  }
}

export type JsMsg<T> = Omit<Msg, "data"> & { data: T };

export const connect = (options: ConnectionOptions): NatsPort => {
  return new NatsPort(options);
};
