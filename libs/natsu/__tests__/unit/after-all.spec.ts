import type { NatsService as NatsServiceType } from '@silenteer/natsu-type';
import type { NatsAfterAll } from '../../type';
import NatsService from '../service/nats.service';

describe('After all stage', () => {
  let natsService: ReturnType<typeof NatsService.init>;

  beforeEach(() => {
    natsService = NatsService.init();
  });

  afterEach(async () => {
    await natsService?.stop();
  });

  it('afterAll failed, respondError will execute', async () => {
    const order: string[] = [];
    const middlewareAfterAll: NatsAfterAll<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, result, injection) => {
      order.push('middleware.validate.01.afterAll');
      return injection.error({ data, result, injection, errors: new Error() });
    };
    const handlerRespondError = jest.fn(async () => {
      order.push('handler.validate.01.respondError');
    });

    natsService.register([
      {
        subject: 'handler.afterAll.01',
        validate: undefined,
        authorize: undefined,
        handle: undefined,
        middlewares: [
          {
            id: 'middleware.validate.01',
            getActions: async () => {
              return {
                afterAll: middlewareAfterAll,
              };
            },
          },
        ],
        respondError: handlerRespondError,
      },
    ]);
    await natsService.start();

    await natsService.request({
      subject: 'handler.afterAll.01',
      data: { code: 200 },
    });

    expect(order).toHaveLength(2);
    expect(order[0]).toEqual('middleware.validate.01.afterAll');
    expect(order[1]).toEqual('handler.validate.01.respondError');
  });

  it('afterAll failed in middle, respondError will execute', async () => {
    const order: string[] = [];
    const middlewareAfterAll01: NatsAfterAll<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, result, injection) => {
      order.push('middleware.validate.01.afterAll');
      return injection.ok({ data, result, injection });
    };
    const middlewareAfterAll02: NatsAfterAll<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, result, injection) => {
      order.push('middleware.validate.02.afterAll');
      return injection.error({ data, result, injection, errors: new Error() });
    };
    const middlewareAfterAll03: NatsAfterAll<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, result, injection) => {
      order.push('middleware.validate.03.afterAll');
      return injection.error({ data, result, injection, errors: new Error() });
    };
    const handlerRespondError = jest.fn(async () => {
      order.push('handler.validate.01.respondError');
    });

    natsService.register([
      {
        subject: 'handler.afterAll.01',
        validate: undefined,
        authorize: undefined,
        handle: undefined,
        middlewares: [
          {
            id: 'middleware.validate.01',
            getActions: async () => {
              return {
                afterAll: middlewareAfterAll01,
              };
            },
          },
          {
            id: 'middleware.validate.02',
            getActions: async () => {
              return {
                afterAll: middlewareAfterAll02,
              };
            },
          },
          {
            id: 'middleware.validate.03',
            getActions: async () => {
              return {
                afterAll: middlewareAfterAll03,
              };
            },
          },
        ],
        respondError: handlerRespondError,
      },
    ]);
    await natsService.start();

    await natsService.request({
      subject: 'handler.afterAll.01',
      data: { code: 200 },
    });

    expect(order).toHaveLength(3);
    expect(order[0]).toEqual('middleware.validate.01.afterAll');
    expect(order[1]).toEqual('middleware.validate.02.afterAll');
    expect(order[2]).toEqual('handler.validate.01.respondError');
  });
});
