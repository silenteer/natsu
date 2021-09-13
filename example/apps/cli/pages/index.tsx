import { GetCareProviders } from "service-types";
import usePromise from "react-use-promise";
import { request } from "../services";

export default function Home() {
  const [result] = usePromise(() => {
    return request<GetCareProviders>("api.v2.mobile.patient.getCareProviders", {
      ids: ["1", "2", "3"],
    });
  }, []);

  return <div>{result && JSON.stringify(result)}</div>;
}
