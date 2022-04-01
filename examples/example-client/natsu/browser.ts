import { connect, connectWS } from '@silenteer/natsu-port';
import { createNatsuProvider } from '@silenteer/natsu-react';

import type { Services, Channels } from './services';

const userId01 = Date.now().toString();

const {
  useRequest,
  NatsuProvider,
  useDefferedRequest,
  useNatsuClient,
  useSubscribe,
} = createNatsuProvider<Services, Channels>({
  natsuClient: connect({
    serverURL: new URL('http://localhost:8080'),
    headers: {
      'user-id': userId01,
    },
  }),
  makeNatsuSocketClient: () =>
    connectWS({
      serverURL: new URL('ws://localhost:8080'),
      headers: {
        'user-id': userId01,
      },
    }),
});

export {
  useRequest,
  NatsuProvider,
  useDefferedRequest,
  useNatsuClient,
  useSubscribe,
};
