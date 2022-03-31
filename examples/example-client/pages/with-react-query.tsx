import { NatsuProvider, useNatsuClient, useRequest } from '@silenteer/natsu-react';
import { connect } from '@silenteer/natsu-port';

import { useState } from 'react';
import { QueryClientProvider, QueryClient, useQuery } from 'react-query';
import { NatsGetCareProviders } from 'example-type';

function WithReactQuery() {
  const request = useNatsuClient();
  const result = useQuery('test', () => request<NatsGetCareProviders>('api.getCareProviders', { ids: ['1', '2', '3'] }));

  return <>
    {result?.data.map((item, index) => <div key={index}>{item.name}</div>)}
  </>
}

export default function Wrapper() {
  const [client] = useState(() => new QueryClient());
  const [natsu] = useState(() => connect({ serverURL: new URL('http://localhost:8080') }))
  return <>
    <QueryClientProvider client={client}>
      <NatsuProvider natsuClient={natsu}>
        <WithReactQuery />
      </NatsuProvider>
    </QueryClientProvider>
  </>
}