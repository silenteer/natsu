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
  const unsubscribeRef1 = useRef<() => void>();
  const unsubscribeRef2 = useRef<() => void>();

  useEffect(() => {
    wsRef.current = connectWS({
      serverURL: new URL('ws://localhost:8080'),
    });

    const { unsubscribe: unsubscribe1 } =
      wsRef.current.subscribe<HelloWorldChannel>('hello.world', (response) => {
        console.log('response1', `${response.body.msg}:01`);
        setState((prevState) => [...(prevState || []), response]);
      });

    const { unsubscribe: unsubscribe2 } =
      wsRef.current.subscribe<HelloWorldChannel>('hello.world', (response) => {
        console.log('response2', `${response.body.msg}:02`);
        setState((prevState) => [...(prevState || []), response]);
      });

    unsubscribeRef1.current = unsubscribe1;
    unsubscribeRef2.current = unsubscribe2;
    return () => {
      unsubscribe1();
      unsubscribe2();
    };
  }, []);

  const loadData = () => {
    request<NatsGetCareProviders>('api.v2.mobile.patient.getCareProviders', {
      ids: ['1', '2', '3'],
    }).then((result) => setResult(result));
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
      <button onClick={() => unsubscribeRef1.current()}>Unsubscribe 1</button>
      <br />
      <br />
      <button onClick={() => unsubscribeRef2.current()}>Unsubscribe 2</button>
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
