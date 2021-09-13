import * as yup from "yup";
import type {
  NatsPortReq,
  GetCareProvidersRequest,
  GetCareProvidersResponse,
  GetCareProviders,
} from "@natsu/types";

type NatsAuthorizationResponse = {
  code: 200 | 403;
  message?: string;
};

type NatsValidationResponse = {
  code: 200 | 400;
  message?: string;
  body?: unknown;
};

type NatsValidate = (
  data: NatsPortReq<GetCareProvidersRequest>
) => Promise<NatsValidationResponse>;

type NatsAuthorize = (
  data: NatsPortReq<GetCareProvidersRequest>
) => Promise<NatsAuthorizationResponse>;

type NatsHandle = (
  data: NatsPortReq<GetCareProvidersRequest>
) => Promise<GetCareProvidersResponse>;

type NatsHandler = {
  subject: GetCareProviders["subject"];
  validate: NatsValidate;
  authorize: NatsAuthorize;
  handle: NatsHandle;
};

type CareProvider = {
  id: string;
  name: string;
};

const schema = yup.array(yup.string().trim().min(1)).required().min(1);

const validate: NatsValidate = async (natsData) => {
  const { body } = natsData;
  const careProviderIds = body?.ids;
  try {
    schema.validateSync(careProviderIds);
    return { code: 200 } as NatsValidationResponse;
  } catch (error) {
    return {
      code: 400,
      body: (error as never)?.["errors"],
    } as NatsValidationResponse;
  }
};

const authorize: NatsAuthorize = async (natsData) => {
  return { code: 200 } as NatsAuthorizationResponse;
};

const handle: NatsHandle = async (natsData) => {
  const { body } = natsData;
  const careProviderIds = body.ids;

  const careProviders: CareProvider[] = careProviderIds.map((id) => ({
    id,
    name: `careprovider-${id}`,
  }));

  return careProviders;
};

export type { CareProvider };
const NatsGetCareProvidersHandler: NatsHandler = {
  subject: "api.v2.mobile.patient.getCareProviders",
  validate,
  authorize,
  handle,
};

export default NatsGetCareProvidersHandler;
