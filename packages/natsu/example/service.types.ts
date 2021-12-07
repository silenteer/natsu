import type { Service } from '../types';

export type PingService = Service<
  { subject: 'ping'; codec: 'string' },
  void,
  void
>;
export type PongService = Service<'pong', void, void>;
