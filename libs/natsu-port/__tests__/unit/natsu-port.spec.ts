import { rest } from 'msw';
import type {
  NatsService,
  NatsPortErrorResponse,
  NatsPortResponse,
} from '@silenteer/natsu-type';
import Server from '../utility/server';
import type { NatsPortError } from '../../index';
import { connect } from '../../index';

type NatsTestService = NatsService<
  'api.test',
  { data: string },
  { data: string }
>;

const request = connect({ serverURL: new URL('http://localhost:8080') });

describe('Provide a mocked server will respond data for request which has correct headers & body', () => {
  beforeAll(() => {
    Server.use(
      rest.post('*', (req, res, ctx) => {
        if (
          req.body['data']['data'] !== 'data' ||
          req.headers.get('Content-Type') !== 'application/json' ||
          req.headers.get('nats-subject') !== 'api.test'
        ) {
          const response: NatsPortErrorResponse = { code: 400 };
          return res(ctx.json(response));
        }

        const response: NatsPortResponse = {
          code: 200,
          body: { data: 'data' },
        };
        return res(ctx.json(response));
      })
    );
  });

  it('natsu port send request, it will receive response contains data', async () => {
    await expect(
      request<NatsTestService>('api.test', { data: 'data' })
    ).resolves.toMatchObject({ data: 'data' });
  });
});

describe('Provide a mocked server will respond error for request', () => {
  beforeAll(() => {
    Server.use(
      rest.post('*', (req, res, ctx) => {
        const { data } = req.body['data'];

        for (const errorCode of [400, 401, 403, 404, 500]) {
          if (parseInt(data) === errorCode) {
            const response: NatsPortErrorResponse = {
              code: errorCode as NatsPortErrorResponse['code'],
            };
            return res(ctx.json(response));
          }
        }

        return res(ctx.status(400));
      })
    );
  });

  it('natsu port send request, it will receive response contains data', async () => {
    for (const errorCode of [400, 401, 403, 404, 500]) {
      await expect(
        request<NatsTestService>('api.test', { data: `${errorCode}` })
      ).rejects.toThrowError({
        code: errorCode,
        message: 'Request failed',
      } as NatsPortError);
    }
  });
});
