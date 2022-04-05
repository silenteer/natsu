import type { NatsGetCareProviders } from 'example-type';
import type { GetServerSideProps } from 'next';
import React from 'react';
import { client } from '../natsu/server';

type IndexProps = {
  value: NatsGetCareProviders['response'];
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
  const value = await client.request('api.getCareProviders', {
    ids: ['1', '2'],
  });
  return {
    props: { value },
  };
};
