import React, { useEffect, useState } from 'react';
import usePromise from 'react-use-promise';
import { connect, connectWS } from '@silenteer/natsu-port';
import type { HelloWorldChannel, NatsGetCareProviders } from 'example-type';

const request = connect({
  serverURL: new URL('http://localhost:8080'),
});

export function Index() {
  const [state, setState] = useState<any>();
  // const [result] = usePromise(() => {
  //   return request<NatsGetCareProviders>(
  //     'api.v2.mobile.patient.getCareProviders',
  //     {
  //       ids: ['1', '2', '3'],
  //     }
  //   );
  // }, []);

  useEffect(() => {
    const { subscribe, unsubscribe } = connectWS({
      serverURL: new URL('ws://localhost:8080'),
    });

    subscribe<HelloWorldChannel>('hello.world', (msg) => {
      setState(JSON.stringify(msg));
      return () => unsubscribe('hello.world');
    });
  }, []);

  return (
    <>
      {/* <div>{result && JSON.stringify(result)}</div> */}
      <div>Websocket {state}</div>
    </>
  );
}

export default Index;
