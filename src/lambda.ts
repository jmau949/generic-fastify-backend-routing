import "reflect-metadata";
import fastify, { FastifyInstance } from "fastify";
import awsLambdaFastify from "@fastify/aws-lambda";
import { Context, APIGatewayProxyEvent } from "aws-lambda";
import cors from "@fastify/cors";
import fastifyCookie from "@fastify/cookie";
import fastifyHelmet from "@fastify/helmet";

// Import your controllers and configurations
import { userController } from "./controllers/user-controllers";
import config from "./config/config";
import corsConfig from "./config/corsConfig";
import auth from "./plugins/auth";

// Create the Fastify app
const app: FastifyInstance = fastify({ logger: true });

// Register plugins
const env = (process.env.NODE_ENV as keyof typeof corsConfig) || "dev";
app.register(fastifyHelmet);
app.register(cors, corsConfig[env]);
app.register(fastifyCookie, {
  parseOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  },
});
app.register(auth);

// Register controllers
app.register(userController, {
  prefix: `${config.apiPrefix}/users`,
});

// Create the Lambda handler
const proxy = awsLambdaFastify(app);
export const handler = async (event: APIGatewayProxyEvent, context: Context) => {
  return proxy(event, context);
};
