import React from 'react';
import { useRequest, NatsuProvider } from '../natsu/browser';

function Index() {
  const data = useRequest('api.getCareProviders', { ids: ['1', '2'] });

  return (
    <>
      <h2>Natsu Http</h2>
      <br />
      <br />
      {JSON.stringify(data?.result)}
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
