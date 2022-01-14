import type { Service } from '@natsu/types';

export type PingService = Service<'ping',
  void,
  void
>;
export type PongService = Service<'pong', void, void>;
