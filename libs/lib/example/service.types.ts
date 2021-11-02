import type { Channel, Service } from '../types';

export type PingService = Channel<'ping', { msg: string }>;
export type PongService = Channel<'pong', { msg: string }>;
