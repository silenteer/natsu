import { connect, JSONCodec, Msg, MsgHdrs } from "nats";
import type { NatsConnection, RequestOptions } from "nats";
import config from "./configuration";

let ncInstance: NatsConnection;

async function getConnection(): Promise<NatsConnection> {
  if (!ncInstance) {
    ncInstance = await connect({
      servers: config.natsURI,
    });
  }

  return ncInstance;
}

const codec = JSONCodec();

const defaultRequestOptions: RequestOptions = {
  timeout: 60 * 1000,
};

export type RequestResponse<T> = {
  headers?: MsgHdrs;
  body: T;
};

export async function request(subject: string, data?: Uint8Array) {
  return (await getConnection()).request(subject, data, defaultRequestOptions);
}
