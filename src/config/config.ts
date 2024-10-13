import * as dotenv from "dotenv";
dotenv.config({ path: ".env.dev" });
export default {
  port: parseInt(process.env.PORT),
  apiPrefix: "/api/v1",
  jwt: {
    secret: "super secret",
  },
};
