#!/bin/bash

set -e

(cd nats.port && yarn && yarn build &)
(cd nats.port.server && yarn &)
(cd poc && yarn &)

wait

(cd nats.port.server && yarn ts-node src &)
SERVER=$!

(cd poc && yarn ts-node reply &)
CLIENT=$!

(cd poc && yarn next dev &)
NEXT=$!

echo $SERVER $CLIENT $NEXT

trap "{ kill $SERVER $CLIENT $NEXT }" EXIT


### Step by step

- Yarn everything
- Use `yarn build` in `nats.port` to build the lib
- Start nats.port.server by `yarn ts-node src` in `nats.port.server`
- Start replier by `yarn ts-node reply` in `poc`
- Run `yarn next dev` in `poc`

Visit `http://localhost:3000`, the result should be `hello world` reversed

Can also use curl
```
curl -X POST \
  'http://localhost:8080/' \
  -H 'Content-Type: application/json+nats' \
  -H 'nats-subject: api.test.hello' \
  -H 'Content-Type: application/json' \
  -d '{"msg": "Hello world"}'
```
