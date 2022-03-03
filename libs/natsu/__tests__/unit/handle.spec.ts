import type { NatsBefore, NatsHandle, NatsAfter } from '../../type';
import type { TestService, TestInjection } from '../service/nats.service';
import NatsService from '../service/nats.service';

describe('Handle stage', () => {
  let natsService: ReturnType<typeof NatsService.init>;

  beforeEach(() => {
    natsService = NatsService.init();
  });

  afterEach(async () => {
    await natsService?.stop();
  });

  it('Middleware "before" & handle & middleware "after" will execute orderly', async () => {
    const order: string[] = [];
    const handlerHandle: NatsHandle<TestService, TestInjection> = async (
      data,
      injection
    ) => {
      order.push('handler.handle');
      return injection.ok({ body: data.body });
    };
    const middlewareBefore: NatsBefore<TestService, TestInjection> = async ({
      data,
      injection,
    }) => {
      order.push('middleware.before');
      return injection.ok({ data, injection });
    };
    const middlewareAfter: NatsAfter<TestService, TestInjection> = async ({
      data,
      result,
      injection,
    }) => {
      order.push('middleware.after');
      return injection.ok({ data, result, injection });
    };

    await natsService.register([
      {
        subject: 'handle.spec',
        validate: undefined,
        authorize: undefined,
        handle: handlerHandle,
        middlewares: [
          {
            id: 'middleware',
            init: async () => {
              return {
                before: middlewareBefore,
                after: middlewareAfter,
              };
            },
          },
        ],
      },
    ]);
    await natsService.start();

    await natsService.request({
      subject: 'handle.spec',
      data: { code: 200 },
    });

    expect(order).toHaveLength(3);
    expect(order[0]).toEqual('middleware.before');
    expect(order[1]).toEqual('handler.handle');
    expect(order[2]).toEqual('middleware.after');
  });

  it('Middleware "before" successed, handle respond error, middleware "after" wont execute, respondError will execute', async () => {
    const order: string[] = [];
    const handlerHandle: NatsHandle<TestService, TestInjection> = async (
      data,
      injection
    ) => {
      order.push('handler.handle');
      return injection.error({ data, errors: { code: 500 } });
    };
    const middlewareBefore: NatsBefore<TestService, TestInjection> = async ({
      data,
      injection,
    }) => {
      order.push('middleware.before');
      return injection.ok({ data, injection });
    };
    const middlewareAfter: NatsAfter<TestService, TestInjection> = async ({
      data,
      result,
      injection,
    }) => {
      order.push('middleware.after');
      return injection.ok({ data, result, injection });
    };
    const handlerRespondError = jest.fn(async () => {
      order.push('handler.respondError');
    });

    await natsService.register([
      {
        subject: 'handle.spec',
        validate: undefined,
        authorize: undefined,
        handle: handlerHandle,
        middlewares: [
          {
            id: 'middleware',
            init: async () => {
              return {
                before: middlewareBefore,
                after: middlewareAfter,
              };
            },
          },
        ],
        respondError: handlerRespondError,
      },
    ]);
    await natsService.start();

    await natsService.request({
      subject: 'handle.spec',
      data: { code: 200 },
    });

    expect(order).toHaveLength(3);
    expect(order[0]).toEqual('middleware.before');
    expect(order[1]).toEqual('handler.handle');
    expect(order[2]).toEqual('handler.respondError');
  });

  it('Middleware "before" successed, handle throw unhandled error, middleware "after" wont execute, respondUnhandledError will execute', async () => {
    const order: string[] = [];
    const handlerHandle: NatsHandle<TestService, TestInjection> = async () => {
      order.push('handler.handle');
      throw new Error();
    };
    const middlewareBefore: NatsBefore<TestService, TestInjection> = async ({
      data,
      injection,
    }) => {
      order.push('middleware.before');
      return injection.ok({ data, injection });
    };
    const middlewareAfter: NatsAfter<TestService, TestInjection> = async ({
      data,
      result,
      injection,
    }) => {
      order.push('middleware.after');
      return injection.ok({ data, result, injection });
    };
    const handlerRespondUnhandledError = jest.fn(async () => {
      order.push('handler.respondUnhandledError');
    });

    await natsService.register([
      {
        subject: 'handle.spec',
        validate: undefined,
        authorize: undefined,
        handle: handlerHandle,
        middlewares: [
          {
            id: 'middleware',
            init: async () => {
              return {
                before: middlewareBefore,
                after: middlewareAfter,
              };
            },
          },
        ],
        respondUnhandledError: handlerRespondUnhandledError,
      },
    ]);
    await natsService.start();

    await natsService.request({
      subject: 'handle.spec',
      data: { code: 200 },
    });

    expect(order).toHaveLength(3);
    expect(order[0]).toEqual('middleware.before');
    expect(order[1]).toEqual('handler.handle');
    expect(order[2]).toEqual('handler.respondUnhandledError');
  });
});
