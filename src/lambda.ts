import "reflect-metadata";
import fastify, { FastifyInstance } from "fastify";
import awsLambdaFastify from "@fastify/aws-lambda";
import { Context, APIGatewayProxyEvent } from "aws-lambda";
import cors from "@fastify/cors";
import fastifyCookie from "@fastify/cookie";
import fastifyHelmet from "@fastify/helmet";
import { v4 as uuidv4 } from "uuid"; // Add this import

// Import your controllers and configurations
import { userController } from "./controllers/user-controllers";
import config from "./config/config";
import corsConfig from "./config/corsConfig";
import auth from "./plugins/auth";

// Create the Fastify app
const app: FastifyInstance = fastify({
  logger: {
    level: "info",
    transport: {
      target: "pino-pretty",
      options: { colorize: true },
    },
    // Add request ID to all logs
    serializers: {
      req: (request) => {
        return {
          id: request.id,
          method: request.method,
          url: request.url,
          headers: {
            "x-request-id": request.headers["x-request-id"],
          },
        };
      },
    },
  },
  keepAliveTimeout: 60000,
  connectionTimeout: 60000,
  // Generate request ID for each request
  genReqId: (request) => {
    // Extract request ID from Lambda event headers or generate new one
    return (request.headers["x-request-id"] as string) || uuidv4();
  },
});

// Register plugins
const env = (process.env.NODE_ENV as keyof typeof corsConfig) || "dev";
app.register(fastifyHelmet);

// Update CORS config to include X-Request-ID
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

// Add request tracing hooks
app.addHook("onRequest", (request, reply, done) => {
  // Set X-Request-ID header in the response
  reply.header("X-Request-ID", request.id);

  // Add request start time for calculating duration
  request.startTime = process.hrtime();

  // Log start of request
  request.log.info({
    event: "request_start",
    requestId: request.id,
    path: request.url,
    method: request.method,
  });

  done();
});

// Add response hook to log request completion with timing
app.addHook("onResponse", (request, reply, done) => {
  // Calculate request duration
  const hrDuration = process.hrtime(request.startTime);
  const durationMs = hrDuration[0] * 1000 + hrDuration[1] / 1000000;

  // Log request completion
  request.log.info({
    event: "request_end",
    requestId: request.id,
    responseTime: durationMs.toFixed(2) + "ms",
    statusCode: reply.statusCode,
    path: request.url,
    method: request.method,
  });

  done();
});

// Add error handler
app.setErrorHandler((error, request, reply) => {
  request.log.error({
    err: error,
    stack: error.stack,
    event: "request_error",
    requestId: request.id,
    path: request.url,
    method: request.method,
  });

  // Determine appropriate status code and message
  const statusCode = error.statusCode || 500;
  const message = error.message || "Internal Server Error";

  // Return standardized error response with request ID
  reply.code(statusCode).send({
    error: message,
    statusCode,
    requestId: request.id,
  });
});

// Register controllers
app.register(userController, {
  prefix: `${config.apiPrefix}/users`,
});

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

// Extend Fastify request interface
declare module "fastify" {
  interface FastifyRequest {
    startTime?: [number, number];
  }
}