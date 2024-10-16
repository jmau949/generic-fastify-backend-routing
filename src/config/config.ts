import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });
export default {
  port: parseInt(process.env.PORT),
  apiPrefix: "/api/v1",
  jwt: {
    secret: "super secret",
  },
};
