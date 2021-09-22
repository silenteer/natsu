There're ways to start natsu-port-server

**Start via cli**

This's simplest way to start the server, just run command with arguments for configuration
```
natsu-port-server --nats-uri localhost:2222 --nats-auth-subjects=abc,xyz --nats-non-auth-subjects=nmc,xpoi --server-port=4848 --server-path=/addc
```

Or write configuration in a js file then run command
```
natsu-port-server --config=./config.js
```
```
// config.js

module.exports = {
  NATS_AUTH_SUBJECTS=api.auth.adapt,api.auth.validate
};

```

**Import & start**

You may create a file `.env` to contains configuration for the server
```
NATS_AUTH_SUBJECTS=api.auth.adapt,api.auth.validate
```

Use `dotenv`(or another) to load `.env` into `process.env` then import the server and start
```
require('dotenv').config();

import NatsPortServer from '@silenteer/natsu-port-server';

NatsPortServer.start();
```

**Help**

If you want to get guide, run this command
```
natsu-port-server --help
```