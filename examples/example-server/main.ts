// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config();

import NatsPortServer from '@silenteer/natsu-port-server';

NatsPortServer.start();
