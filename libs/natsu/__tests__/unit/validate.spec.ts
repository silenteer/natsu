import type { NatsRequest } from '@silenteer/natsu-type';
import {
  NatsValidationResultUtil,
  NatsMiddlewareValidationResultUtil,
} from '../../utility';
import NatsService from '../service/nats.service';

describe('Validation stage', () => {
  let natsService: ReturnType<typeof NatsService.init>;

  beforeEach(async () => {
    natsService = NatsService.init();
  });

  afterEach(async () => {
    await natsService?.stop();
  });

  it('beforeValidateMiddlewares & validate & afterValidateMiddlewares will execute orderly', async () => {
    const order: string[] = [];
    const mockHandlerValidate = jest.fn(async () => {
      order.push('handler.validate.01');
      return NatsValidationResultUtil.ok();
    });
    const mockMiddlewareBeforeValidate = jest.fn(async () => {
      order.push('before-validate-middleware');
      return NatsMiddlewareValidationResultUtil.ok(undefined);
    });
    const mockMiddlewareAfterValidate = jest.fn(async () => {
      order.push('after-validate-middleware');
      return NatsMiddlewareValidationResultUtil.ok(undefined);
    });

    natsService.register([
      {
        subject: 'handler.validate.01',
        validate: mockHandlerValidate,
        authorize: undefined,
        handle: undefined,
        beforeValidateMiddlewares: [
          {
            id: 'before-validate-middleware',
            handle: mockMiddlewareBeforeValidate,
          },
        ],
        afterValidateMiddlewares: [
          {
            id: 'after-validate-middleware',
            handle: mockMiddlewareAfterValidate,
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
    expect(order[0]).toEqual('before-validate-middleware');
    expect(order[1]).toEqual('handler.validate.01');
    expect(order[2]).toEqual('after-validate-middleware');
  });

  it('beforeValidateMiddlewares failed, validate & afterValidateMiddlewares wont execute, respondError will execute', async () => {
    const order: string[] = [];
    const mockHandlerValidate = jest.fn(async () => {
      order.push('handler.validate.01');
      return NatsValidationResultUtil.ok();
    });
    const mockMiddlewareBeforeValidate = jest.fn(async () => {
      order.push('before-validate-middleware');
      return NatsMiddlewareValidationResultUtil.error();
    });
    const mockMiddlewareAfterValidate = jest.fn(async () => {
      order.push('after-validate-middleware');
      return NatsMiddlewareValidationResultUtil.ok(undefined);
    });
    const mockRespondError = jest.fn(async () => {
      order.push('on-respond-error-middleware');
    });

    natsService.register([
      {
        subject: 'handler.validate.01',
        validate: mockHandlerValidate,
        authorize: undefined,
        handle: undefined,
        beforeValidateMiddlewares: [
          {
            id: 'before-validate-middleware',
            handle: mockMiddlewareBeforeValidate,
          },
        ],
        afterValidateMiddlewares: [
          {
            id: 'after-validate-middleware',
            handle: mockMiddlewareAfterValidate,
          },
        ],
        respondError: mockRespondError,
      },
    ]);
    await natsService.start();

    await natsService.request({
      subject: 'handler.validate.01',
      data: { code: 200 },
    });

    expect(order).toHaveLength(2);
    expect(order[0]).toEqual('before-validate-middleware');
    expect(order[1]).toEqual('on-respond-error-middleware');
  });

  it('beforeValidateMiddlewares successed, validate failed, afterValidateMiddlewares wont execute, respondError will execute', async () => {
    const order: string[] = [];
    const mockHandlerValidate = jest.fn(async () => {
      order.push('handler.validate.01');
      return NatsValidationResultUtil.error();
    });
    const mockMiddlewareBeforeValidate = jest.fn(async () => {
      order.push('before-validate-middleware');
      return NatsMiddlewareValidationResultUtil.ok(undefined);
    });
    const mockMiddlewareAfterValidate = jest.fn(async () => {
      order.push('after-validate-middleware');
      return NatsMiddlewareValidationResultUtil.ok(undefined);
    });
    const mockRespondError = jest.fn(async () => {
      order.push('on-respond-error-middleware');
    });

    natsService.register([
      {
        subject: 'handler.validate.01',
        validate: mockHandlerValidate,
        authorize: undefined,
        handle: undefined,
        beforeValidateMiddlewares: [
          {
            id: 'before-validate-middleware',
            handle: mockMiddlewareBeforeValidate,
          },
        ],
        afterValidateMiddlewares: [
          {
            id: 'after-validate-middleware',
            handle: mockMiddlewareAfterValidate,
          },
        ],
        respondError: mockRespondError,
      },
    ]);
    await natsService.start();

    await natsService.request({
      subject: 'handler.validate.01',
      data: { code: 200 },
    });

    expect(order).toHaveLength(3);
    expect(order[0]).toEqual('before-validate-middleware');
    expect(order[1]).toEqual('handler.validate.01');
    expect(order[2]).toEqual('on-respond-error-middleware');
  });

  it('beforeValidateMiddlewares failed in middle, validate & afterValidateMiddlewares wont execute, respondError will execute', async () => {
    const order: string[] = [];
    const mockHandlerValidate = jest.fn(async () => {
      order.push('handler.validate.01');
      return NatsValidationResultUtil.ok();
    });
    const mockMiddlewareBeforeValidate01 = jest.fn(async () => {
      order.push('before-validate-middleware-01');
      return NatsMiddlewareValidationResultUtil.ok(undefined);
    });
    const mockMiddlewareBeforeValidate02 = jest.fn(async () => {
      order.push('before-validate-middleware-02');
      return NatsMiddlewareValidationResultUtil.error();
    });
    const mockMiddlewareBeforeValidate03 = jest.fn(async () => {
      order.push('before-validate-middleware-03');
      return NatsMiddlewareValidationResultUtil.ok(undefined);
    });
    const mockMiddlewareAfterValidate = jest.fn(async () => {
      order.push('after-validate-middleware');
      return NatsMiddlewareValidationResultUtil.ok(undefined);
    });
    const mockRespondError = jest.fn(async () => {
      order.push('on-respond-error-middleware');
    });

    natsService.register([
      {
        subject: 'handler.validate.01',
        validate: mockHandlerValidate,
        authorize: undefined,
        handle: undefined,
        beforeValidateMiddlewares: [
          {
            id: 'before-validate-middleware-01',
            handle: mockMiddlewareBeforeValidate01,
          },
          {
            id: 'before-validate-middleware-02',
            handle: mockMiddlewareBeforeValidate02,
          },
          {
            id: 'before-validate-middleware-03',
            handle: mockMiddlewareBeforeValidate03,
          },
        ],
        afterValidateMiddlewares: [
          {
            id: 'after-validate-middleware',
            handle: mockMiddlewareAfterValidate,
          },
        ],
        respondError: mockRespondError,
      },
    ]);
    await natsService.start();

    await natsService.request({
      subject: 'handler.validate.01',
      data: { code: 200 },
    });

    expect(order).toHaveLength(3);
    expect(order[0]).toEqual('before-validate-middleware-01');
    expect(order[1]).toEqual('before-validate-middleware-02');
    expect(order[2]).toEqual('on-respond-error-middleware');
  });

  it('beforeValidateMiddlewares & validate successed, afterValidateMiddlewares failed in middle, respondError will execute', async () => {
    const order: string[] = [];
    const mockHandlerValidate = jest.fn(async () => {
      order.push('handler.validate.01');
      return NatsValidationResultUtil.ok();
    });
    const mockMiddlewareBeforeValidate = jest.fn(async () => {
      order.push('before-validate-middleware');
      return NatsMiddlewareValidationResultUtil.ok(undefined);
    });
    const mockMiddlewareAfterValidate01 = jest.fn(async () => {
      order.push('after-validate-middleware-01');
      return NatsMiddlewareValidationResultUtil.ok(undefined);
    });
    const mockMiddlewareAfterValidate02 = jest.fn(async () => {
      order.push('after-validate-middleware-02');
      return NatsMiddlewareValidationResultUtil.error();
    });
    const mockMiddlewareAfterValidate03 = jest.fn(async () => {
      order.push('after-validate-middleware-03');
      return NatsMiddlewareValidationResultUtil.ok(undefined);
    });
    const mockRespondError = jest.fn(async () => {
      order.push('on-respond-error-middleware');
    });

    natsService.register([
      {
        subject: 'handler.validate.01',
        validate: mockHandlerValidate,
        authorize: undefined,
        handle: undefined,
        beforeValidateMiddlewares: [
          {
            id: 'before-validate-middleware',
            handle: mockMiddlewareBeforeValidate,
          },
        ],
        afterValidateMiddlewares: [
          {
            id: 'after-validate-middleware-01',
            handle: mockMiddlewareAfterValidate01,
          },
          {
            id: 'after-validate-middleware-02',
            handle: mockMiddlewareAfterValidate02,
          },
          {
            id: 'after-validate-middleware-03',
            handle: mockMiddlewareAfterValidate03,
          },
        ],
        respondError: mockRespondError,
      },
    ]);
    await natsService.start();

    await natsService.request({
      subject: 'handler.validate.01',
      data: { code: 200 },
    });

    expect(order).toHaveLength(5);
    expect(order[0]).toEqual('before-validate-middleware');
    expect(order[1]).toEqual('handler.validate.01');
    expect(order[2]).toEqual('after-validate-middleware-01');
    expect(order[3]).toEqual('after-validate-middleware-02');
    expect(order[4]).toEqual('on-respond-error-middleware');
  });

  it('Data will be changed while go through beforeValidateMiddlewares, afterValidateMiddlewares', async () => {
    const changes: Array<{ input: string; output: string }> = [];
    const mockValidate = jest.fn(async (data: NatsRequest<string>) => {
      changes.push({ input: data.body, output: data.body });
      return NatsValidationResultUtil.ok();
    });
    const mockMiddlewareBeforeValidate01 = jest.fn(
      async (data: NatsRequest<string>) => {
        const changedData = { ...data, body: 'before-validate-middleware-01' };
        changes.push({ input: data.body, output: changedData.body });
        return NatsMiddlewareValidationResultUtil.ok(changedData);
      }
    );
    const mockMiddlewareBeforeValidate02 = jest.fn(
      async (data: NatsRequest<string>) => {
        const changedData = { ...data, body: 'before-validate-middleware-02' };
        changes.push({ input: data.body, output: changedData.body });
        return NatsMiddlewareValidationResultUtil.ok(changedData);
      }
    );
    const mockMiddlewareAfterValidate01 = jest.fn(
      async (data: NatsRequest<string>) => {
        const changedData = { ...data, body: 'after-validate-middleware-01' };
        changes.push({ input: data.body, output: changedData.body });
        return NatsMiddlewareValidationResultUtil.ok(changedData);
      }
    );
    const mockMiddlewareAfterValidate02 = jest.fn(
      async (data: NatsRequest<string>) => {
        const changedData = { ...data, body: 'after-validate-middleware-02' };
        changes.push({ input: data.body, output: changedData.body });
        return NatsMiddlewareValidationResultUtil.ok(changedData);
      }
    );

    natsService.register([
      {
        subject: 'handler.validate.01',
        validate: mockValidate,
        authorize: undefined,
        handle: undefined,
        beforeValidateMiddlewares: [
          {
            id: 'before-validate-middleware-01',
            handle: mockMiddlewareBeforeValidate01,
          },
          {
            id: 'before-validate-middleware-02',
            handle: mockMiddlewareBeforeValidate02,
          },
        ],
        afterValidateMiddlewares: [
          {
            id: 'after-validate-middleware-01',
            handle: mockMiddlewareAfterValidate01,
          },
          {
            id: 'after-validate-middleware-02',
            handle: mockMiddlewareAfterValidate02,
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
      output: 'before-validate-middleware-01',
    });
    expect(changes[1]).toMatchObject({
      input: 'before-validate-middleware-01',
      output: 'before-validate-middleware-02',
    });
    expect(changes[2]).toMatchObject({
      input: 'before-validate-middleware-02',
      output: 'before-validate-middleware-02',
    });
    expect(changes[3]).toMatchObject({
      input: 'before-validate-middleware-02',
      output: 'after-validate-middleware-01',
    });
    expect(changes[4]).toMatchObject({
      input: 'after-validate-middleware-01',
      output: 'after-validate-middleware-02',
    });
  });
});
