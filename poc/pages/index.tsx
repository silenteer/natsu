import { request } from "@natsu/port";
import { GetCareProviders } from "@natsu/types";
import usePromise from "react-use-promise";

export default function Home() {
  const [result] = usePromise(() => {
    return request<GetCareProviders>("api.v2.mobile.patient.getCareProviders", {
      ids: ["1", "2", "3"],
    });
  }, []);

  return <div>{result && JSON.stringify(result)}</div>;
}
