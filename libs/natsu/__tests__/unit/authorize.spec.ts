import type { NatsService as NatsServiceType } from '@silenteer/natsu-type';
import type {
  NatsBeforeAuthorize,
  NatsAuthorize,
  NatsAfterAuthorize,
} from '../../type';
import NatsService from '../service/nats.service';

describe('Authorization stage', () => {
  let natsService: ReturnType<typeof NatsService.init>;

  beforeEach(() => {
    natsService = NatsService.init();
  });

  afterEach(async () => {
    await natsService?.stop();
  });

  it('beforeAuthorize & authorize & afterAuthorize will execute orderly', async () => {
    const order: string[] = [];
    const handlerAuthorize: NatsAuthorize<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, injection) => {
      order.push('handler.authorize.01');
      return injection.ok({ data });
    };
    const middlewareBeforeAuthorize: NatsBeforeAuthorize<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, injection) => {
      order.push('middleware.authorize.01.beforeAuthorize');
      return injection.ok({ data, injection });
    };
    const middlewareAfterAuthorize: NatsAfterAuthorize<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, injection) => {
      order.push('middleware.authorize.01.afterAuthorize');
      return injection.ok({ data, injection });
    };

    natsService.register([
      {
        subject: 'handler.authorize.01',
        validate: undefined,
        authorize: handlerAuthorize,
        handle: undefined,
        middlewares: [
          {
            id: 'middleware.authorize.01',
            getActions: async () => {
              return {
                beforeAuthorize: middlewareBeforeAuthorize,
                afterAuthorize: middlewareAfterAuthorize,
              };
            },
          },
        ],
      },
    ]);
    await natsService.start();

    await natsService.request({
      subject: 'handler.authorize.01',
      data: { code: 200 },
    });

    expect(order).toHaveLength(3);
    expect(order[0]).toEqual('middleware.authorize.01.beforeAuthorize');
    expect(order[1]).toEqual('handler.authorize.01');
    expect(order[2]).toEqual('middleware.authorize.01.afterAuthorize');
  });

  it('beforeAuthorize failed, authorize & afterAuthorize wont execute, respondError will execute', async () => {
    const order: string[] = [];
    const handlerAuthorize: NatsAuthorize<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, injection) => {
      order.push('handler.authorize.01');
      return injection.ok({ data });
    };
    const middlewareBeforeAuthorize: NatsBeforeAuthorize<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, injection) => {
      order.push('middleware.authorize.01.beforeAuthorize');
      return injection.error({ data, injection, errors: new Error() });
    };
    const middlewareAfterAuthorize: NatsAfterAuthorize<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, injection) => {
      order.push('middleware.authorize.01.afterAuthorize');
      return injection.ok({ data, injection });
    };
    const handlerRespondError = jest.fn(async () => {
      order.push('handler.authorize.01.respondError');
    });

    natsService.register([
      {
        subject: 'handler.authorize.01',
        validate: undefined,
        authorize: handlerAuthorize,
        handle: undefined,
        middlewares: [
          {
            id: 'middleware.authorize.01',
            getActions: async () => {
              return {
                beforeAuthorize: middlewareBeforeAuthorize,
                afterAuthorize: middlewareAfterAuthorize,
              };
            },
          },
        ],
        respondError: handlerRespondError,
      },
    ]);
    await natsService.start();

    await natsService.request({
      subject: 'handler.authorize.01',
      data: { code: 200 },
    });

    expect(order).toHaveLength(2);
    expect(order[0]).toEqual('middleware.authorize.01.beforeAuthorize');
    expect(order[1]).toEqual('handler.authorize.01.respondError');
  });

  it('beforeAuthorize successed, authorize failed, afterAuthorize wont execute, respondError will execute', async () => {
    const order: string[] = [];
    const handlerAuthorize: NatsAuthorize<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, injection) => {
      order.push('handler.authorize.01');
      return injection.error({ data, errors: new Error() });
    };
    const middlewareBeforeAuthorize: NatsBeforeAuthorize<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, injection) => {
      order.push('middleware.authorize.01.beforeAuthorize');
      return injection.ok({ data, injection });
    };
    const middlewareAfterAuthorize: NatsAfterAuthorize<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, injection) => {
      order.push('middleware.authorize.01.afterAuthorize');
      return injection.ok({ data, injection });
    };
    const handlerRespondError = jest.fn(async () => {
      order.push('handler.authorize.01.respondError');
    });

    natsService.register([
      {
        subject: 'handler.authorize.01',
        validate: undefined,
        authorize: handlerAuthorize,
        handle: undefined,
        middlewares: [
          {
            id: 'middleware.authorize.01',
            getActions: async () => {
              return {
                beforeAuthorize: middlewareBeforeAuthorize,
                afterAuthorize: middlewareAfterAuthorize,
              };
            },
          },
        ],
        respondError: handlerRespondError,
      },
    ]);
    await natsService.start();

    await natsService.request({
      subject: 'handler.authorize.01',
      data: { code: 200 },
    });

    expect(order).toHaveLength(3);
    expect(order[0]).toEqual('middleware.authorize.01.beforeAuthorize');
    expect(order[1]).toEqual('handler.authorize.01');
    expect(order[2]).toEqual('handler.authorize.01.respondError');
  });

  it('beforeAuthorize failed in middle, authorize & afterAuthorize wont execute, respondError will execute', async () => {
    const order: string[] = [];
    const handlerAuthorize: NatsAuthorize<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, injection) => {
      order.push('handler.authorize.01');
      return injection.ok({ data });
    };
    const middlewareBeforeAuthorize01: NatsBeforeAuthorize<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, injection) => {
      order.push('middleware.authorize.01.beforeAuthorize');
      return injection.ok({ data, injection });
    };
    const middlewareBeforeAuthorize02: NatsBeforeAuthorize<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, injection) => {
      order.push('middleware.authorize.02.beforeAuthorize');
      return injection.error({ data, injection, errors: new Error() });
    };
    const middlewareBeforeAuthorize03: NatsBeforeAuthorize<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, injection) => {
      order.push('middleware.authorize.03.beforeAuthorize');
      return injection.ok({ data, injection });
    };
    const middlewareAfterAuthorize: NatsAfterAuthorize<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, injection) => {
      order.push('middleware.authorize.01.afterAuthorize');
      return injection.ok({ data, injection });
    };
    const handlerRespondError = jest.fn(async () => {
      order.push('handler.authorize.01.respondError');
    });

    natsService.register([
      {
        subject: 'handler.authorize.01',
        validate: undefined,
        authorize: handlerAuthorize,
        handle: undefined,
        middlewares: [
          {
            id: 'middleware.authorize.01',
            getActions: async () => {
              return {
                beforeAuthorize: middlewareBeforeAuthorize01,
                afterAuthorize: middlewareAfterAuthorize,
              };
            },
          },
          {
            id: 'middleware.authorize.02',
            getActions: async () => {
              return {
                beforeAuthorize: middlewareBeforeAuthorize02,
              };
            },
          },
          {
            id: 'middleware.authorize.03',
            getActions: async () => {
              return {
                beforeAuthorize: middlewareBeforeAuthorize03,
              };
            },
          },
        ],
        respondError: handlerRespondError,
      },
    ]);
    await natsService.start();

    await natsService.request({
      subject: 'handler.authorize.01',
      data: { code: 200 },
    });

    expect(order).toHaveLength(3);
    expect(order[0]).toEqual('middleware.authorize.01.beforeAuthorize');
    expect(order[1]).toEqual('middleware.authorize.02.beforeAuthorize');
    expect(order[2]).toEqual('handler.authorize.01.respondError');
  });

  it('beforeAuthorize & authorize successed, afterAuthorize failed in middle, respondError will execute', async () => {
    const order: string[] = [];
    const handlerAuthorize: NatsAuthorize<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, injection) => {
      order.push('handler.authorize.01');
      return injection.ok({ data });
    };
    const middlewareBeforeAuthorize: NatsBeforeAuthorize<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, injection) => {
      order.push('middleware.authorize.01.beforeAuthorize');
      return injection.ok({ data, injection });
    };
    const middlewareAfterAuthorize01: NatsAfterAuthorize<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, injection) => {
      order.push('middleware.authorize.01.afterAuthorize');
      return injection.ok({ data, injection });
    };
    const middlewareAfterAuthorize02: NatsAfterAuthorize<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, injection) => {
      order.push('middleware.authorize.02.afterAuthorize');
      return injection.error({ data, injection, errors: new Error() });
    };
    const middlewareAfterAuthorize03: NatsAfterAuthorize<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, injection) => {
      order.push('middleware.authorize.03.afterAuthorize');
      return injection.ok({ data, injection });
    };
    const handlerRespondError = jest.fn(async () => {
      order.push('handler.authorize.01.respondError');
    });

    natsService.register([
      {
        subject: 'handler.authorize.01',
        validate: undefined,
        authorize: handlerAuthorize,
        handle: undefined,
        middlewares: [
          {
            id: 'middleware.authorize.01',
            getActions: async () => {
              return {
                beforeAuthorize: middlewareBeforeAuthorize,
                afterAuthorize: middlewareAfterAuthorize01,
              };
            },
          },
          {
            id: 'middleware.authorize.02',
            getActions: async () => {
              return {
                afterAuthorize: middlewareAfterAuthorize02,
              };
            },
          },
          {
            id: 'middleware.authorize.03',
            getActions: async () => {
              return {
                afterAuthorize: middlewareAfterAuthorize03,
              };
            },
          },
        ],
        respondError: handlerRespondError,
      },
    ]);
    await natsService.start();

    await natsService.request({
      subject: 'handler.authorize.01',
      data: { code: 200 },
    });

    expect(order).toHaveLength(5);
    expect(order[0]).toEqual('middleware.authorize.01.beforeAuthorize');
    expect(order[1]).toEqual('handler.authorize.01');
    expect(order[2]).toEqual('middleware.authorize.01.afterAuthorize');
    expect(order[3]).toEqual('middleware.authorize.02.afterAuthorize');
    expect(order[4]).toEqual('handler.authorize.01.respondError');
  });

  it('Data will be changed while go through beforeAuthorize, afterAuthorize', async () => {
    const changes: Array<{ input: unknown; output: unknown }> = [];
    const handlerAuthorize: NatsAuthorize<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, injection) => {
      changes.push({ input: data.body, output: data.body });
      return injection.ok({ data });
    };
    const middlewareBeforeAuthorize01: NatsBeforeAuthorize<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, injection) => {
      const changedData = {
        ...data,
        body: 'middleware.authorize.01.beforeAuthorize',
      };
      changes.push({ input: data.body, output: changedData.body });
      return injection.ok({ data: changedData, injection });
    };
    const middlewareBeforeAuthorize02: NatsBeforeAuthorize<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, injection) => {
      const changedData = {
        ...data,
        body: 'middleware.authorize.02.beforeAuthorize',
      };
      changes.push({ input: data.body, output: changedData.body });
      return injection.ok({ data: changedData, injection });
    };
    const middlewareAfterAuthorize01: NatsAfterAuthorize<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, injection) => {
      const changedData = {
        ...data,
        body: 'middleware.authorize.01.afterAuthorize',
      };
      changes.push({ input: data.body, output: changedData.body });
      return injection.ok({ data: changedData, injection });
    };
    const middlewareAfterAuthorize02: NatsAfterAuthorize<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, injection) => {
      const changedData = {
        ...data,
        body: 'middleware.authorize.02.afterAuthorize',
      };
      changes.push({ input: data.body, output: changedData.body });
      return injection.ok({ data: changedData, injection });
    };

    natsService.register([
      {
        subject: 'handler.authorize.01',
        validate: undefined,
        authorize: handlerAuthorize,
        handle: undefined,
        middlewares: [
          {
            id: 'middleware.authorize.01',
            getActions: async () => {
              return {
                beforeAuthorize: middlewareBeforeAuthorize01,
                afterAuthorize: middlewareAfterAuthorize01,
              };
            },
          },
          {
            id: 'middleware.authorize.02',
            getActions: async () => {
              return {
                beforeAuthorize: middlewareBeforeAuthorize02,
                afterAuthorize: middlewareAfterAuthorize02,
              };
            },
          },
        ],
      },
    ]);
    await natsService.start();

    await natsService.request({
      subject: 'handler.authorize.01',
      data: { code: 200, body: 'data' },
    });

    expect(changes).toHaveLength(5);
    expect(changes[0]).toMatchObject({
      input: 'data',
      output: 'middleware.authorize.01.beforeAuthorize',
    });
    expect(changes[1]).toMatchObject({
      input: 'middleware.authorize.01.beforeAuthorize',
      output: 'middleware.authorize.02.beforeAuthorize',
    });
    expect(changes[2]).toMatchObject({
      input: 'middleware.authorize.02.beforeAuthorize',
      output: 'middleware.authorize.02.beforeAuthorize',
    });
    expect(changes[3]).toMatchObject({
      input: 'middleware.authorize.02.beforeAuthorize',
      output: 'middleware.authorize.01.afterAuthorize',
    });
    expect(changes[4]).toMatchObject({
      input: 'middleware.authorize.01.afterAuthorize',
      output: 'middleware.authorize.02.afterAuthorize',
    });
  });
});
