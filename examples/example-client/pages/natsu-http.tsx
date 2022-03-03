import React, { useEffect, useState } from 'react';
import { connect } from '@silenteer/natsu-port';
import type { NatsGetCareProviders } from 'example-type';

const request = connect({
  serverURL: new URL('http://0.0.0.0:8080'),
});

export function Index() {
  const [careProviders, setCareProviders] =
    useState<NatsGetCareProviders['response']>();

  useEffect(() => {
    request<NatsGetCareProviders>('api.getCareProviders', {
      ids: ['1', '2', '3'],
    }).then((response) => setCareProviders(response));
  }, []);

  return (
    <>
      <h2>Natsu Http</h2>
      <br />
      <br />
      {careProviders && (
        <ol>
          {careProviders.map(({ id, name }) => (
            <li key={id}>{name}</li>
          ))}
        </ol>
      )}
    </>
  );
}

export default Index;
