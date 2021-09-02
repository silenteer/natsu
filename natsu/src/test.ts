import { natsu } from ".";

let server;

server = natsu();
server.register(import("./api.test.hello.natsu"));

async function main() {
  await server.start(() => {
    console.log("server is started");
  });
}

main();
