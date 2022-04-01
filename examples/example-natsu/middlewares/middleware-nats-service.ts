import { JSONCodec } from 'nats';
import type {
  NatsRequest,
  NatsResponse,
  NatsService,
} from '@silenteer/natsu-type';
import type { NatsMiddleware } from '@silenteer/natsu';
import type { NatsGetNamespace } from 'example-type';

const NatsServiceMiddleware: NatsMiddleware<
  NatsService<string, unknown, unknown>
> = {
  id: 'nats-service',
  init: async () => {
    return {
      before: async ({ data, injection }) => {
        const getNamespaceSubject = process.env.NATS_GET_NAMESPACE_SUBJECT;
        const namespaceSubjects =
          process.env.NATS_NAMESPACE_SUBJECTS?.split(',') || [];

        const originalNatsService = injection.natsService;

        injection.natsService = {
          ...originalNatsService,
          publish: async (subject, data, opts) => {
            const shouldSetNamespace =
              getNamespaceSubject && namespaceSubjects?.includes(subject);

            let _subject = subject;
            if (shouldSetNamespace) {
              try {
                const { headers } = data || {};
                const natsRequest: NatsRequest<unknown> = {
                  headers,
                  body: { subject },
                };

                const message = await originalNatsService.request(
                  getNamespaceSubject,
                  natsRequest
                );
                const natsResponse = JSONCodec<NatsResponse>().decode(
                  message.data
                );
                const { namespace } = (natsResponse.body ||
                  {}) as NatsGetNamespace['response'];

                if (namespace) {
                  _subject = `${subject}.${namespace}`;
                } else {
                  throw new Error(`Namespace is required`);
                }
              } catch (error) {
                injection.logService.error(`Get namespace failed`);
                throw error;
              }
            }

            return originalNatsService.publish(_subject, data, opts);
          },
        };

        return injection.ok({ data, injection });
      },
    };
  },
};

export default NatsServiceMiddleware;
