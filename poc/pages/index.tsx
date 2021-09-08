import { request } from "@natsu/port";
import { IGetCareProviders } from "@natsu/types";
import usePromise from "react-use-promise";

export default function Home() {
  const [result] = usePromise(() => {
    return request<IGetCareProviders>(
      "api.v2.mobile.patient.getCareProviders",
      { ids: ["1", "2", "3"] }
    );
  }, []);

  return <div>{result && JSON.stringify(result)}</div>;
}
