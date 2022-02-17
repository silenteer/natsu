import type { NatsRequest } from '@silenteer/natsu-type';
import type { NatsHandleResult } from '../../type';
import {
  NatsHandleResultUtil,
  NatsMiddlewareHandleResultUtil,
} from '../../utility';
import NatsService from '../service/nats.service';

describe('Handle stage', () => {
  let natsService: ReturnType<typeof NatsService.init>;

  beforeEach(async () => {
    natsService = NatsService.init();
  });

  afterEach(async () => {
    await natsService?.stop();
  });

  it('beforeHandleMiddlewares & handle & afterHandleMiddlewares will execute orderly', async () => {
    const order: string[] = [];
    const mockHandlerHandle = jest.fn(async () => {
      order.push('handler.handle.01');
      return NatsHandleResultUtil.ok();
    });
    const mockMiddlewareBeforeHandle = jest.fn(async () => {
      order.push('before-handle-middleware');
      return NatsMiddlewareHandleResultUtil.ok(undefined);
    });
    const mockMiddlewareAfterHandle = jest.fn(async () => {
      order.push('after-handle-middleware');
      return NatsMiddlewareHandleResultUtil.ok(undefined);
    });

    natsService.register([
      {
        subject: 'handler.handle.01',
        validate: undefined,
        authorize: undefined,
        handle: mockHandlerHandle,
        beforeHandleMiddlewares: [
          {
            id: 'before-handle-middleware',
            handle: mockMiddlewareBeforeHandle,
          },
        ],
        afterHandleMiddlewares: [
          {
            id: 'after-handle-middleware',
            handle: mockMiddlewareAfterHandle,
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
    expect(order[0]).toEqual('before-handle-middleware');
    expect(order[1]).toEqual('handler.handle.01');
    expect(order[2]).toEqual('after-handle-middleware');
  });

  it('beforeHandleMiddlewares failed, handle & afterHandleMiddlewares wont execute, respondError will execute', async () => {
    const order: string[] = [];
    const mockHandlerHandle = jest.fn(async () => {
      order.push('handler.handle.01');
      return NatsHandleResultUtil.ok();
    });
    const mockMiddlewareBeforeHandle = jest.fn(async () => {
      order.push('before-handle-middleware');
      return NatsMiddlewareHandleResultUtil.error();
    });
    const mockMiddlewareAfterHandle = jest.fn(async () => {
      order.push('after-handle-middleware');
      return NatsMiddlewareHandleResultUtil.ok(undefined);
    });
    const mockRespondError = jest.fn(async () => {
      order.push('on-respond-error-middleware');
    });

    natsService.register([
      {
        subject: 'handler.handle.01',
        validate: undefined,
        authorize: undefined,
        handle: mockHandlerHandle,
        beforeHandleMiddlewares: [
          {
            id: 'before-handle-middleware',
            handle: mockMiddlewareBeforeHandle,
          },
        ],
        afterHandleMiddlewares: [
          {
            id: 'after-handle-middleware',
            handle: mockMiddlewareAfterHandle,
          },
        ],
        respondError: mockRespondError,
      },
    ]);
    await natsService.start();

    await natsService.request({
      subject: 'handler.handle.01',
      data: { code: 200 },
    });

    expect(order).toHaveLength(2);
    expect(order[0]).toEqual('before-handle-middleware');
    expect(order[1]).toEqual('on-respond-error-middleware');
  });

  it('beforeHandleMiddlewares successed, handle failed, afterHandleMiddlewares wont execute, respondError will execute', async () => {
    const order: string[] = [];
    const mockHandlerHandle = jest.fn(async () => {
      order.push('handler.handle.01');
      return NatsHandleResultUtil.error();
    });
    const mockMiddlewareBeforeHandle = jest.fn(async () => {
      order.push('before-handle-middleware');
      return NatsMiddlewareHandleResultUtil.ok(undefined);
    });
    const mockMiddlewareAfterHandle = jest.fn(async () => {
      order.push('after-handle-middleware');
      return NatsMiddlewareHandleResultUtil.ok(undefined);
    });
    const mockRespondError = jest.fn(async () => {
      order.push('on-respond-error-middleware');
    });

    natsService.register([
      {
        subject: 'handler.handle.01',
        validate: undefined,
        authorize: undefined,
        handle: mockHandlerHandle,
        beforeHandleMiddlewares: [
          {
            id: 'before-handle-middleware',
            handle: mockMiddlewareBeforeHandle,
          },
        ],
        afterHandleMiddlewares: [
          {
            id: 'after-handle-middleware',
            handle: mockMiddlewareAfterHandle,
          },
        ],
        respondError: mockRespondError,
      },
    ]);
    await natsService.start();

    await natsService.request({
      subject: 'handler.handle.01',
      data: { code: 200 },
    });

    expect(order).toHaveLength(3);
    expect(order[0]).toEqual('before-handle-middleware');
    expect(order[1]).toEqual('handler.handle.01');
    expect(order[2]).toEqual('on-respond-error-middleware');
  });

  it('beforeHandleMiddlewares failed in middle, handle & afterHandleMiddlewares wont execute, respondError will execute', async () => {
    const order: string[] = [];
    const mockHandlerHandle = jest.fn(async () => {
      order.push('handler.handle.01');
      return NatsHandleResultUtil.ok();
    });
    const mockMiddlewareBeforeHandle01 = jest.fn(async () => {
      order.push('before-handle-middleware-01');
      return NatsMiddlewareHandleResultUtil.ok(undefined);
    });
    const mockMiddlewareBeforeHandle02 = jest.fn(async () => {
      order.push('before-handle-middleware-02');
      return NatsMiddlewareHandleResultUtil.error();
    });
    const mockMiddlewareBeforeHandle03 = jest.fn(async () => {
      order.push('before-handle-middleware-03');
      return NatsMiddlewareHandleResultUtil.ok(undefined);
    });
    const mockMiddlewareAfterHandle = jest.fn(async () => {
      order.push('after-handle-middleware');
      return NatsMiddlewareHandleResultUtil.ok(undefined);
    });
    const mockRespondError = jest.fn(async () => {
      order.push('on-respond-error-middleware');
    });

    natsService.register([
      {
        subject: 'handler.handle.01',
        validate: undefined,
        authorize: undefined,
        handle: mockHandlerHandle,
        beforeHandleMiddlewares: [
          {
            id: 'before-handle-middleware-01',
            handle: mockMiddlewareBeforeHandle01,
          },
          {
            id: 'before-handle-middleware-02',
            handle: mockMiddlewareBeforeHandle02,
          },
          {
            id: 'before-handle-middleware-03',
            handle: mockMiddlewareBeforeHandle03,
          },
        ],
        afterHandleMiddlewares: [
          {
            id: 'after-handle-middleware',
            handle: mockMiddlewareAfterHandle,
          },
        ],
        respondError: mockRespondError,
      },
    ]);
    await natsService.start();

    await natsService.request({
      subject: 'handler.handle.01',
      data: { code: 200 },
    });

    expect(order).toHaveLength(3);
    expect(order[0]).toEqual('before-handle-middleware-01');
    expect(order[1]).toEqual('before-handle-middleware-02');
    expect(order[2]).toEqual('on-respond-error-middleware');
  });

  it('beforeHandleMiddlewares & handle successed, afterHandleMiddlewares failed in middle, respondError will execute', async () => {
    const order: string[] = [];
    const mockHandlerHandle = jest.fn(async () => {
      order.push('handler.handle.01');
      return NatsHandleResultUtil.ok();
    });
    const mockMiddlewareBeforeHandle = jest.fn(async () => {
      order.push('before-handle-middleware');
      return NatsMiddlewareHandleResultUtil.ok(undefined);
    });
    const mockMiddlewareAfterHandle01 = jest.fn(async () => {
      order.push('after-handle-middleware-01');
      return NatsMiddlewareHandleResultUtil.ok(undefined);
    });
    const mockMiddlewareAfterHandle02 = jest.fn(async () => {
      order.push('after-handle-middleware-02');
      return NatsMiddlewareHandleResultUtil.error();
    });
    const mockMiddlewareAfterHandle03 = jest.fn(async () => {
      order.push('after-handle-middleware-03');
      return NatsMiddlewareHandleResultUtil.ok(undefined);
    });
    const mockRespondError = jest.fn(async () => {
      order.push('on-respond-error-middleware');
    });

    natsService.register([
      {
        subject: 'handler.handle.01',
        validate: undefined,
        authorize: undefined,
        handle: mockHandlerHandle,
        beforeHandleMiddlewares: [
          {
            id: 'before-handle-middleware',
            handle: mockMiddlewareBeforeHandle,
          },
        ],
        afterHandleMiddlewares: [
          {
            id: 'after-handle-middleware-01',
            handle: mockMiddlewareAfterHandle01,
          },
          {
            id: 'after-handle-middleware-02',
            handle: mockMiddlewareAfterHandle02,
          },
          {
            id: 'after-handle-middleware-03',
            handle: mockMiddlewareAfterHandle03,
          },
        ],
        respondError: mockRespondError,
      },
    ]);
    await natsService.start();

    await natsService.request({
      subject: 'handler.handle.01',
      data: { code: 200 },
    });

    expect(order).toHaveLength(5);
    expect(order[0]).toEqual('before-handle-middleware');
    expect(order[1]).toEqual('handler.handle.01');
    expect(order[2]).toEqual('after-handle-middleware-01');
    expect(order[3]).toEqual('after-handle-middleware-02');
    expect(order[4]).toEqual('on-respond-error-middleware');
  });

  it('Data & result will be changed while go through beforeHandleMiddlewares, afterHandleMiddlewares', async () => {
    const dataChanges: Array<{ input: string; output: string }> = [];
    const resultChanges: Array<{ input: string; output: string }> = [];
    const mockHandlerHandle = jest.fn(async (data: NatsRequest<string>) => {
      dataChanges.push({ input: data.body, output: data.body });
      return NatsHandleResultUtil.ok(data.body);
    });
    const mockMiddlewareBeforeHandle01 = jest.fn(
      async (data: NatsRequest<string>) => {
        const changedData = { ...data, body: 'before-handle-middleware-01' };
        dataChanges.push({ input: data.body, output: changedData.body });
        return NatsMiddlewareHandleResultUtil.ok({ data: changedData });
      }
    );
    const mockMiddlewareBeforeHandle02 = jest.fn(
      async (data: NatsRequest<string>) => {
        const changedData = { ...data, body: 'before-handle-middleware-02' };
        dataChanges.push({ input: data.body, output: changedData.body });
        return NatsMiddlewareHandleResultUtil.ok({ data: changedData });
      }
    );
    const mockMiddlewareAfterHandle01 = jest.fn(
      async (data: NatsRequest<string>, result: NatsHandleResult<string>) => {
        const changedData = { ...data, body: 'after-handle-middleware-01' };
        const changedResult = { ...result, body: 'after-handle-middleware-01' };
        dataChanges.push({ input: data.body, output: changedData.body });
        resultChanges.push({ input: result.body, output: changedResult.body });

        return NatsMiddlewareHandleResultUtil.ok({
          data: changedData,
          result: changedResult,
        });
      }
    );
    const mockMiddlewareAfterHandle02 = jest.fn(
      async (data: NatsRequest<string>, result: NatsHandleResult<string>) => {
        const changedData = { ...data, body: 'after-handle-middleware-02' };
        const changedResult = { ...result, body: 'after-handle-middleware-02' };
        dataChanges.push({ input: data.body, output: changedData.body });
        resultChanges.push({ input: result.body, output: changedResult.body });
        return NatsMiddlewareHandleResultUtil.ok({
          data: changedData,
          result: changedResult,
        });
      }
    );

    natsService.register([
      {
        subject: 'handler.handle.01',
        validate: undefined,
        authorize: undefined,
        handle: mockHandlerHandle,
        beforeHandleMiddlewares: [
          {
            id: 'before-handle-middleware-01',
            handle: mockMiddlewareBeforeHandle01,
          },
          {
            id: 'before-handle-middleware-02',
            handle: mockMiddlewareBeforeHandle02,
          },
        ],
        afterHandleMiddlewares: [
          {
            id: 'after-handle-middleware-01',
            handle: mockMiddlewareAfterHandle01,
          },
          {
            id: 'after-handle-middleware-02',
            handle: mockMiddlewareAfterHandle02,
          },
        ],
      },
    ]);
    await natsService.start();

    await natsService.request({
      subject: 'handler.handle.01',
      data: { code: 200, body: 'data' },
    });

    expect(dataChanges).toHaveLength(5);
    expect(dataChanges[0]).toMatchObject({
      input: 'data',
      output: 'before-handle-middleware-01',
    });
    expect(dataChanges[1]).toMatchObject({
      input: 'before-handle-middleware-01',
      output: 'before-handle-middleware-02',
    });
    expect(dataChanges[2]).toMatchObject({
      input: 'before-handle-middleware-02',
      output: 'before-handle-middleware-02',
    });
    expect(dataChanges[3]).toMatchObject({
      input: 'before-handle-middleware-02',
      output: 'after-handle-middleware-01',
    });
    expect(dataChanges[4]).toMatchObject({
      input: 'after-handle-middleware-01',
      output: 'after-handle-middleware-02',
    });

    expect(resultChanges).toHaveLength(2);
    expect(resultChanges[0]).toMatchObject({
      input: 'before-handle-middleware-02',
      output: 'after-handle-middleware-01',
    });
    expect(resultChanges[1]).toMatchObject({
      input: 'after-handle-middleware-01',
      output: 'after-handle-middleware-02',
    });
  });
});
