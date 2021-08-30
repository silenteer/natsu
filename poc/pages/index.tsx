import { connect } from "nats.port";
import usePromise from "react-use-promise";

const nc = connect({ serverURL: new URL("http://localhost:8080") });

export default function Home() {
  const [result] = usePromise(async () => {
    return await nc.request("api.test.hello", { msg: "hello" });
  }, []);

  return <div>{result && JSON.stringify(result)}</div>;
}

function Run() {}
