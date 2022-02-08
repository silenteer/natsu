import React, { useEffect } from 'react';
import { connect } from '@silenteer/natsu-port';
import type { NatsErrorFunction } from 'example-type';

const request = connect({
  serverURL: new URL('http://localhost:8080'),
});

export function Index() {
  useEffect(() => {
    request<NatsErrorFunction>('api.errorFunction', undefined)
      .then((response) => console.log(response))
      .catch((error) => console.log(error));
  }, []);

  return (
    <>
      <h2>Natsu Sentry</h2>
      <p>An error in backend will be captured in Sentry</p>
    </>
  );
}

export default Index;
