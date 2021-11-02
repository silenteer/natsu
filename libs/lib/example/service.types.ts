import type { Service } from '../types';

export type HelloworldService = Service<
  'hello.world',
  { msg: string },
  { msg: string }
>;
