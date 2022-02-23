import type { NatsService as NatsServiceType } from '@silenteer/natsu-type';
import type {
  NatsBeforeValidate,
  NatsValidate,
  NatsAfterValidate,
} from '../../type';
import NatsService from '../service/nats.service';

describe('Validation stage', () => {
  let natsService: ReturnType<typeof NatsService.init>;

  beforeEach(() => {
    natsService = NatsService.init();
  });

  afterEach(async () => {
    await natsService?.stop();
  });

  it('beforeValidate & validate & afterValidate will execute orderly', async () => {
    const order: string[] = [];
    const handlerValidate: NatsValidate<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, injection) => {
      order.push('handler.validate.01');
      return injection.ok({ data });
    };
    const middlewareBeforeValidate: NatsBeforeValidate<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, injection) => {
      order.push('middleware.validate.01.beforeValidate');
      return injection.ok({ data, injection });
    };
    const middlewareAfterValidate: NatsAfterValidate<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, injection) => {
      order.push('middleware.validate.01.afterValidate');
      return injection.ok({ data, injection });
    };

    natsService.register([
      {
        subject: 'handler.validate.01',
        validate: handlerValidate,
        authorize: undefined,
        handle: undefined,
        middlewares: [
          {
            id: 'middleware.validate.01',
            getActions: async () => {
              return {
                beforeValidate: middlewareBeforeValidate,
                afterValidate: middlewareAfterValidate,
              };
            },
          },
        ],
      },
    ]);
    await natsService.start();

    await natsService.request({
      subject: 'handler.validate.01',
      data: { code: 200 },
    });

    expect(order).toHaveLength(3);
    expect(order[0]).toEqual('middleware.validate.01.beforeValidate');
    expect(order[1]).toEqual('handler.validate.01');
    expect(order[2]).toEqual('middleware.validate.01.afterValidate');
  });

  it('beforeValidate failed, validate & afterValidate wont execute, respondError will execute', async () => {
    const order: string[] = [];
    const handlerValidate: NatsValidate<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, injection) => {
      order.push('handler.validate.01');
      return injection.ok({ data });
    };
    const middlewareBeforeValidate: NatsBeforeValidate<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, injection) => {
      order.push('middleware.validate.01.beforeValidate');
      return injection.error({ data, injection, errors: new Error() });
    };
    const middlewareAfterValidate: NatsAfterValidate<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, injection) => {
      order.push('middleware.validate.01.afterValidate');
      return injection.ok({ data, injection });
    };
    const handlerRespondError = jest.fn(async () => {
      order.push('handler.validate.01.respondError');
    });

    natsService.register([
      {
        subject: 'handler.validate.01',
        validate: handlerValidate,
        authorize: undefined,
        handle: undefined,
        middlewares: [
          {
            id: 'middleware.validate.01',
            getActions: async () => {
              return {
                beforeValidate: middlewareBeforeValidate,
                afterValidate: middlewareAfterValidate,
              };
            },
          },
        ],
        respondError: handlerRespondError,
      },
    ]);
    await natsService.start();

    await natsService.request({
      subject: 'handler.validate.01',
      data: { code: 200 },
    });

    expect(order).toHaveLength(2);
    expect(order[0]).toEqual('middleware.validate.01.beforeValidate');
    expect(order[1]).toEqual('handler.validate.01.respondError');
  });

  it('beforeValidate successed, validate failed, afterValidate wont execute, respondError will execute', async () => {
    const order: string[] = [];
    const handlerValidate: NatsValidate<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, injection) => {
      order.push('handler.validate.01');
      return injection.error({ data, errors: new Error() });
    };
    const middlewareBeforeValidate: NatsBeforeValidate<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, injection) => {
      order.push('middleware.validate.01.beforeValidate');
      return injection.ok({ data, injection });
    };
    const middlewareAfterValidate: NatsAfterValidate<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, injection) => {
      order.push('middleware.validate.01.afterValidate');
      return injection.ok({ data, injection });
    };
    const handlerRespondError = jest.fn(async () => {
      order.push('handler.validate.01.respondError');
    });

    natsService.register([
      {
        subject: 'handler.validate.01',
        validate: handlerValidate,
        authorize: undefined,
        handle: undefined,
        middlewares: [
          {
            id: 'middleware.validate.01',
            getActions: async () => {
              return {
                beforeValidate: middlewareBeforeValidate,
                afterValidate: middlewareAfterValidate,
              };
            },
          },
        ],
        respondError: handlerRespondError,
      },
    ]);
    await natsService.start();

    await natsService.request({
      subject: 'handler.validate.01',
      data: { code: 200 },
    });

    expect(order).toHaveLength(3);
    expect(order[0]).toEqual('middleware.validate.01.beforeValidate');
    expect(order[1]).toEqual('handler.validate.01');
    expect(order[2]).toEqual('handler.validate.01.respondError');
  });

  it('beforeValidate failed in middle, validate & afterValidate wont execute, respondError will execute', async () => {
    const order: string[] = [];
    const handlerValidate: NatsValidate<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, injection) => {
      order.push('handler.validate.01');
      return injection.ok({ data });
    };
    const middlewareBeforeValidate01: NatsBeforeValidate<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, injection) => {
      order.push('middleware.validate.01.beforeValidate');
      return injection.ok({ data, injection });
    };
    const middlewareBeforeValidate02: NatsBeforeValidate<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, injection) => {
      order.push('middleware.validate.02.beforeValidate');
      return injection.error({ data, injection, errors: new Error() });
    };
    const middlewareBeforeValidate03: NatsBeforeValidate<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, injection) => {
      order.push('middleware.validate.03.beforeValidate');
      return injection.ok({ data, injection });
    };
    const middlewareAfterValidate: NatsAfterValidate<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, injection) => {
      order.push('middleware.validate.01.afterValidate');
      return injection.ok({ data, injection });
    };
    const handlerRespondError = jest.fn(async () => {
      order.push('handler.validate.01.respondError');
    });

    natsService.register([
      {
        subject: 'handler.validate.01',
        validate: handlerValidate,
        authorize: undefined,
        handle: undefined,
        middlewares: [
          {
            id: 'middleware.validate.01',
            getActions: async () => {
              return {
                beforeValidate: middlewareBeforeValidate01,
                afterValidate: middlewareAfterValidate,
              };
            },
          },
          {
            id: 'middleware.validate.02',
            getActions: async () => {
              return {
                beforeValidate: middlewareBeforeValidate02,
              };
            },
          },
          {
            id: 'middleware.validate.03',
            getActions: async () => {
              return {
                beforeValidate: middlewareBeforeValidate03,
              };
            },
          },
        ],
        respondError: handlerRespondError,
      },
    ]);
    await natsService.start();

    await natsService.request({
      subject: 'handler.validate.01',
      data: { code: 200 },
    });

    expect(order).toHaveLength(3);
    expect(order[0]).toEqual('middleware.validate.01.beforeValidate');
    expect(order[1]).toEqual('middleware.validate.02.beforeValidate');
    expect(order[2]).toEqual('handler.validate.01.respondError');
  });

  it('beforeValidate & validate successed, afterValidate failed in middle, respondError will execute', async () => {
    const order: string[] = [];
    const handlerValidate: NatsValidate<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, injection) => {
      order.push('handler.validate.01');
      return injection.ok({ data });
    };
    const middlewareBeforeValidate: NatsBeforeValidate<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, injection) => {
      order.push('middleware.validate.01.beforeValidate');
      return injection.ok({ data, injection });
    };
    const middlewareAfterValidate01: NatsAfterValidate<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, injection) => {
      order.push('middleware.validate.01.afterValidate');
      return injection.ok({ data, injection });
    };
    const middlewareAfterValidate02: NatsAfterValidate<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, injection) => {
      order.push('middleware.validate.02.afterValidate');
      return injection.error({ data, injection, errors: new Error() });
    };
    const middlewareAfterValidate03: NatsAfterValidate<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, injection) => {
      order.push('middleware.validate.03.afterValidate');
      return injection.ok({ data, injection });
    };
    const handlerRespondError = jest.fn(async () => {
      order.push('handler.validate.01.respondError');
    });

    natsService.register([
      {
        subject: 'handler.validate.01',
        validate: handlerValidate,
        authorize: undefined,
        handle: undefined,
        middlewares: [
          {
            id: 'middleware.validate.01',
            getActions: async () => {
              return {
                beforeValidate: middlewareBeforeValidate,
                afterValidate: middlewareAfterValidate01,
              };
            },
          },
          {
            id: 'middleware.validate.02',
            getActions: async () => {
              return {
                afterValidate: middlewareAfterValidate02,
              };
            },
          },
          {
            id: 'middleware.validate.03',
            getActions: async () => {
              return {
                afterValidate: middlewareAfterValidate03,
              };
            },
          },
        ],
        respondError: handlerRespondError,
      },
    ]);
    await natsService.start();

    await natsService.request({
      subject: 'handler.validate.01',
      data: { code: 200 },
    });

    expect(order).toHaveLength(5);
    expect(order[0]).toEqual('middleware.validate.01.beforeValidate');
    expect(order[1]).toEqual('handler.validate.01');
    expect(order[2]).toEqual('middleware.validate.01.afterValidate');
    expect(order[3]).toEqual('middleware.validate.02.afterValidate');
    expect(order[4]).toEqual('handler.validate.01.respondError');
  });

  it('Data will be changed while go through beforeValidate, afterValidate', async () => {
    const changes: Array<{ input: unknown; output: unknown }> = [];
    const handlerValidate: NatsValidate<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, injection) => {
      changes.push({ input: data.body, output: data.body });
      return injection.ok({ data });
    };
    const middlewareBeforeValidate01: NatsBeforeValidate<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, injection) => {
      const changedData = {
        ...data,
        body: 'middleware.validate.01.beforeValidate',
      };
      changes.push({ input: data.body, output: changedData.body });
      return injection.ok({ data: changedData, injection });
    };
    const middlewareBeforeValidate02: NatsBeforeValidate<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, injection) => {
      const changedData = {
        ...data,
        body: 'middleware.validate.02.beforeValidate',
      };
      changes.push({ input: data.body, output: changedData.body });
      return injection.ok({ data: changedData, injection });
    };
    const middlewareAfterValidate01: NatsAfterValidate<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, injection) => {
      const changedData = {
        ...data,
        body: 'middleware.validate.01.afterValidate',
      };
      changes.push({ input: data.body, output: changedData.body });
      return injection.ok({ data: changedData, injection });
    };
    const middlewareAfterValidate02: NatsAfterValidate<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, injection) => {
      const changedData = {
        ...data,
        body: 'middleware.validate.02.afterValidate',
      };
      changes.push({ input: data.body, output: changedData.body });
      return injection.ok({ data: changedData, injection });
    };

    natsService.register([
      {
        subject: 'handler.validate.01',
        validate: handlerValidate,
        authorize: undefined,
        handle: undefined,
        middlewares: [
          {
            id: 'middleware.validate.01',
            getActions: async () => {
              return {
                beforeValidate: middlewareBeforeValidate01,
                afterValidate: middlewareAfterValidate01,
              };
            },
          },
          {
            id: 'middleware.validate.02',
            getActions: async () => {
              return {
                beforeValidate: middlewareBeforeValidate02,
                afterValidate: middlewareAfterValidate02,
              };
            },
          },
        ],
      },
    ]);
    await natsService.start();

    await natsService.request({
      subject: 'handler.validate.01',
      data: { code: 200, body: 'data' },
    });

    expect(changes).toHaveLength(5);
    expect(changes[0]).toMatchObject({
      input: 'data',
      output: 'middleware.validate.01.beforeValidate',
    });
    expect(changes[1]).toMatchObject({
      input: 'middleware.validate.01.beforeValidate',
      output: 'middleware.validate.02.beforeValidate',
    });
    expect(changes[2]).toMatchObject({
      input: 'middleware.validate.02.beforeValidate',
      output: 'middleware.validate.02.beforeValidate',
    });
    expect(changes[3]).toMatchObject({
      input: 'middleware.validate.02.beforeValidate',
      output: 'middleware.validate.01.afterValidate',
    });
    expect(changes[4]).toMatchObject({
      input: 'middleware.validate.01.afterValidate',
      output: 'middleware.validate.02.afterValidate',
    });
  });
});
