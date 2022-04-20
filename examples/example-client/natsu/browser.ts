import { connect, connectWS } from '@silenteer/natsu-port';
import { createNatsuProvider } from '@silenteer/natsu-react';

import type { Services, Channels } from './services';

const userId01 = 'user-01' + Date.now().toString();

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

const userId02 = 'user-01' + Date.now().toString();
const {
  useRequest: useRequest2,
  NatsuProvider: NatsuProvider2,
  useDefferedRequest: useDefferedRequest2,
  useNatsuClient: useNatsuClient2,
  useSubscribe: useSubscribe2,
} = createNatsuProvider<Services, Channels>({
  natsuClient: connect({
    serverURL: new URL('http://localhost:8080'),
    headers: {
      'user-id': userId02,
    },
  }),
  makeNatsuSocketClient: () =>
    connectWS({
      serverURL: new URL('ws://localhost:8080'),
      headers: {
        'user-id': userId02,
      },
    }),
});

export {
  useRequest,
  NatsuProvider,
  useDefferedRequest,
  useNatsuClient,
  useSubscribe,
  useRequest2,
  NatsuProvider2,
  useDefferedRequest2,
  useNatsuClient2,
  useSubscribe2,
};
