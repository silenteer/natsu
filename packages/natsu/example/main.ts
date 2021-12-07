import Natsu from '../unit';
import { pingService, pongService } from '../example/ping-pong';
import RequestLog from '../middlewares/request';
import ProcessTime from '../middlewares/processTime';
import type { PingService } from '../example/service.types';

async function main() {
  const { request } = await Natsu({
    codec: 'json',
    middlewares: [RequestLog, ProcessTime],
    units: [pingService, pongService],
  });

  request<PingService>({ subject: 'ping', codec: 'string' });
}

main();
