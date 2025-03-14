import "reflect-metadata";
import fastify, { FastifyInstance, FastifyRequest } from "fastify";
import awsLambdaFastify from "@fastify/aws-lambda";
import { Context, APIGatewayProxyEvent } from "aws-lambda";
import cors from "@fastify/cors";
import fastifyCookie from "@fastify/cookie";
import fastifyHelmet from "@fastify/helmet";
import fastifyRateLimit from "@fastify/rate-limit";
import * as Sentry from "@sentry/node";
import { v4 as uuidv4 } from "uuid";

// Import your controllers and configurations
import sentryMonitoring from "./plugins/sentry-monitoring";
import { userController } from "./controllers/user-controllers";
import config from "./config/config";
import corsConfig from "./config/corsConfig";
import auth from "./plugins/auth";
import errorPlugin from "./plugins/error-handler";
import { sendErrorResponse } from "./utils/error-handler";
import logger, { loggerOptions } from "./utils/logger";

// Create the Fastify app
const app: FastifyInstance = fastify({
  logger: loggerOptions,
  // Generate request ID for each request
  genReqId: (request) => {
    // Extract request ID from Lambda event headers or generate new one
    return (request.headers["x-request-id"] as string) || uuidv4();
  },
  trustProxy: process.env.NODE_ENV === "production", // Trust proxy headers in production
});

// Register plugins
const registerPlugins = () => {
  const env = (process.env.NODE_ENV as keyof typeof corsConfig) || "dev";

  // Register Sentry monitoring first
  app.register(sentryMonitoring);

  // Register security plugins
  app.register(fastifyHelmet);

  // Register CORS
  app.register(cors, corsConfig[env]);

  // Register cookie handling
  app.register(fastifyCookie, {
    parseOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 1 week
    },
  });

  // Rate limiting for security
  app.register(fastifyRateLimit, {
    max: 100,
    timeWindow: "1 minute",
    // Skip rate limiting for health checks
    skip: (request: FastifyRequest) => request.url.startsWith("/health"),
  } as any);

  // Register authentication plugin
  app.register(auth);

  // Register request tracking and error handling
  app.register(errorPlugin);
};

// Register all controllers
const registerControllers = () => {
  // Health check endpoint for load balancers
  app.get("/health", async (request, reply) => {
    return { status: "ok", timestamp: new Date().toISOString() };
  });

  // Register user routes
  app.register(userController, {
    prefix: `${config.apiPrefix}/users`,
  });
};

// Register all plugins and controllers
app.log.info(`Starting Lambda in ${process.env.NODE_ENV || "development"} mode`);
registerPlugins();
registerControllers();

// Create the Lambda handler
const proxy = awsLambdaFastify(app);
export const handler = async (event: APIGatewayProxyEvent, context: Context) => {
  // Extract request ID from API Gateway event if available
  if (event.headers && !event.headers["x-request-id"]) {
    // Use AWS request ID as fallback if no X-Request-ID was provided
    event.headers["x-request-id"] = context.awsRequestId;
  }

  return proxy(event, context);
};

// Lambda has its own lifecycle management, but we can define a cleanup function
// that AWS Lambda may call during function shutdown
export const cleanup = async () => {
  app.log.info("Lambda shutdown initiated");

  try {
    // Close Fastify server - stops accepting new connections
    await app.close();

    // Close Sentry if it's being used
    if (process.env.SENTRY_DSN) {
      await Sentry.close(2000);
    }

    app.log.info("Lambda shutdown completed");
  } catch (err) {
    app.log.error("Error during shutdown:", err);
    throw err;
  }
};

// Extend Fastify request interface
declare module "fastify" {
  interface FastifyRequest {
    startTime?: [number, number];
    user?: {
      userId: string;
      email: string;
      firstName?: string;
      lastName?: string;
    };
  }
}