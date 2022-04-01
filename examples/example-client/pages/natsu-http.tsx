import React from 'react';
import { connect } from '@silenteer/natsu-port';
import type { NatsGetCareProviders } from 'example-type';
import { createNatsuProvider } from '@silenteer/natsu-react';

const { useRequest, NatsuProvider } = createNatsuProvider({
  natsuClient: connect<NatsGetCareProviders>({
    serverURL: new URL('http://localhost:8080'),
  }),
});

function Index() {
  const data = useRequest('api.getCareProviders', {
    ids: ['1', '2', '3'],
  });

  return (
    <>
      <h2>Natsu Http</h2>
      <br />
      <br />
      {data.status === 'success' &&
        data.value.map((item, index) => <div key={index}>{item.name}</div>)}
    </>
  );
}

function Wrapper() {
  return (
    <NatsuProvider>
      <Index />
    </NatsuProvider>
  );
}

export default Wrapper;
