import type { Channel, Service } from '../types';

export type PingService = Service<
  { subject: 'ping'; codec: 'string' },
  void,
  { msg: string }
>;
export type PongService = Service<'pong', void, void>;
