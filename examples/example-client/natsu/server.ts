import type { Services, Channels } from './services';
import { createClient } from '@silenteer/natsu/client';

const client = createClient<Services, Channels>({});

export { client };
