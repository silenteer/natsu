import React from 'react';
import Link from 'next/link';

export function Index() {
  return (
    <>
      <h2>Examples</h2>
      <br />
      <br />
      <ul>
        <li>
          <Link href="/natsu-http">
            <a>Natsu Http</a>
          </Link>
        </li>
        <li>
          <Link href="/natsu-ws">
            <a>Natsu Websocket</a>
          </Link>
        </li>
        <li>
          <Link href="/with-react-query">
            <a>Natsu with React Query</a>
          </Link>
        </li>
        <li>
          <Link href="/with-ssr">
            <a>Natsu with SSR</a>
          </Link>
        </li>
      </ul>
    </>
  );
}

export default Index;
