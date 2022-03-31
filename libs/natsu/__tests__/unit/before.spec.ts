import type { NatsBefore, NatsHandle } from '../../type';
import type { TestService, TestInjection } from '../service/nats.service';
import NatsService from '../service/nats.service';

describe('Before stage', () => {
  let natsService: ReturnType<typeof NatsService.init>;

  beforeEach(() => {
    natsService = NatsService.init();
  });

  afterEach(async () => {
    await natsService?.stop();
  });

  it('Middleware "before" respond error in middle, handle & respondUnhandledError wont execute', async () => {
    const order: string[] = [];
    const middlewareBefore01: NatsBefore<TestService, TestInjection> = async ({
      data,
      injection,
    }) => {
      order.push('middleware.before01');
      return injection.ok({ data, injection });
    };
    const middlewareBefore02: NatsBefore<TestService, TestInjection> = async ({
      data,
      injection,
    }) => {
      order.push('middleware.before02');
      return injection.error({ data, injection, errors: new Error() });
    };
    const middlewareBefore03: NatsBefore<TestService, TestInjection> = async ({
      data,
      injection,
    }) => {
      order.push('middleware.before03');
      return injection.ok({ data, injection });
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
        subject: 'before.spec',
        validate: undefined,
        authorize: undefined,
        handle: handlerHandle,
        middlewares: [
          {
            id: 'middleware.before01',
            init: async () => {
              return {
                before: middlewareBefore01,
              };
            },
          },
          {
            id: 'middleware.before02',
            init: async () => {
              return {
                before: middlewareBefore02,
              };
            },
          },
          {
            id: 'before03',
            init: async () => {
              return {
                before: middlewareBefore03,
              };
            },
          },
        ],
        respondUnhandledError: handlerRespondUnhandledError,
      },
    ]);
    await natsService.start();

    await natsService.request({
      subject: 'before.spec',
      data: { code: 200 },
    });

    expect(order).toHaveLength(2);
    expect(order[0]).toEqual('middleware.before01');
    expect(order[1]).toEqual('middleware.before02');
  });

  it('Middleware "before" throw unhandled error in middle, handle wont execute, respondUnhandledError will execute', async () => {
    const order: string[] = [];
    const middlewareBefore01: NatsBefore<TestService, TestInjection> = async ({
      data,
      injection,
    }) => {
      order.push('middleware.before01');
      return injection.ok({ data, injection });
    };
    const middlewareBefore02: NatsBefore<
      TestService,
      TestInjection
    > = async () => {
      order.push('middleware.before02');
      throw new Error();
    };
    const middlewareBefore03: NatsBefore<TestService, TestInjection> = async ({
      data,
      injection,
    }) => {
      order.push('middleware.before03');
      return injection.ok({ data, injection });
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
        subject: 'before.spec',
        validate: undefined,
        authorize: undefined,
        handle: handlerHandle,
        middlewares: [
          {
            id: 'middleware.before01',
            init: async () => {
              return {
                before: middlewareBefore01,
              };
            },
          },
          {
            id: 'middleware.before02',
            init: async () => {
              return {
                before: middlewareBefore02,
              };
            },
          },
          {
            id: 'before03',
            init: async () => {
              return {
                before: middlewareBefore03,
              };
            },
          },
        ],
        respondUnhandledError: handlerRespondUnhandledError,
      },
    ]);
    await natsService.start();

    await natsService.request({
      subject: 'before.spec',
      data: { code: 200 },
    });

    expect(order).toHaveLength(3);
    expect(order[0]).toEqual('middleware.before01');
    expect(order[1]).toEqual('middleware.before02');
    expect(order[2]).toEqual('handler.respondUnhandledError');
  });

  it('Middleware "before" successed, handle will execute', async () => {
    const order: string[] = [];
    const middlewareBefore: NatsBefore<TestService, TestInjection> = async ({
      data,
      injection,
    }) => {
      order.push('middleware.before');
      return injection.ok({ data, injection });
    };
    const handlerHandle: NatsHandle<TestService, TestInjection> = async (
      data,
      injection
    ) => {
      order.push('handler.handle');
      return injection.ok({ body: data.body });
    };

    await natsService.register([
      {
        subject: 'before.spec',
        validate: undefined,
        authorize: undefined,
        handle: handlerHandle,
        middlewares: [
          {
            id: 'middleware.before',
            init: async () => {
              return {
                before: middlewareBefore,
              };
            },
          },
        ],
      },
    ]);
    await natsService.start();

    await natsService.request({
      subject: 'before.spec',
      data: { code: 200 },
    });

    expect(order).toHaveLength(2);
    expect(order[0]).toEqual('middleware.before');
    expect(order[1]).toEqual('handler.handle');
  });

  it('Data will be changed while go through middleware "before"', async () => {
    const changes: Array<{ input: unknown; output: unknown }> = [];

    const handlerHandle: NatsHandle<TestService, TestInjection> = async (
      data,
      injection
    ) => {
      changes.push({ input: data.body, output: data.body });
      return injection.ok({ body: data.body });
    };
    const middlewareBefore01: NatsBefore<TestService, TestInjection> = async ({
      data,
      injection,
    }) => {
      const changedData = {
        ...data,
        body: 'middleware.before01',
      };
      changes.push({ input: data.body, output: changedData.body });
      return injection.ok({ data: changedData, injection });
    };
    const middlewareBefore02: NatsBefore<TestService, TestInjection> = async ({
      data,
      injection,
    }) => {
      const changedData = {
        ...data,
        body: 'middleware.before02',
      };
      changes.push({ input: data.body, output: changedData.body });
      return injection.ok({ data: changedData, injection });
    };

    await natsService.register([
      {
        subject: 'before.spec',
        validate: undefined,
        authorize: undefined,
        handle: handlerHandle,
        middlewares: [
          {
            id: 'middleware.before01',
            init: async () => {
              return {
                before: middlewareBefore01,
              };
            },
          },
          {
            id: 'middleware.before02',
            init: async () => {
              return {
                before: middlewareBefore02,
              };
            },
          },
        ],
      },
    ]);
    await natsService.start();

    await natsService.request({
      subject: 'before.spec',
      data: { code: 200, body: 'data' },
    });

    expect(changes).toHaveLength(3);
    expect(changes[0]).toMatchObject({
      input: 'data',
      output: 'middleware.before01',
    });
    expect(changes[1]).toMatchObject({
      input: 'middleware.before01',
      output: 'middleware.before02',
    });
    expect(changes[2]).toMatchObject({
      input: 'middleware.before02',
      output: 'middleware.before02',
    });
  });
});
