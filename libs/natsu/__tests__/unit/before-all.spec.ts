import type { NatsService as NatsServiceType } from '@silenteer/natsu-type';
import type { NatsBeforeAll, NatsBeforeValidate } from '../../type';
import NatsService from '../service/nats.service';

describe('Before all stage', () => {
  let natsService: ReturnType<typeof NatsService.init>;

  beforeEach(() => {
    natsService = NatsService.init();
  });

  afterEach(async () => {
    await natsService?.stop();
  });

  it('beforeAll failed, beforeValidate wont execute, respondError will execute', async () => {
    const order: string[] = [];
    const middlewareBeforeAll: NatsBeforeAll<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, injection) => {
      order.push('middleware.validate.01.beforeAll');
      return injection.error({ data, injection, errors: new Error() });
    };
    const middlewareBeforeValidate: NatsBeforeValidate<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, injection) => {
      order.push('middleware.validate.01.beforeValidate');
      return injection.ok({ data, injection });
    };
    const handlerRespondError = jest.fn(async () => {
      order.push('handler.validate.01.respondError');
    });

    natsService.register([
      {
        subject: 'handler.beforeAll.01',
        validate: undefined,
        authorize: undefined,
        handle: undefined,
        middlewares: [
          {
            id: 'middleware.validate.01',
            init: async () => {
              return {
                beforeAll: middlewareBeforeAll,
                beforeValidate: middlewareBeforeValidate,
              };
            },
          },
        ],
        respondError: handlerRespondError,
      },
    ]);
    await natsService.start();

    await natsService.request({
      subject: 'handler.beforeAll.01',
      data: { code: 200 },
    });

    expect(order).toHaveLength(2);
    expect(order[0]).toEqual('middleware.validate.01.beforeAll');
    expect(order[1]).toEqual('handler.validate.01.respondError');
  });

  it('beforeAll failed in middle, beforeValidate wont execute, respondError will execute', async () => {
    const order: string[] = [];
    const middlewareBeforeAll01: NatsBeforeAll<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, injection) => {
      order.push('middleware.validate.01.beforeAll');
      return injection.ok({ data, injection });
    };
    const middlewareBeforeAll02: NatsBeforeAll<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, injection) => {
      order.push('middleware.validate.02.beforeAll');
      return injection.error({ data, injection, errors: new Error() });
    };
    const middlewareBeforeAll03: NatsBeforeAll<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, injection) => {
      order.push('middleware.validate.03.beforeAll');
      return injection.ok({ data, injection });
    };
    const middlewareBeforeValidate01: NatsBeforeValidate<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, injection) => {
      order.push('middleware.validate.01.beforeValidate');
      return injection.ok({ data, injection });
    };
    const handlerRespondError = jest.fn(async () => {
      order.push('handler.validate.01.respondError');
    });

    natsService.register([
      {
        subject: 'handler.beforeAll.01',
        validate: undefined,
        authorize: undefined,
        handle: undefined,
        middlewares: [
          {
            id: 'middleware.validate.01',
            init: async () => {
              return {
                beforeAll: middlewareBeforeAll01,
                beforeValidate: middlewareBeforeValidate01,
              };
            },
          },
          {
            id: 'middleware.validate.02',
            init: async () => {
              return {
                beforeAll: middlewareBeforeAll02,
              };
            },
          },
          {
            id: 'middleware.validate.03',
            init: async () => {
              return {
                beforeAll: middlewareBeforeAll03,
              };
            },
          },
        ],
        respondError: handlerRespondError,
      },
    ]);
    await natsService.start();

    await natsService.request({
      subject: 'handler.beforeAll.01',
      data: { code: 200 },
    });

    expect(order).toHaveLength(3);
    expect(order[0]).toEqual('middleware.validate.01.beforeAll');
    expect(order[1]).toEqual('middleware.validate.02.beforeAll');
    expect(order[2]).toEqual('handler.validate.01.respondError');
  });

  it('beforeAll successed, beforeValidate will execute', async () => {
    const order: string[] = [];
    const middlewareBeforeAll: NatsBeforeAll<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, injection) => {
      order.push('middleware.validate.01.beforeAll');
      return injection.ok({ data, injection });
    };
    const middlewareBeforeValidate: NatsBeforeValidate<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, injection) => {
      order.push('middleware.validate.01.beforeValidate');
      return injection.ok({ data, injection });
    };

    natsService.register([
      {
        subject: 'handler.beforeAll.01',
        validate: undefined,
        authorize: undefined,
        handle: undefined,
        middlewares: [
          {
            id: 'middleware.validate.01',
            init: async () => {
              return {
                beforeAll: middlewareBeforeAll,
                beforeValidate: middlewareBeforeValidate,
              };
            },
          },
        ],
      },
    ]);
    await natsService.start();

    await natsService.request({
      subject: 'handler.beforeAll.01',
      data: { code: 200 },
    });

    expect(order).toHaveLength(2);
    expect(order[0]).toEqual('middleware.validate.01.beforeAll');
    expect(order[1]).toEqual('middleware.validate.01.beforeValidate');
  });
});
