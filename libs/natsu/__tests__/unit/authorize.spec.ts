import type { NatsRequest } from '@silenteer/natsu-type';
import {
  NatsAuthorizationResultUtil,
  NatsMiddlewareAuthorizationResultUtil,
} from '../../utility';
import NatsService from '../service/nats.service';

describe('Authorization stage', () => {
  let natsService: ReturnType<typeof NatsService.init>;

  beforeEach(async () => {
    natsService = NatsService.init();
  });

  afterEach(async () => {
    await natsService?.stop();
  });

  it('beforeAuthorizeMiddlewares & authorize & afterAuthorizeMiddlewares will execute orderly', async () => {
    const order: string[] = [];
    const mockHandlerAuthorize = jest.fn(async () => {
      order.push('handler.authorize.01');
      return NatsAuthorizationResultUtil.ok();
    });
    const mockMiddlewareBeforeAuthorize = jest.fn(async () => {
      order.push('before-authorize-middleware');
      return NatsMiddlewareAuthorizationResultUtil.ok(undefined);
    });
    const mockMiddlewareAfterAuthorize = jest.fn(async () => {
      order.push('after-authorize-middleware');
      return NatsMiddlewareAuthorizationResultUtil.ok(undefined);
    });

    natsService.register([
      {
        subject: 'handler.authorize.01',
        validate: undefined,
        authorize: mockHandlerAuthorize,
        handle: undefined,
        beforeAuthorizeMiddlewares: [
          {
            id: 'before-authorize-middleware',
            handle: mockMiddlewareBeforeAuthorize,
          },
        ],
        afterAuthorizeMiddlewares: [
          {
            id: 'after-authorize-middleware',
            handle: mockMiddlewareAfterAuthorize,
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
    expect(order[0]).toEqual('before-authorize-middleware');
    expect(order[1]).toEqual('handler.authorize.01');
    expect(order[2]).toEqual('after-authorize-middleware');
  });

  it('beforeAuthorizeMiddlewares failed, authorize & afterAuthorizeMiddlewares wont execute, respondError will execute', async () => {
    const order: string[] = [];
    const mockHandlerAuthorize = jest.fn(async () => {
      order.push('handler.authorize.01');
      return NatsAuthorizationResultUtil.ok();
    });
    const mockMiddlewareBeforeAuthorize = jest.fn(async () => {
      order.push('before-authorize-middleware');
      return NatsMiddlewareAuthorizationResultUtil.error();
    });
    const mockMiddlewareAfterAuthorize = jest.fn(async () => {
      order.push('after-authorize-middleware');
      return NatsMiddlewareAuthorizationResultUtil.ok(undefined);
    });
    const mockRespondError = jest.fn(async () => {
      order.push('on-respond-error-middleware');
    });

    natsService.register([
      {
        subject: 'handler.authorize.01',
        validate: undefined,
        authorize: mockHandlerAuthorize,
        handle: undefined,
        beforeAuthorizeMiddlewares: [
          {
            id: 'before-authorize-middleware',
            handle: mockMiddlewareBeforeAuthorize,
          },
        ],
        afterAuthorizeMiddlewares: [
          {
            id: 'after-authorize-middleware',
            handle: mockMiddlewareAfterAuthorize,
          },
        ],
        respondError: mockRespondError,
      },
    ]);
    await natsService.start();

    await natsService.request({
      subject: 'handler.authorize.01',
      data: { code: 200 },
    });

    expect(order).toHaveLength(2);
    expect(order[0]).toEqual('before-authorize-middleware');
    expect(order[1]).toEqual('on-respond-error-middleware');
  });

  it('beforeAuthorizeMiddlewares successed, authorize failed, afterAuthorizeMiddlewares wont execute, respondError will execute', async () => {
    const order: string[] = [];
    const mockHandlerAuthorize = jest.fn(async () => {
      order.push('handler.authorize.01');
      return NatsAuthorizationResultUtil.error();
    });
    const mockMiddlewareBeforeAuthorize = jest.fn(async () => {
      order.push('before-authorize-middleware');
      return NatsMiddlewareAuthorizationResultUtil.ok(undefined);
    });
    const mockMiddlewareAfterAuthorize = jest.fn(async () => {
      order.push('after-authorize-middleware');
      return NatsMiddlewareAuthorizationResultUtil.ok(undefined);
    });
    const mockRespondError = jest.fn(async () => {
      order.push('on-respond-error-middleware');
    });

    natsService.register([
      {
        subject: 'handler.authorize.01',
        validate: undefined,
        authorize: mockHandlerAuthorize,
        handle: undefined,
        beforeAuthorizeMiddlewares: [
          {
            id: 'before-authorize-middleware',
            handle: mockMiddlewareBeforeAuthorize,
          },
        ],
        afterAuthorizeMiddlewares: [
          {
            id: 'after-authorize-middleware',
            handle: mockMiddlewareAfterAuthorize,
          },
        ],
        respondError: mockRespondError,
      },
    ]);
    await natsService.start();

    await natsService.request({
      subject: 'handler.authorize.01',
      data: { code: 200 },
    });

    expect(order).toHaveLength(3);
    expect(order[0]).toEqual('before-authorize-middleware');
    expect(order[1]).toEqual('handler.authorize.01');
    expect(order[2]).toEqual('on-respond-error-middleware');
  });

  it('beforeAuthorizeMiddlewares failed in middle, authorize & afterAuthorizeMiddlewares wont execute, respondError will execute', async () => {
    const order: string[] = [];
    const mockHandlerAuthorize = jest.fn(async () => {
      order.push('handler.authorize.01');
      return NatsAuthorizationResultUtil.ok();
    });
    const mockMiddlewareBeforeAuthorize01 = jest.fn(async () => {
      order.push('before-authorize-middleware-01');
      return NatsMiddlewareAuthorizationResultUtil.ok(undefined);
    });
    const mockMiddlewareBeforeAuthorize02 = jest.fn(async () => {
      order.push('before-authorize-middleware-02');
      return NatsMiddlewareAuthorizationResultUtil.error();
    });
    const mockMiddlewareBeforeAuthorize03 = jest.fn(async () => {
      order.push('before-authorize-middleware-03');
      return NatsMiddlewareAuthorizationResultUtil.ok(undefined);
    });
    const mockMiddlewareAfterAuthorize = jest.fn(async () => {
      order.push('after-authorize-middleware');
      return NatsMiddlewareAuthorizationResultUtil.ok(undefined);
    });
    const mockRespondError = jest.fn(async () => {
      order.push('on-respond-error-middleware');
    });

    natsService.register([
      {
        subject: 'handler.authorize.01',
        validate: undefined,
        authorize: mockHandlerAuthorize,
        handle: undefined,
        beforeAuthorizeMiddlewares: [
          {
            id: 'before-authorize-middleware-01',
            handle: mockMiddlewareBeforeAuthorize01,
          },
          {
            id: 'before-authorize-middleware-02',
            handle: mockMiddlewareBeforeAuthorize02,
          },
          {
            id: 'before-authorize-middleware-03',
            handle: mockMiddlewareBeforeAuthorize03,
          },
        ],
        afterAuthorizeMiddlewares: [
          {
            id: 'after-authorize-middleware',
            handle: mockMiddlewareAfterAuthorize,
          },
        ],
        respondError: mockRespondError,
      },
    ]);
    await natsService.start();

    await natsService.request({
      subject: 'handler.authorize.01',
      data: { code: 200 },
    });

    expect(order).toHaveLength(3);
    expect(order[0]).toEqual('before-authorize-middleware-01');
    expect(order[1]).toEqual('before-authorize-middleware-02');
    expect(order[2]).toEqual('on-respond-error-middleware');
  });

  it('beforeAuthorizeMiddlewares & authorize successed, afterAuthorizeMiddlewares failed in middle, respondError will execute', async () => {
    const order: string[] = [];
    const mockHandlerAuthorize = jest.fn(async () => {
      order.push('handler.authorize.01');
      return NatsAuthorizationResultUtil.ok();
    });
    const mockMiddlewareBeforeAuthorize = jest.fn(async () => {
      order.push('before-authorize-middleware');
      return NatsMiddlewareAuthorizationResultUtil.ok(undefined);
    });
    const mockMiddlewareAfterAuthorize01 = jest.fn(async () => {
      order.push('after-authorize-middleware-01');
      return NatsMiddlewareAuthorizationResultUtil.ok(undefined);
    });
    const mockMiddlewareAfterAuthorize02 = jest.fn(async () => {
      order.push('after-authorize-middleware-02');
      return NatsMiddlewareAuthorizationResultUtil.error();
    });
    const mockMiddlewareAfterAuthorize03 = jest.fn(async () => {
      order.push('after-authorize-middleware-03');
      return NatsMiddlewareAuthorizationResultUtil.ok(undefined);
    });
    const mockRespondError = jest.fn(async () => {
      order.push('on-respond-error-middleware');
    });

    natsService.register([
      {
        subject: 'handler.authorize.01',
        validate: undefined,
        authorize: mockHandlerAuthorize,
        handle: undefined,
        beforeAuthorizeMiddlewares: [
          {
            id: 'before-authorize-middleware',
            handle: mockMiddlewareBeforeAuthorize,
          },
        ],
        afterAuthorizeMiddlewares: [
          {
            id: 'after-authorize-middleware-01',
            handle: mockMiddlewareAfterAuthorize01,
          },
          {
            id: 'after-authorize-middleware-02',
            handle: mockMiddlewareAfterAuthorize02,
          },
          {
            id: 'after-authorize-middleware-03',
            handle: mockMiddlewareAfterAuthorize03,
          },
        ],
        respondError: mockRespondError,
      },
    ]);
    await natsService.start();

    await natsService.request({
      subject: 'handler.authorize.01',
      data: { code: 200 },
    });

    expect(order).toHaveLength(5);
    expect(order[0]).toEqual('before-authorize-middleware');
    expect(order[1]).toEqual('handler.authorize.01');
    expect(order[2]).toEqual('after-authorize-middleware-01');
    expect(order[3]).toEqual('after-authorize-middleware-02');
    expect(order[4]).toEqual('on-respond-error-middleware');
  });

  it('Data will be changed while go through beforeAuthorizeMiddlewares, afterAuthorizeMiddlewares', async () => {
    const changes: Array<{ input: string; output: string }> = [];
    const mockAuthorize = jest.fn(async (data: NatsRequest<string>) => {
      changes.push({ input: data.body, output: data.body });
      return NatsAuthorizationResultUtil.ok();
    });
    const mockMiddlewareBeforeAuthorize01 = jest.fn(
      async (data: NatsRequest<string>) => {
        const changedData = { ...data, body: 'before-authorize-middleware-01' };
        changes.push({ input: data.body, output: changedData.body });
        return NatsMiddlewareAuthorizationResultUtil.ok(changedData);
      }
    );
    const mockMiddlewareBeforeAuthorize02 = jest.fn(
      async (data: NatsRequest<string>) => {
        const changedData = { ...data, body: 'before-authorize-middleware-02' };
        changes.push({ input: data.body, output: changedData.body });
        return NatsMiddlewareAuthorizationResultUtil.ok(changedData);
      }
    );
    const mockMiddlewareAfterAuthorize01 = jest.fn(
      async (data: NatsRequest<string>) => {
        const changedData = { ...data, body: 'after-authorize-middleware-01' };
        changes.push({ input: data.body, output: changedData.body });
        return NatsMiddlewareAuthorizationResultUtil.ok(changedData);
      }
    );
    const mockMiddlewareAfterAuthorize02 = jest.fn(
      async (data: NatsRequest<string>) => {
        const changedData = { ...data, body: 'after-authorize-middleware-02' };
        changes.push({ input: data.body, output: changedData.body });
        return NatsMiddlewareAuthorizationResultUtil.ok(changedData);
      }
    );

    natsService.register([
      {
        subject: 'handler.authorize.01',
        validate: undefined,
        authorize: mockAuthorize,
        handle: undefined,
        beforeAuthorizeMiddlewares: [
          {
            id: 'before-authorize-middleware-01',
            handle: mockMiddlewareBeforeAuthorize01,
          },
          {
            id: 'before-authorize-middleware-02',
            handle: mockMiddlewareBeforeAuthorize02,
          },
        ],
        afterAuthorizeMiddlewares: [
          {
            id: 'after-authorize-middleware-01',
            handle: mockMiddlewareAfterAuthorize01,
          },
          {
            id: 'after-authorize-middleware-02',
            handle: mockMiddlewareAfterAuthorize02,
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
      output: 'before-authorize-middleware-01',
    });
    expect(changes[1]).toMatchObject({
      input: 'before-authorize-middleware-01',
      output: 'before-authorize-middleware-02',
    });
    expect(changes[2]).toMatchObject({
      input: 'before-authorize-middleware-02',
      output: 'before-authorize-middleware-02',
    });
    expect(changes[3]).toMatchObject({
      input: 'before-authorize-middleware-02',
      output: 'after-authorize-middleware-01',
    });
    expect(changes[4]).toMatchObject({
      input: 'after-authorize-middleware-01',
      output: 'after-authorize-middleware-02',
    });
  });
});
