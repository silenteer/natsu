import type { Result } from './types';

export function ok<T = undefined>(data?: T): Result<T, any> {
  return [
    {
      type: 'ok',
      data,
    },
    undefined,
  ];
}

export function notOk<T = undefined>(data?: T): Result<any, T> {
  return [
    undefined,
    {
      type: 'error',
      data,
    },
  ];
}
