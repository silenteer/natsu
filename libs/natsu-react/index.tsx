import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import type { NatsuClient, NatsuSocketClient } from '@silenteer/natsu-port';
import type {
  NatsChannel,
  NatsPortWSResponse,
  NatsService,
} from '@silenteer/natsu-type';
import useAsync from './useAsync';

type NatsuContextProps = {
  natsuClient?: NatsuClient;
  natsuSocketClient?: NatsuSocketClient;
};
const NatsuContext = React.createContext<NatsuContextProps | undefined>(
  undefined
);

function useNatsuClient() {
  const context = useContext(NatsuContext);

  if (context === undefined) {
    throw new Error('Context cannot be used without Provider');
  }

  if (context.natsuClient === undefined) {
    throw new Error('natsuClient seems to be undefined in the Provider');
  }

  return context.natsuClient as NatsuClient;
}

function useNatsuSocketClient() {
  const context = useContext(NatsuContext);

  if (context === undefined) {
    throw new Error('Context cannot be used without Provider');
  }

  if (context.natsuSocketClient === undefined) {
    throw new Error('natsuSocketClient seems to be undefined in the Provider');
  }

  return context.natsuSocketClient as NatsuSocketClient;
}

function useRequest<TService extends NatsService<string, unknown, unknown>>(
  address: TService['subject'],
  data?: TService['request'],
  options: { immediate: boolean } = { immediate: true }
) {
  const natsuClient = useNatsuClient();
  const call = useCallback(
    () => natsuClient<TService>(address, data),
    [address, data]
  );

  return useAsync(call, options.immediate);
}

function useDefferedRequest<
  TService extends NatsService<string, unknown, unknown>
>(
  address: TService['subject'],
  data?: TService['request'],
  options: { immediate: boolean } = { immediate: false }
) {
  const natsuClient = useNatsuClient();
  const call = useCallback(
    () => natsuClient<TService>(address, data),
    [address, data]
  );

  return useAsync(call, options.immediate);
}

type SubscribeOption = {
  immediate?: boolean;
};

function useSubscribe<TChannel extends NatsChannel<string, unknown, unknown>>(
  address: TChannel['subject'],
  handler: (
    nextMsg: NatsPortWSResponse<TChannel['subject'], TChannel['response']>
  ) => Promise<void>,
  options: SubscribeOption = { immediate: true }
) {
  const natsuSocketClient = useNatsuSocketClient();
  const unsubscribeRef = useRef<() => void>();

  const sub = useCallback(() => {
    const subscriber = natsuSocketClient.subscribe(address, handler);
    unsubscribeRef.current = subscriber.unsubscribe;
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

export type NatsuProviderOptions = React.PropsWithChildren<{
  natsuClient?: NatsuClient;
  makeNatsuSocketClient?: () => NatsuSocketClient;
}>;

const isOnBrowser = typeof window !== 'undefined';

function NatsuProvider({
  natsuClient,
  children,
  makeNatsuSocketClient,
}: NatsuProviderOptions) {
  const [natsuSocketClient] = useState<NatsuSocketClient | undefined>(() => {
    if (!isOnBrowser) {
      return undefined;
    }

    return makeNatsuSocketClient?.();
  });

  useEffect(() => {
    return () => natsuSocketClient?.close();
  }, [natsuSocketClient]);

  return (
    <NatsuContext.Provider value={{ natsuClient, natsuSocketClient }}>
      {children}
    </NatsuContext.Provider>
  );
}

export {
  useNatsuClient,
  useNatsuSocketClient,
  NatsuProvider,
  useRequest,
  useSubscribe,
  useDefferedRequest,
};
