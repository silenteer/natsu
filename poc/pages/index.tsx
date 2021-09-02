import { request } from "@natsu/port";
import usePromise from "react-use-promise";

export default function Home() {
  const [result] = usePromise(async () => {
    return await request<{ msg: string }>("api.test.hello", { msg: "hello" });
  }, []);

  return <div>{result && JSON.stringify(result.body)}</div>;
}
