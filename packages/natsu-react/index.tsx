import React, { useCallback, useContext, useEffect, useRef } from 'react';

import type { Client, NatsuSocket } from '@silenteer/natsu-port';
import type {
  NatsChannel,
  NatsPortWSResponse,
  NatsService,
} from '@silenteer/natsu-type';
import { useAsync } from 'react-async-hook';

export type NatsuOptions<
  A extends NatsService<string, unknown, unknown>,
  B extends NatsChannel<string, unknown, unknown>
> = {
  natsuClient: Client<A>;
  makeNatsuSocketClient?: () => NatsuSocket<B>;
};

type RequestOtions = {
  immediate: boolean;
};

const createNatsuProvider = <
  A extends NatsService<string, unknown, unknown>,
  B extends NatsChannel<string, unknown, unknown>
>({
  natsuClient,
  makeNatsuSocketClient,
}: NatsuOptions<A, B>) => {
  const natsuSocket =
    typeof window !== 'undefined' ? makeNatsuSocketClient?.() : undefined;

  const context = React.createContext({
    natsuClient,
    natsuSocket,
  });

  const NatsuProvider = (props: React.PropsWithChildren<{}>) => (
    <context.Provider
      value={{
        natsuClient,
        natsuSocket,
      }}
    >
      {props.children}
    </context.Provider>
  );

  const useNatsuClient = () => {
    const { natsuClient } = useContext(context);
    return natsuClient;
  };

  const useNatsuSocket = () => {
    const { natsuSocket } = useContext(context);
    return natsuSocket;
  };

  function useSubscribe<Subject extends B['subject']>(
    address: Subject,
    handler: (
      response: NatsPortWSResponse<
        Subject,
        Extract<B, { subject: Subject }>['response']
      >
    ) => Promise<void>,
    options: RequestOtions = { immediate: true }
  ) {
    const natsuSocket = useNatsuSocket();
    const unsubscribeRef = useRef<() => void>();

    const sub = useCallback(() => {
      const subscriber = natsuSocket?.subscribe(address, handler);
      unsubscribeRef.current = subscriber?.unsubscribe;
    }, [address]);

    const unsub = () => {
      unsubscribeRef.current?.();
      unsubscribeRef.current = undefined;
    };

    const { immediate = true } = options || {};

    useEffect(() => {
      if (immediate) {
        sub();
      }

      return () => {
        unsub();
      };
    }, [address]);

    return { sub, unsub };
  }

  const useRequest = <Subject extends A['subject']>(
    address: Subject,
    data?: Extract<A, { subject: Subject }>['request'],
    dependencies: [] = [],
    { immediate }: RequestOtions = { immediate: true }
  ) => {
    const natsuClient = useNatsuClient();

    return useAsync<Extract<A, { subject: Subject }>['request']>(
      () => natsuClient(address, data),
      [address, ...dependencies],
      {
        executeOnMount: immediate,
      }
    );
  };

  const useDefferedRequest: typeof useRequest = (address, data) => {
    return useRequest(address, data, undefined, { immediate: false });
  };

  return {
    NatsuProvider,
    useNatsuClient,
    useRequest,
    useDefferedRequest,
    useSubscribe,
  };
};

export { createNatsuProvider };
