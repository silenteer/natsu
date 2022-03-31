import React, { useEffect, useState } from 'react';
import { connect } from '@silenteer/natsu-port';
import type { NatsGetCareProviders } from 'example-type';
import { NatsuProvider, useRequest } from '@silenteer/natsu-react';

function Index() {
  const { value, status } = useRequest<NatsGetCareProviders>('api.getCareProviders', {ids: ['1', '2', '3']})

  return (
    <>
      <h2>Natsu Http</h2>
      <br />
      <br />
      {value && value.map((item, index) => <div key={index}>{item.name}</div>)}
    </>
  );
}

function Wrapper() {
  const [request] = useState(() => connect({
    serverURL: new URL('http://localhost:8080'),
  }));

  return <NatsuProvider natsuClient={request}>
    <Index />
  </NatsuProvider>
}

export default Wrapper;
