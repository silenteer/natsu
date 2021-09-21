import React from 'react';
import usePromise from 'react-use-promise';
import { connect } from '@silenteer/natsu-port';
import type { NatsGetCareProviders } from '@silenteer/example-type';

const request = connect({
  serverURL: new URL('http://localhost:8080'),
});

export function Index() {
  const [result] = usePromise(() => {
    return request<NatsGetCareProviders>(
      'api.v2.mobile.patient.getCareProviders',
      {
        ids: ['1', '2', '3'],
      }
    );
  }, []);

  return <div>{result && JSON.stringify(result)}</div>;
}

export default Index;
