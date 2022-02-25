import type { NatsService as NatsServiceType } from '@silenteer/natsu-type';
import type { NatsBeforeHandle, NatsHandle, NatsAfterHandle } from '../../type';
import NatsService from '../service/nats.service';

describe('Handle stage', () => {
  let natsService: ReturnType<typeof NatsService.init>;

  beforeEach(() => {
    natsService = NatsService.init();
  });

  afterEach(async () => {
    await natsService?.stop();
  });

  it('beforeHandle & handle & afterHandle will execute orderly', async () => {
    const order: string[] = [];
    const handlerHandle: NatsHandle<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, injection) => {
      order.push('handler.handle.01');
      return injection.ok({ data });
    };
    const middlewareBeforeHandle: NatsBeforeHandle<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, injection) => {
      order.push('middleware.handle.01.beforeHandle');
      return injection.ok({ data, injection });
    };
    const middlewareAfterHandle: NatsAfterHandle<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, result, injection) => {
      order.push('middleware.handle.01.afterHandle');
      return injection.ok({ data, result, injection });
    };

    natsService.register([
      {
        subject: 'handler.handle.01',
        validate: undefined,
        authorize: undefined,
        handle: handlerHandle,
        middlewares: [
          {
            id: 'middleware.handle.01',
            init: async () => {
              return {
                beforeHandle: middlewareBeforeHandle,
                afterHandle: middlewareAfterHandle,
              };
            },
          },
        ],
      },
    ]);
    await natsService.start();

    await natsService.request({
      subject: 'handler.handle.01',
      data: { code: 200 },
    });

    expect(order).toHaveLength(3);
    expect(order[0]).toEqual('middleware.handle.01.beforeHandle');
    expect(order[1]).toEqual('handler.handle.01');
    expect(order[2]).toEqual('middleware.handle.01.afterHandle');
  });

  it('beforeHandle failed, handle & afterHandle wont execute, respondError will execute', async () => {
    const order: string[] = [];
    const handlerHandle: NatsHandle<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, injection) => {
      order.push('handler.handle.01');
      return injection.ok({ data });
    };
    const middlewareBeforeHandle: NatsBeforeHandle<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, injection) => {
      order.push('middleware.handle.01.beforeHandle');
      return injection.error({ data, injection, errors: new Error() });
    };
    const middlewareAfterHandle: NatsAfterHandle<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, result, injection) => {
      order.push('middleware.handle.01.afterHandle');
      return injection.ok({ data, result, injection });
    };
    const handlerRespondError = jest.fn(async () => {
      order.push('handler.handle.01.respondError');
    });

    natsService.register([
      {
        subject: 'handler.handle.01',
        validate: undefined,
        authorize: undefined,
        handle: handlerHandle,
        middlewares: [
          {
            id: 'middleware.handle.01',
            init: async () => {
              return {
                beforeHandle: middlewareBeforeHandle,
                afterHandle: middlewareAfterHandle,
              };
            },
          },
        ],
        respondError: handlerRespondError,
      },
    ]);
    await natsService.start();

    await natsService.request({
      subject: 'handler.handle.01',
      data: { code: 200 },
    });

    expect(order).toHaveLength(2);
    expect(order[0]).toEqual('middleware.handle.01.beforeHandle');
    expect(order[1]).toEqual('handler.handle.01.respondError');
  });

  it('beforeHandle successed, handle failed, afterHandle wont execute, respondError will execute', async () => {
    const order: string[] = [];
    const handlerHandle: NatsHandle<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, injection) => {
      order.push('handler.handle.01');
      return injection.error({ data, errors: new Error() });
    };
    const middlewareBeforeHandle: NatsBeforeHandle<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, injection) => {
      order.push('middleware.handle.01.beforeHandle');
      return injection.ok({ data, injection });
    };
    const middlewareAfterHandle: NatsAfterHandle<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, result, injection) => {
      order.push('middleware.handle.01.afterHandle');
      return injection.ok({ data, result, injection });
    };
    const handlerRespondError = jest.fn(async () => {
      order.push('handler.handle.01.respondError');
    });

    natsService.register([
      {
        subject: 'handler.handle.01',
        validate: undefined,
        authorize: undefined,
        handle: handlerHandle,
        middlewares: [
          {
            id: 'middleware.handle.01',
            init: async () => {
              return {
                beforeHandle: middlewareBeforeHandle,
                afterHandle: middlewareAfterHandle,
              };
            },
          },
        ],
        respondError: handlerRespondError,
      },
    ]);
    await natsService.start();

    await natsService.request({
      subject: 'handler.handle.01',
      data: { code: 200 },
    });

    expect(order).toHaveLength(3);
    expect(order[0]).toEqual('middleware.handle.01.beforeHandle');
    expect(order[1]).toEqual('handler.handle.01');
    expect(order[2]).toEqual('handler.handle.01.respondError');
  });

  it('beforeHandle failed in middle, handle & afterHandle wont execute, respondError will execute', async () => {
    const order: string[] = [];
    const handlerHandle: NatsHandle<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, injection) => {
      order.push('handler.handle.01');
      return injection.ok({ data });
    };
    const middlewareBeforeHandle01: NatsBeforeHandle<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, injection) => {
      order.push('middleware.handle.01.beforeHandle');
      return injection.ok({ data, injection });
    };
    const middlewareBeforeHandle02: NatsBeforeHandle<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, injection) => {
      order.push('middleware.handle.02.beforeHandle');
      return injection.error({ data, injection, errors: new Error() });
    };
    const middlewareBeforeHandle03: NatsBeforeHandle<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, injection) => {
      order.push('middleware.handle.03.beforeHandle');
      return injection.ok({ data, injection });
    };
    const middlewareAfterHandle: NatsAfterHandle<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, result, injection) => {
      order.push('middleware.handle.01.afterHandle');
      return injection.ok({ data, result, injection });
    };
    const handlerRespondError = jest.fn(async () => {
      order.push('handler.handle.01.respondError');
    });

    natsService.register([
      {
        subject: 'handler.handle.01',
        validate: undefined,
        authorize: undefined,
        handle: handlerHandle,
        middlewares: [
          {
            id: 'middleware.handle.01',
            init: async () => {
              return {
                beforeHandle: middlewareBeforeHandle01,
                afterHandle: middlewareAfterHandle,
              };
            },
          },
          {
            id: 'middleware.handle.02',
            init: async () => {
              return {
                beforeHandle: middlewareBeforeHandle02,
              };
            },
          },
          {
            id: 'middleware.handle.03',
            init: async () => {
              return {
                beforeHandle: middlewareBeforeHandle03,
              };
            },
          },
        ],
        respondError: handlerRespondError,
      },
    ]);
    await natsService.start();

    await natsService.request({
      subject: 'handler.handle.01',
      data: { code: 200 },
    });

    expect(order).toHaveLength(3);
    expect(order[0]).toEqual('middleware.handle.01.beforeHandle');
    expect(order[1]).toEqual('middleware.handle.02.beforeHandle');
    expect(order[2]).toEqual('handler.handle.01.respondError');
  });

  it('beforeHandle & handle successed, afterHandle failed in middle, respondError will execute', async () => {
    const order: string[] = [];
    const handlerHandle: NatsHandle<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, injection) => {
      order.push('handler.handle.01');
      return injection.ok({ data });
    };
    const middlewareBeforeHandle: NatsBeforeHandle<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, injection) => {
      order.push('middleware.handle.01.beforeHandle');
      return injection.ok({ data, injection });
    };
    const middlewareAfterHandle01: NatsAfterHandle<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, result, injection) => {
      order.push('middleware.handle.01.afterHandle');
      return injection.ok({ data, result, injection });
    };
    const middlewareAfterHandle02: NatsAfterHandle<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, result, injection) => {
      order.push('middleware.handle.02.afterHandle');
      return injection.error({ data, result, injection, errors: new Error() });
    };
    const middlewareAfterHandle03: NatsAfterHandle<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, result, injection) => {
      order.push('middleware.handle.03.afterHandle');
      return injection.ok({ data, result, injection });
    };
    const handlerRespondError = jest.fn(async () => {
      order.push('handler.handle.01.respondError');
    });

    natsService.register([
      {
        subject: 'handler.handle.01',
        validate: undefined,
        authorize: undefined,
        handle: handlerHandle,
        middlewares: [
          {
            id: 'middleware.handle.01',
            init: async () => {
              return {
                beforeHandle: middlewareBeforeHandle,
                afterHandle: middlewareAfterHandle01,
              };
            },
          },
          {
            id: 'middleware.handle.02',
            init: async () => {
              return {
                afterHandle: middlewareAfterHandle02,
              };
            },
          },
          {
            id: 'middleware.handle.03',
            init: async () => {
              return {
                afterHandle: middlewareAfterHandle03,
              };
            },
          },
        ],
        respondError: handlerRespondError,
      },
    ]);
    await natsService.start();

    await natsService.request({
      subject: 'handler.handle.01',
      data: { code: 200 },
    });

    expect(order).toHaveLength(5);
    expect(order[0]).toEqual('middleware.handle.01.beforeHandle');
    expect(order[1]).toEqual('handler.handle.01');
    expect(order[2]).toEqual('middleware.handle.01.afterHandle');
    expect(order[3]).toEqual('middleware.handle.02.afterHandle');
    expect(order[4]).toEqual('handler.handle.01.respondError');
  });

  it('Data & result will be changed while go through beforeHandle, afterHandle', async () => {
    const changes: Array<{ input: unknown; output: unknown }> = [];
    const resultChanges: Array<{ input: unknown; output: unknown }> = [];

    const handlerHandle: NatsHandle<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, injection) => {
      changes.push({ input: data.body, output: data.body });
      return injection.ok({ data });
    };
    const middlewareBeforeHandle01: NatsBeforeHandle<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, injection) => {
      const changedData = {
        ...data,
        body: 'middleware.handle.01.beforeHandle',
      };
      changes.push({ input: data.body, output: changedData.body });
      return injection.ok({ data: changedData, injection });
    };
    const middlewareBeforeHandle02: NatsBeforeHandle<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, injection) => {
      const changedData = {
        ...data,
        body: 'middleware.handle.02.beforeHandle',
      };
      changes.push({ input: data.body, output: changedData.body });
      return injection.ok({ data: changedData, injection });
    };
    const middlewareAfterHandle01: NatsAfterHandle<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, result, injection) => {
      const changedData = {
        ...data,
        body: 'middleware.handle.01.afterHandle',
      };
      const changedResult = {
        ...result,
        body: 'middleware.handle.01.afterHandle',
      };
      changes.push({ input: data.body, output: changedData.body });
      resultChanges.push({ input: data.body, output: changedResult.body });

      return injection.ok({ data: changedData, result, injection });
    };
    const middlewareAfterHandle02: NatsAfterHandle<
      NatsServiceType<string, unknown, unknown>,
      Record<string, unknown>
    > = async (data, result, injection) => {
      const changedData = {
        ...data,
        body: 'middleware.handle.02.afterHandle',
      };
      const changedResult = {
        ...result,
        body: 'middleware.handle.02.afterHandle',
      };
      changes.push({ input: data.body, output: changedData.body });
      resultChanges.push({ input: data.body, output: changedResult.body });

      return injection.ok({ data: changedData, result, injection });
    };

    natsService.register([
      {
        subject: 'handler.handle.01',
        validate: undefined,
        authorize: undefined,
        handle: handlerHandle,
        middlewares: [
          {
            id: 'middleware.handle.01',
            init: async () => {
              return {
                beforeHandle: middlewareBeforeHandle01,
                afterHandle: middlewareAfterHandle01,
              };
            },
          },
          {
            id: 'middleware.handle.02',
            init: async () => {
              return {
                beforeHandle: middlewareBeforeHandle02,
                afterHandle: middlewareAfterHandle02,
              };
            },
          },
        ],
      },
    ]);
    await natsService.start();

    await natsService.request({
      subject: 'handler.handle.01',
      data: { code: 200, body: 'data' },
    });

    expect(changes).toHaveLength(5);
    expect(changes[0]).toMatchObject({
      input: 'data',
      output: 'middleware.handle.01.beforeHandle',
    });
    expect(changes[1]).toMatchObject({
      input: 'middleware.handle.01.beforeHandle',
      output: 'middleware.handle.02.beforeHandle',
    });
    expect(changes[2]).toMatchObject({
      input: 'middleware.handle.02.beforeHandle',
      output: 'middleware.handle.02.beforeHandle',
    });
    expect(changes[3]).toMatchObject({
      input: 'middleware.handle.02.beforeHandle',
      output: 'middleware.handle.01.afterHandle',
    });
    expect(changes[4]).toMatchObject({
      input: 'middleware.handle.01.afterHandle',
      output: 'middleware.handle.02.afterHandle',
    });

    expect(resultChanges).toHaveLength(2);
    expect(resultChanges[0]).toMatchObject({
      input: 'middleware.handle.02.beforeHandle',
      output: 'middleware.handle.01.afterHandle',
    });
    expect(resultChanges[1]).toMatchObject({
      input: 'middleware.handle.01.afterHandle',
      output: 'middleware.handle.02.afterHandle',
    });
  });
});
