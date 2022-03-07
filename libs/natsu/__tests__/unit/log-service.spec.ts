import type { NatsBefore, NatsHandle, NatsAfter } from '../../type';
import type { TestService, TestInjection } from '../service/nats.service';
import NatsService from '../service/nats.service';

class LogService {
  private _messages: string[] = [];

  get messages() {
    return this._messages;
  }

  log(message?: any, ...optionalParams: any[]) {
    this._messages.push(this._stringify(message, optionalParams));
  }
  info(message?: any, ...optionalParams: any[]) {
    this._messages.push(this._stringify(message, optionalParams));
  }
  warn(message?: any, ...optionalParams: any[]) {
    this._messages.push(this._stringify(message, optionalParams));
  }
  error(message?: any, ...optionalParams: any[]) {
    this._messages.push(this._stringify(message, optionalParams));
  }

  private _stringify(message: any, optionalParams: any[]) {
    const result = [
      typeof message === 'string' ? message : JSON.stringify(message),
    ];
    optionalParams?.forEach((item) => {
      if (typeof item === 'string') {
        result.push(item);
      } else if (!Array.isArray(item) && typeof item === 'object') {
        if (item.errors) {
          result.push(
            typeof item.errors === 'string'
              ? item.errors
              : JSON.stringify(item.errors)
          );
        } else {
          result.push(JSON.stringify(item));
        }
      }
    });
    return result.filter((item) => item.trim().length > 0).join('');
  }
}

