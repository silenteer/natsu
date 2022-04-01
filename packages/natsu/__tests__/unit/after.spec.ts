import type { NatsAfter, NatsHandle } from '../../type';
import type { TestService, TestInjection } from '../service/nats.service';
import NatsService from '../service/nats.service';

describe('After stage', () => {
  let natsService: ReturnType<typeof NatsService.init>;

  beforeEach(() => {
    natsService = NatsService.init();
  });

  afterEach(async () => {
    await natsService?.stop();
  });

  it('Middleware "after" respond error in middle, handle & respondUnhandledError wont execute', async () => {
    const order: string[] = [];
    const middlewareAfter01: NatsAfter<TestService, TestInjection> = async ({
      data,
      result,
      injection,
    }) => {
      order.push('middleware.after01');
      return injection.ok({ data, result, injection });
    };
    const middlewareAfter02: NatsAfter<TestService, TestInjection> = async ({
      data,
      result,
      injection,
    }) => {
      order.push('middleware.after02');
      return injection.error({ data, result, injection, errors: new Error() });
    };
    const middlewareAfter03: NatsAfter<TestService, TestInjection> = async ({
      data,
      result,
      injection,
    }) => {
      order.push('middleware.after03');
      return injection.ok({ data, result, injection });
    };
    const handlerHandle: NatsHandle<TestService, TestInjection> = async (
      data,
      injection
    ) => {
      order.push('handler.handle');
      return injection.ok({ body: data.body });
    };
    const handlerRespondUnhandledError = jest.fn(async () => {
      order.push('handler.respondUnhandledError');
    });

    await natsService.register([
      {
        subject: 'after.spec',
        validate: undefined,
        authorize: undefined,
        handle: handlerHandle,
        middlewares: [
          {
            id: 'middleware.after01',
            init: async () => {
              return {
                after: middlewareAfter01,
              };
            },
          },
          {
            id: 'middleware.after02',
            init: async () => {
              return {
                after: middlewareAfter02,
              };
            },
          },
          {
            id: 'before03',
            init: async () => {
              return {
                after: middlewareAfter03,
              };
            },
          },
        ],
        respondUnhandledError: handlerRespondUnhandledError,
      },
    ]);
    await natsService.start();

    await natsService.request({
      subject: 'after.spec',
      data: { code: 200 },
    });

    expect(order).toHaveLength(3);
    expect(order[0]).toEqual('handler.handle');
    expect(order[1]).toEqual('middleware.after03');
    expect(order[2]).toEqual('middleware.after02');
  });

  it('Middleware "after" throw unhandled error in middle, handle wont execute, respondUnhandledError will execute', async () => {
    const order: string[] = [];
    const middlewareAfter01: NatsAfter<TestService, TestInjection> = async ({
      data,
      result,
      injection,
    }) => {
      order.push('middleware.after01');
      return injection.ok({ data, result, injection });
    };
    const middlewareAfter02: NatsAfter<
      TestService,
      TestInjection
    > = async () => {
      order.push('middleware.after02');
      throw new Error();
    };
    const middlewareAfter03: NatsAfter<TestService, TestInjection> = async ({
      data,
      result,
      injection,
    }) => {
      order.push('middleware.after03');
      return injection.ok({ data, result, injection });
    };
    const handlerHandle: NatsHandle<TestService, TestInjection> = async (
      data,
      injection
    ) => {
      order.push('handler.handle');
      return injection.ok({ body: data.body });
    };
    const handlerRespondUnhandledError = jest.fn(async () => {
      order.push('handler.respondUnhandledError');
    });

    await natsService.register([
      {
        subject: 'after.spec',
        validate: undefined,
        authorize: undefined,
        handle: handlerHandle,
        middlewares: [
          {
            id: 'middleware.after01',
            init: async () => {
              return {
                after: middlewareAfter01,
              };
            },
          },
          {
            id: 'middleware.after02',
            init: async () => {
              return {
                after: middlewareAfter02,
              };
            },
          },
          {
            id: 'before03',
            init: async () => {
              return {
                after: middlewareAfter03,
              };
            },
          },
        ],
        respondUnhandledError: handlerRespondUnhandledError,
      },
    ]);
    await natsService.start();

    await natsService.request({
      subject: 'after.spec',
      data: { code: 200 },
    });

    expect(order).toHaveLength(4);
    expect(order[0]).toEqual('handler.handle');
    expect(order[1]).toEqual('middleware.after03');
    expect(order[2]).toEqual('middleware.after02');
    expect(order[3]).toEqual('handler.respondUnhandledError');
  });

  it('Data & result will be changed while go through middleware "after"', async () => {
    const dataChanges: Array<{ input: unknown; output: unknown }> = [];
    const resultChanges: Array<{ input: unknown; output: unknown }> = [];

    const handlerHandle: NatsHandle<TestService, TestInjection> = async (
      data,
      injection
    ) => {
      return injection.ok({
        headers: data.headers,
        body: 'handler.handle',
      });
    };
    const middlewareAfter01: NatsAfter<TestService, TestInjection> = async ({
      data,
      result,
      injection,
    }) => {
      const changedData = {
        ...data,
        body: 'middleware.after01',
      };
      const changedResult = {
        ...result,
        body: 'middleware.after01',
      };
      dataChanges.push({ input: data.body, output: changedData.body });
      resultChanges.push({ input: result.body, output: changedResult.body });

      return injection.ok({
        data: changedData,
        result: changedResult,
        injection,
      });
    };
    const middlewareAfter02: NatsAfter<TestService, TestInjection> = async ({
      data,
      result,
      injection,
    }) => {
      const changedData = {
        ...data,
        body: 'middleware.after02',
      };
      const changedResult = {
        ...result,
        body: 'middleware.after02',
      };
      dataChanges.push({ input: data.body, output: changedData.body });
      resultChanges.push({ input: result.body, output: changedResult.body });

      return injection.ok({
        data: changedData,
        result: changedResult,
        injection,
      });
    };

    await natsService.register([
      {
        subject: 'after.spec',
        validate: undefined,
        authorize: undefined,
        handle: handlerHandle,
        middlewares: [
          {
            id: 'middleware.after01',
            init: async () => {
              return {
                after: middlewareAfter01,
              };
            },
          },
          {
            id: 'middleware.after02',
            init: async () => {
              return {
                after: middlewareAfter02,
              };
            },
          },
        ],
      },
    ]);
    await natsService.start();

    await natsService.request({
      subject: 'after.spec',
      data: { code: 200, body: 'data' },
    });

    expect(dataChanges).toHaveLength(2);
    expect(dataChanges[0]).toMatchObject({
      input: 'data',
      output: 'middleware.after02',
    });
    expect(dataChanges[1]).toMatchObject({
      input: 'middleware.after02',
      output: 'middleware.after01',
    });

    expect(resultChanges).toHaveLength(2);
    expect(resultChanges[0]).toMatchObject({
      input: 'handler.handle',
      output: 'middleware.after02',
    });
    expect(resultChanges[1]).toMatchObject({
      input: 'middleware.after02',
      output: 'middleware.after01',
    });
  });
});
