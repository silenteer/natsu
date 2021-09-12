import { connect } from "@natsu/port";

export const request = connect({ serverURL: new URL("http://localhost:8080") });
