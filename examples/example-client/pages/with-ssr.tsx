import type { NatsGetCareProviders, NatsGetNamespace } from 'example-type';
import type { GetServerSideProps } from 'next';
import React from 'react';
import { client } from '../natsu/server';

type IndexProps = {
  value: NatsGetNamespace['response'];
};

function WithSSR(props: IndexProps) {
  return (
    <>
      <h2>Natsu Http SSR</h2>
      <br />
      {/* {props.value.map((item, index) => (
        <div key={index}>{item.name}</div>
      ))} */}
      {JSON.stringify(props.value)}
    </>
  );
}

export default WithSSR;

export const getServerSideProps: GetServerSideProps<IndexProps> = async () => {
  const value = await client.request('api.getNamespace', { subject: 'abc' });
  return {
    props: { value },
  };
};
