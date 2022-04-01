import React, { useState } from 'react';
import { connect, connectWS } from '@silenteer/natsu-port';
import type {
  NatsHelloNamespaceChannel,
  NatsHelloNamespace,
  NatsGetCareProviders,
  NatsGetNamespace,
} from 'example-type';
import { createNatsuProvider } from '@silenteer/natsu-react';

// To assume user has user info in headers after authenticated, we generate userId then add it to headers
const userId01 = Date.now().toString();
const userId02 = (Date.now() + 60000).toString();

const natsu1 = createNatsuProvider({
  natsuClient: connect<
    NatsHelloNamespace | NatsGetCareProviders | NatsGetNamespace
  >({
    serverURL: new URL('http://localhost:8080'),
    headers: {
      'user-id': userId01,
    },
  }),
  makeNatsuSocketClient: () =>
    connectWS<NatsHelloNamespaceChannel>({
      serverURL: new URL('ws://localhost:8080'),
      headers: {
        'user-id': userId01,
      },
    }),
});

function Socket1() {
  const [messages, setMessages] = useState<string[]>();
  const sendHello = natsu1.useDefferedRequest('api.helloNamespace');
  const subscriber = natsu1.useSubscribe(
    'ws.helloNamespace',
    async (nextMsg) => {
      setMessages((prevState) => [...(prevState || []), nextMsg.body.message]);
    }
  );

  return (
    <>
      <button onClick={() => sendHello.execute()}>
        Send a message to Socket1
      </button>
      <button onClick={() => subscriber.unsub()}>
        Unsubscribe for Socket1
      </button>
      <button onClick={() => subscriber.sub()}>Subscribe for Socket1</button>

      <h2>Messages of Socket1</h2>
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
      <natsu1.NatsuProvider>
        <Socket1 />
      </natsu1.NatsuProvider>
    </>
  );
}

export default Wrapper;
