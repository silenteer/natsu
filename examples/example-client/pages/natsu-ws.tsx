import React, { useState } from 'react';
import { connect, connectWS } from '@silenteer/natsu-port';
import type {
  NatsHelloNamespaceChannel,
  NatsHelloNamespace,
} from 'example-type';
import {
  NatsuProvider,
  useDefferedRequest,
  useSubscribe,
} from '@silenteer/natsu-react';

// To assume user has user info in headers after authenticated, we generate userId then add it to headers
const userId01 = Date.now().toString();
const userId02 = (Date.now() + 60000).toString();

const request01 = connect({
  serverURL: new URL('http://localhost:8080'),
  headers: {
    'user-id': userId01,
  },
});

const request02 = connect({
  serverURL: new URL('http://localhost:8080'),
  headers: {
    'user-id': userId02,
  },
});

function Socket({ name }: { name: string }) {
  const [messages, setMessages] = useState<string[]>();
  const sendHello =
    useDefferedRequest<NatsHelloNamespace>('api.helloNamespace');
  const subscriber = useSubscribe<NatsHelloNamespaceChannel>(
    'ws.helloNamespace',
    async (nextMsg) => {
      setMessages((prevState) => [...(prevState || []), nextMsg.body.message]);
    }
  );

  return (
    <>
      <button onClick={() => sendHello.execute()}>
        Send a message to {name}
      </button>
      <br />

      <button onClick={() => subscriber.unsub()}>Unsubscribe for {name}</button>
      <br />
      <button onClick={() => subscriber.sub()}>Subscribe for {name}</button>
      <hr />

      <h2>Messages of {name}</h2>
      {messages && (
        <ol>
          {messages.map((message, index) => (
            <li key={index}>{message}</li>
          ))}
        </ol>
      )}
      <hr />
    </>
  );
}

function Wrapper() {
  return (
    <>
      <NatsuProvider
        natsuClient={request01}
        makeNatsuSocketClient={() =>
          connectWS({
            serverURL: new URL('ws://localhost:8080'),
            headers: {
              'user-id': userId01,
            },
          })
        }
      >
        <Socket name="User 1" />
      </NatsuProvider>

      <NatsuProvider
        natsuClient={request02}
        makeNatsuSocketClient={() =>
          connectWS({
            serverURL: new URL('ws://localhost:8080'),
            headers: {
              'user-id': userId02,
            },
          })
        }
      >
        <Socket name="User 2" />
      </NatsuProvider>
    </>
  );
}

export default Wrapper;
