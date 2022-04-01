import { createNatsuProvider } from '@silenteer/natsu-react';
import { connect } from '@silenteer/natsu-port';
import React from 'react';
import { useState } from 'react';
import { QueryClientProvider, QueryClient, useQuery } from 'react-query';
import type { NatsGetCareProviders, NatsGetNamespace } from 'example-type';

function WithReactQuery() {
  const request = natsu.useNatsuClient();
  const result = useQuery('test', () =>
    request('api.getCareProviders',  {ids: ['1']})
  );

  return (
    <>
      {result.data?.map((item, index) => (
        <div key={index}>{item.name}</div>
      ))}
    </>
  );
}

const natsu = createNatsuProvider({
  natsuClient: connect<NatsGetCareProviders | NatsGetNamespace>({ serverURL: new URL('http://localhost:8080') })
})

export default function Wrapper() {
  const [client] = useState(() => new QueryClient());

  return (
    <>
      <QueryClientProvider client={client}>
        <natsu.NatsuProvider>
          <WithReactQuery />
          </natsu.NatsuProvider>
      </QueryClientProvider>
    </>
  );
}
