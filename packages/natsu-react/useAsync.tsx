import { useCallback, useEffect, useState } from 'react';

export type UseAsyncResult<T, E = string> = {
  execute: () => void;
} & (
  | {
      status: 'idle';
    }
  | {
      status: 'pending';
    }
  | {
      status: 'success';
      value: T;
    }
  | {
      status: 'error';
      error: E;
    }
);

const useAsync = <T, E = string>(
  asyncFunction: () => Promise<T>,
  immediate = true
): UseAsyncResult<T, E> => {
  const [status, setStatus] = useState<
    'idle' | 'pending' | 'success' | 'error'
  >('idle');
  const [value, setValue] = useState<T | null>(null);
  const [error, setError] = useState<E | null>(null);
  // The execute function wraps asyncFunction and
  // handles setting state for pending, value, and error.
  // useCallback ensures the below useEffect is not called
  // on every render, but only if asyncFunction changes.
  const execute = useCallback(() => {
    setStatus('pending');
    setValue(null);
    setError(null);
    return asyncFunction()
      .then((response: any) => {
        setValue(response);
        setStatus('success');
      })
      .catch((error: any) => {
        setError(error);
        setStatus('error');
      });
  }, [asyncFunction]);
  // Call execute if we want to fire it right away.
  // Otherwise execute can be called later, such as
  // in an onClick handler.
  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);

  const v = value as T;
  const e = error as E;

  switch (status) {
    case 'idle':
    case 'pending':
      return { execute, status };

    case 'success':
      return { execute, status, value: v };

    case 'error':
      return { execute, status, error: e };
  }
};

export default useAsync;
