import Natsu from 'natsu';
import { pingService, pongService } from './ping-pong';
import RequestLog from 'natsu-middlewares/request';
import ProcessTime from 'natsu-middlewares/processTime';
import type { PingService } from 'example-type';

async function main() {
  const { request } = await Natsu({
    codec: 'json',
    middlewares: [RequestLog, ProcessTime],
    units: [pingService, pongService],
  });

  request<PingService>('ping');
}

main();
