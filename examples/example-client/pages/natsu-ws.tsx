import React, { useState } from 'react';

import {
  NatsuProvider,
  useDefferedRequest,
  useSubscribe,
  NatsuProvider2,
  useDefferedRequest2,
  useSubscribe2,
} from '../natsu/browser';

function Socket1() {
  const [messages, setMessages] = useState<string[]>();
  const sendHello = useDefferedRequest('api.helloNamespace');
  const subscriber = useSubscribe('ws.helloNamespace', async (nextMsg) => {
    setMessages((prevState) => [...(prevState || []), nextMsg.body.message]);
  });

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

function Socket2() {
  const [messages, setMessages] = useState<string[]>();
  const sendHello = useDefferedRequest2('api.helloNamespace');
  const subscriber = useSubscribe2('ws.helloNamespace', async (nextMsg) => {
    setMessages((prevState) => [...(prevState || []), nextMsg.body.message]);
  });

  return (
    <>
      <button onClick={() => sendHello.execute()}>
        Send a message to Socket2
      </button>
      <button onClick={() => subscriber.unsub()}>
        Unsubscribe for Socket2
      </button>
      <button onClick={() => subscriber.sub()}>Subscribe for Socket2</button>

      <h2>Messages of Socket2</h2>
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
      <NatsuProvider>
        <Socket1 />
      </NatsuProvider>
      <NatsuProvider2>
        <Socket2 />
      </NatsuProvider2>
    </>
  );
}

export default Wrapper;
