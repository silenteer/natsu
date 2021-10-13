import React, { useEffect, useRef, useState } from 'react';
import { connect, connectWS } from '@silenteer/natsu-port';
import type { HelloWorldChannel, NatsGetCareProviders } from 'example-type';

const request = connect({
  serverURL: new URL('http://localhost:8080'),
});

export function Index() {
  const [state, setState] = useState<any>();
  const [result, setResult] = useState<Array<{ id: string; name: string }>>();
  const wsRef = useRef<ReturnType<typeof connectWS>>();

  useEffect(() => {
    wsRef.current = connectWS({
      serverURL: new URL('ws://localhost:8080'),
    });

    wsRef.current.subscribe<HelloWorldChannel>('hello.world', (response) => {
      console.log(response);
      setState(response);
    });

    return () => wsRef.current.unsubscribe<HelloWorldChannel>('hello.world');
  }, []);

  const loadData = () => {
    request<NatsGetCareProviders>('api.v2.mobile.patient.getCareProviders', {
      ids: ['1', '2', '3'],
    }).then((result) => setResult(result));
  };

  const unsubscribe = () => {
    setState(undefined);
    wsRef.current.unsubscribe<HelloWorldChannel>('hello.world');
  };

  const clsoe = () => {
    setState(undefined);
    wsRef.current.close();
  };

  return (
    <>
      <button onClick={loadData}>Load data</button>
      <br />
      <br />
      <button onClick={unsubscribe}>Unsubscribe</button>
      <br />
      <br />
      <button onClick={clsoe}>Close</button>
      <br />
      <br />
      <div>{result && JSON.stringify(result)}</div>
      <div>Websocket {state && JSON.stringify(state)}</div>
    </>
  );
}

export default Index;
