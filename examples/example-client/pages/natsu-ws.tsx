import React, { useEffect, useRef, useState } from 'react';
import { connect, connectWS } from '@silenteer/natsu-port';
import type {
  NatsHelloNamespaceChannel,
  NatsHelloNamespace,
} from 'example-type';

// To assume user has user info in headers after authenticated, we generate userId then add it to headers
const userId01 = Date.now().toString();
const userId02 = (Date.now() + 60000).toString();

const request01 = connect({
  serverURL: new URL('http://0.0.0.0:8080'),
  headers: {
    'user-id': userId01,
  },
});
const request02 = connect({
  serverURL: new URL('http://0.0.0.0:8080'),
  headers: {
    'user-id': userId02,
  },
});

export function Index() {
  const [messages01, setMessages01] = useState<string[]>();
  const [messages02, setMessages02] = useState<string[]>();
  const socketRef01 = useRef<ReturnType<typeof connectWS>>();
  const socketRef02 = useRef<ReturnType<typeof connectWS>>();
  const unsubscribeRef01 = useRef<() => void>();
  const unsubscribeRef02 = useRef<() => void>();

  useEffect(() => {
    // Create socket in useEffect to avoid error when Nextjs generate page in server side
    socketRef01.current = connectWS({
      serverURL: new URL('ws://0.0.0.0:8080'),
      headers: {
        'user-id': userId01,
      },
    });
    socketRef02.current = connectWS({
      serverURL: new URL('ws://0.0.0.0:8080'),
      headers: {
        'user-id': userId02,
      },
    });

    const { unsubscribe: unsubscribe01 } =
      socketRef01.current.subscribe<NatsHelloNamespaceChannel>(
        'ws.helloNamespace',
        (response) => {
          setMessages01((prevState) => [
            ...(prevState || []),
            response.body.message,
          ]);
        }
      );
    unsubscribeRef01.current = unsubscribe01;

    const { unsubscribe: unsubscribe02 } =
      socketRef02.current.subscribe<NatsHelloNamespaceChannel>(
        'ws.helloNamespace',
        (response) => {
          setMessages02((prevState) => [
            ...(prevState || []),
            response.body.message,
          ]);
        }
      );
    unsubscribeRef02.current = unsubscribe02;

    return () => {
      unsubscribeRef01.current();
      unsubscribeRef02.current();
      socketRef01.current.close();
      socketRef02.current.close();
    };
  }, []);

  return (
    <>
      <button
        onClick={() =>
          request01<NatsHelloNamespace>('api.helloNamespace', undefined)
        }
      >
        Send a message to User01
      </button>
      <br />
      <br />
      <button
        onClick={() =>
          request02<NatsHelloNamespace>('api.helloNamespace', undefined)
        }
      >
        Send a message to User02
      </button>
      <br />
      <br />
      <button onClick={() => unsubscribeRef01.current()}>
        Unsubscribe for User01
      </button>
      <br />
      <br />
      <button onClick={() => unsubscribeRef02.current()}>
        Unsubscribe for User02
      </button>
      <br />
      <br />
      <hr />
      <h2>Messages of User01</h2>
      {messages01 && (
        <ol>
          {messages01.map((message, index) => (
            <li key={index}>{message}</li>
          ))}
        </ol>
      )}
      <hr />
      <h2>Messages of User02</h2>
      {messages02 && (
        <ol>
          {messages02.map((message, index) => (
            <li key={index}>{message}</li>
          ))}
        </ol>
      )}
    </>
  );
}

export default Index;