describe('Log service', () => {
  let logService: LogService;
  let natsService: ReturnType<typeof NatsService.init>;

  beforeEach(() => {
    logService = new LogService();
    natsService = NatsService.init({ logService });
  });

  afterEach(async () => {
    await natsService?.stop();
  });

  it('Log messages display for exceution of Middleware "before" & handle & middleware "after"', async () => {
    const handlerHandle: NatsHandle<TestService, TestInjection> = async (
      data,
      injection
    ) => {
      return injection.ok({ body: data.body });
    };
    const middlewareBefore01: NatsBefore<TestService, TestInjection> = async ({
      data,
      injection,
    }) => {
      return injection.ok({ data, injection });
    };
    const middlewareBefore02: NatsBefore<TestService, TestInjection> = async ({
      data,
      injection,
    }) => {
      return injection.ok({ data, injection });
    };
    const middlewareAfter01: NatsAfter<TestService, TestInjection> = async ({
      data,
      result,
      injection,
    }) => {
      return injection.ok({ data, result, injection });
    };
    const middlewareAfter02: NatsAfter<TestService, TestInjection> = async ({
      data,
      result,
      injection,
    }) => {
      return injection.ok({ data, result, injection });
    };

    await natsService.register([
      {
        subject: 'log-service.spec',
        validate: undefined,
        authorize: undefined,
        handle: handlerHandle,
        middlewares: [
          {
            id: 'middleware-01',
            init: async () => {
              return {
                before: middlewareBefore01,
                after: middlewareAfter01,
              };
            },
          },
          {
            id: 'middleware-02',
            init: async () => {
              return {
                before: middlewareBefore02,
                after: middlewareAfter02,
              };
            },
          },
        ],
      },
    ]);
    await natsService.start();

    await natsService.request({
      subject: 'log-service.spec',
      data: { code: 200 },
    });

    expect(logService.messages).toHaveLength(7);
    expect(logService.messages[0]).toEqual('[log-service.spec]Begin');
    expect(logService.messages[1]).toEqual(
      '[log-service.spec][middleware-01][before]Handling'
    );
    expect(logService.messages[2]).toEqual(
      '[log-service.spec][middleware-02][before]Handling'
    );
    expect(logService.messages[3]).toEqual(
      '[log-service.spec][handle]Handling'
    );
    expect(logService.messages[4]).toEqual(
      '[log-service.spec][middleware-02][after]Handling'
    );
    expect(logService.messages[5]).toEqual(
      '[log-service.spec][middleware-01][after]Handling'
    );
    expect(logService.messages[6]).toEqual('[log-service.spec]End');
  });

  it('Log messages display for Incoming message which has no data', async () => {
    const handlerHandle: NatsHandle<TestService, TestInjection> = async (
      data,
      injection
    ) => {
      return injection.ok({ body: data.body });
    };
    const middlewareBefore01: NatsBefore<TestService, TestInjection> = async ({
      data,
      injection,
    }) => {
      return injection.ok({ data, injection });
    };
    const middlewareBefore02: NatsBefore<TestService, TestInjection> = async ({
      data,
      injection,
    }) => {
      return injection.ok({ data, injection });
    };
    const middlewareAfter01: NatsAfter<TestService, TestInjection> = async ({
      data,
      result,
      injection,
    }) => {
      return injection.ok({ data, result, injection });
    };
    const middlewareAfter02: NatsAfter<TestService, TestInjection> = async ({
      data,
      result,
      injection,
    }) => {
      return injection.ok({ data, result, injection });
    };

    await natsService.register([
      {
        subject: 'log-service.spec',
        validate: undefined,
        authorize: undefined,
        handle: handlerHandle,
        middlewares: [
          {
            id: 'middleware-01',
            init: async () => {
              return {
                before: middlewareBefore01,
                after: middlewareAfter01,
              };
            },
          },
          {
            id: 'middleware-02',
            init: async () => {
              return {
                before: middlewareBefore02,
                after: middlewareAfter02,
              };
            },
          },
        ],
      },
    ]);
    await natsService.start();

    await natsService.request({
      subject: 'log-service.spec',
      data: undefined,
    });

    expect(logService.messages).toHaveLength(3);
    expect(logService.messages[0]).toEqual('[log-service.spec]Begin');
    expect(logService.messages[1]).toEqual(
      '[log-service.spec]Incoming message has no data'
    );
    expect(logService.messages[2]).toEqual('[log-service.spec]End');
  });

  it('Log messages display for case that Middleware "before" respond error in middle', async () => {
    const handlerHandle: NatsHandle<TestService, TestInjection> = async (
      data,
      injection
    ) => {
      return injection.ok({ body: data.body });
    };
    const middlewareBefore01: NatsBefore<TestService, TestInjection> = async ({
      data,
      injection,
    }) => {
      return injection.ok({ data, injection });
    };
    const middlewareBefore02: NatsBefore<TestService, TestInjection> = async ({
      data,
      injection,
    }) => {
      return injection.error({ data, errors: 'ERROR', injection });
    };
    const middlewareAfter01: NatsAfter<TestService, TestInjection> = async ({
      data,
      result,
      injection,
    }) => {
      return injection.ok({ data, result, injection });
    };
    const middlewareAfter02: NatsAfter<TestService, TestInjection> = async ({
      data,
      result,
      injection,
    }) => {
      return injection.ok({ data, result, injection });
    };

    await natsService.register([
      {
        subject: 'log-service.spec',
        validate: undefined,
        authorize: undefined,
        handle: handlerHandle,
        middlewares: [
          {
            id: 'middleware-01',
            init: async () => {
              return {
                before: middlewareBefore01,
                after: middlewareAfter01,
              };
            },
          },
          {
            id: 'middleware-02',
            init: async () => {
              return {
                before: middlewareBefore02,
                after: middlewareAfter02,
              };
            },
          },
        ],
      },
    ]);
    await natsService.start();

    await natsService.request({
      subject: 'log-service.spec',
      data: { code: 200 },
    });

    expect(logService.messages).toHaveLength(5);
    expect(logService.messages[0]).toEqual('[log-service.spec]Begin');
    expect(logService.messages[1]).toEqual(
      '[log-service.spec][middleware-01][before]Handling'
    );
    expect(logService.messages[2]).toEqual(
      '[log-service.spec][middleware-02][before]Handling'
    );
    expect(logService.messages[3]).toEqual(
      `[log-service.spec][middleware-02][before]ERROR`
    );
    expect(logService.messages[4]).toEqual('[log-service.spec]End');
  });

  it('Log messages display for case that Middleware "before" throw unhandled error in middle', async () => {
    const handlerHandle: NatsHandle<TestService, TestInjection> = async (
      data,
      injection
    ) => {
      return injection.ok({ body: data.body });
    };
    const middlewareBefore01: NatsBefore<TestService, TestInjection> = async ({
      data,
      injection,
    }) => {
      return injection.ok({ data, injection });
    };
    const middlewareBefore02: NatsBefore<TestService, TestInjection> =
      async () => {
        throw 'UNHANDLED_ERROR';
      };
    const middlewareAfter01: NatsAfter<TestService, TestInjection> = async ({
      data,
      result,
      injection,
    }) => {
      return injection.ok({ data, result, injection });
    };
    const middlewareAfter02: NatsAfter<TestService, TestInjection> = async ({
      data,
      result,
      injection,
    }) => {
      return injection.ok({ data, result, injection });
    };

    await natsService.register([
      {
        subject: 'log-service.spec',
        validate: undefined,
        authorize: undefined,
        handle: handlerHandle,
        middlewares: [
          {
            id: 'middleware-01',
            init: async () => {
              return {
                before: middlewareBefore01,
                after: middlewareAfter01,
              };
            },
          },
          {
            id: 'middleware-02',
            init: async () => {
              return {
                before: middlewareBefore02,
                after: middlewareAfter02,
              };
            },
          },
        ],
      },
    ]);
    await natsService.start();

    await natsService.request({
      subject: 'log-service.spec',
      data: { code: 200 },
    });

    expect(logService.messages).toHaveLength(5);
    expect(logService.messages[0]).toEqual('[log-service.spec]Begin');
    expect(logService.messages[1]).toEqual(
      '[log-service.spec][middleware-01][before]Handling'
    );
    expect(logService.messages[2]).toEqual(
      '[log-service.spec][middleware-02][before]Handling'
    );
    expect(logService.messages[3]).toEqual(
      `[log-service.spec][middleware-02][before]UNHANDLED_ERROR`
    );
    expect(logService.messages[4]).toEqual('[log-service.spec]End');
  });

  it('Log messages display for case that Middleware "after" respond error in middle', async () => {
    const handlerHandle: NatsHandle<TestService, TestInjection> = async (
      data,
      injection
    ) => {
      return injection.ok({ body: data.body });
    };
    const middlewareAfter01: NatsAfter<TestService, TestInjection> = async ({
      data,
      result,
      injection,
    }) => {
      return injection.ok({ data, result, injection });
    };
    const middlewareAfter02: NatsAfter<TestService, TestInjection> = async ({
      data,
      result,
      injection,
    }) => {
      return injection.error({ data, result, errors: 'ERROR', injection });
    };

    await natsService.register([
      {
        subject: 'log-service.spec',
        validate: undefined,
        authorize: undefined,
        handle: handlerHandle,
        middlewares: [
          {
            id: 'middleware-01',
            init: async () => {
              return {
                after: middlewareAfter01,
              };
            },
          },
          {
            id: 'middleware-02',
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
      subject: 'log-service.spec',
      data: { code: 200 },
    });

    expect(logService.messages).toHaveLength(5);
    expect(logService.messages[0]).toEqual('[log-service.spec]Begin');
    expect(logService.messages[1]).toEqual(
      '[log-service.spec][handle]Handling'
    );
    expect(logService.messages[2]).toEqual(
      '[log-service.spec][middleware-02][after]Handling'
    );
    expect(logService.messages[3]).toEqual(
      `[log-service.spec][middleware-02][after]ERROR`
    );
    expect(logService.messages[4]).toEqual('[log-service.spec]End');
  });

  it('Log messages display for case that Middleware "after" throw unhandled error in middle', async () => {
    const handlerHandle: NatsHandle<TestService, TestInjection> = async (
      data,
      injection
    ) => {
      return injection.ok({ body: data.body });
    };
    const middlewareAfter01: NatsAfter<TestService, TestInjection> = async ({
      data,
      result,
      injection,
    }) => {
      return injection.ok({ data, result, injection });
    };
    const middlewareAfter02: NatsAfter<TestService, TestInjection> =
      async () => {
        throw 'UNHANDLED_ERROR';
      };

    await natsService.register([
      {
        subject: 'log-service.spec',
        validate: undefined,
        authorize: undefined,
        handle: handlerHandle,
        middlewares: [
          {
            id: 'middleware-01',
            init: async () => {
              return {
                after: middlewareAfter01,
              };
            },
          },
          {
            id: 'middleware-02',
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
      subject: 'log-service.spec',
      data: { code: 200 },
    });

    expect(logService.messages).toHaveLength(5);
    expect(logService.messages[0]).toEqual('[log-service.spec]Begin');
    expect(logService.messages[1]).toEqual(
      '[log-service.spec][handle]Handling'
    );
    expect(logService.messages[2]).toEqual(
      '[log-service.spec][middleware-02][after]Handling'
    );
    expect(logService.messages[3]).toEqual(
      `[log-service.spec][middleware-02][after]UNHANDLED_ERROR`
    );
    expect(logService.messages[4]).toEqual('[log-service.spec]End');
  });

  it('Log messages display for case that handle respond error', async () => {
    const handlerHandle: NatsHandle<TestService, TestInjection> = async (
      data,
      injection
    ) => {
      return injection.error({ errors: 'ERROR' });
    };
    const middlewareAfter01: NatsAfter<TestService, TestInjection> = async ({
      data,
      result,
      injection,
    }) => {
      return injection.ok({ data, result, injection });
    };
    const middlewareAfter02: NatsAfter<TestService, TestInjection> = async ({
      data,
      result,
      injection,
    }) => {
      return injection.ok({ data, result, injection });
    };

    await natsService.register([
      {
        subject: 'log-service.spec',
        validate: undefined,
        authorize: undefined,
        handle: handlerHandle,
        middlewares: [
          {
            id: 'middleware-01',
            init: async () => {
              return {
                after: middlewareAfter01,
              };
            },
          },
          {
            id: 'middleware-02',
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
      subject: 'log-service.spec',
      data: { code: 200 },
    });

    expect(logService.messages).toHaveLength(4);
    expect(logService.messages[0]).toEqual('[log-service.spec]Begin');
    expect(logService.messages[1]).toEqual(
      '[log-service.spec][handle]Handling'
    );
    expect(logService.messages[2]).toEqual(`[log-service.spec][handle]ERROR`);
    expect(logService.messages[3]).toEqual('[log-service.spec]End');
  });

  it('Log messages display for case that handle throw unhandled error', async () => {
    const handlerHandle: NatsHandle<TestService, TestInjection> = async () => {
      throw 'UNHANDLED_ERROR';
    };
    const middlewareAfter01: NatsAfter<TestService, TestInjection> = async ({
      data,
      result,
      injection,
    }) => {
      return injection.ok({ data, result, injection });
    };
    const middlewareAfter02: NatsAfter<TestService, TestInjection> = async ({
      data,
      result,
      injection,
    }) => {
      return injection.ok({ data, result, injection });
    };

    await natsService.register([
      {
        subject: 'log-service.spec',
        validate: undefined,
        authorize: undefined,
        handle: handlerHandle,
        middlewares: [
          {
            id: 'middleware-01',
            init: async () => {
              return {
                after: middlewareAfter01,
              };
            },
          },
          {
            id: 'middleware-02',
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
      subject: 'log-service.spec',
      data: { code: 200 },
    });

    expect(logService.messages).toHaveLength(4);
    expect(logService.messages[0]).toEqual('[log-service.spec]Begin');
    expect(logService.messages[1]).toEqual(
      '[log-service.spec][handle]Handling'
    );
    expect(logService.messages[2]).toEqual(
      `[log-service.spec][handle]UNHANDLED_ERROR`
    );
    expect(logService.messages[3]).toEqual('[log-service.spec]End');
  });
});
