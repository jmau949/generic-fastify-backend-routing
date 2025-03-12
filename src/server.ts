// Enables TypeScript decorators (commonly used with dependency injection or ORM libraries like TypeORM)
import "reflect-metadata";

// Import Fastify and its types
import fastify, { FastifyInstance } from "fastify";
import { v4 as uuidv4 } from "uuid"; // Add this import for UUID generation

// Import application configuration settings
import config from "./config/config";

// Import user controller (handles user-related routes)
import { userController } from "./controllers/user-controllers";

// Import authentication plugin (handles JWT authentication via cookies)
import auth from "./plugins/auth";

// Import CORS configuration (ensures correct cross-origin settings based on the environment)
import corsConfig from "./config/corsConfig";

// Import CORS plugin for handling cross-origin requests
import cors from "@fastify/cors";

// Import Fastify Cookie plugin (used for handling cookies in requests/responses)
import fastifyCookie from "@fastify/cookie";

// Import Fastify Helmet (adds security headers to protect against attacks like XSS)
import fastifyHelmet from "@fastify/helmet";

// **Application Class**: Manages the Fastify server lifecycle
class Application {
  server: FastifyInstance; // Declare the Fastify instance

  // **Constructor:** Initializes the Fastify server instance
  constructor() {
    this.server = fastify({
      logger: {
        level: "info", // Adjust based on your needs
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
              // Add other relevant info but avoid sensitive data
              headers: {
                "x-request-id": request.headers["x-request-id"],
              },
            };
          },
        },
      },
      keepAliveTimeout: 60000, // Keep connections open for 60s
      connectionTimeout: 60000,
      // Generate request ID for each request
      genReqId: (request) => {
        // Use existing X-Request-ID from header if available, or generate a new one
        return (request.headers["x-request-id"] as string) || uuidv4();
      },
    });
  }

  // **Starts the Fastify HTTP Server**
  async startHttpServer() {
    try {
      console.log("config.port", config.port); // Logs the port number (useful for debugging)

      // Start the server on the specified port
      const address = await this.server.listen({ port: config.port });
      console.log(`Server listening at ${address}`);
    } catch (error) {
      this.server.log.error(error); // Log the error if the server fails to start
      process.exit(1); // Exit the process to prevent running in an unstable state
    }
  }

  // **Registers Fastify Plugins (Middleware)**
  registerPlugins() {
    // Determine the current environment (default to "dev" if not set)
    const env = (process.env.NODE_ENV as keyof typeof corsConfig) || "dev";

    // Register Helmet for security (adds important security-related headers)
    this.server.register(fastifyHelmet);

    // Register CORS middleware (allows the frontend to communicate with the backend)
    this.server.register(cors, corsConfig[env]);

    // Register the Cookie plugin (enables Fastify to read and set cookies)
    this.server.register(fastifyCookie, {
      parseOptions: {
        httpOnly: true, // Prevents JavaScript from accessing cookies (protects against XSS)
        secure: process.env.NODE_ENV === "production", // Enforces HTTPS for cookies in production
        sameSite: "strict", // Ensures cookies are only sent with same-site requests (prevents CSRF)
        path: "/", // Cookie is valid across the entire domain
        maxAge: 60 * 60 * 24 * 7, // Cookie expires in 1 week (reduces need for frequent logins)
      },
    });

    // Register authentication plugin (adds `server.authentication` to handle JWT verification)
    this.server.register(auth);

    // Add request tracing hooks
    this.registerRequestTracingHooks();
  }

  // Add this new method for request tracing
  registerRequestTracingHooks() {
    // Add request tracking hook
    this.server.addHook("onRequest", (request, reply, done) => {
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
    this.server.addHook("onResponse", (request, reply, done) => {
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
    this.server.setErrorHandler((error, request, reply) => {
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
  }

  // **Registers Controllers (Route Handlers)**
  registerControllors() {
    // Register the `userController` for handling user-related routes
    // The prefix ensures all routes inside `userController` are under `/api/v1/users`
    this.server.register(userController, {
      prefix: `${config.apiPrefix}/users`,
    });
  }

  async main() {
    console.log("NODE_ENV IS ", process.env.NODE_ENV);

    // Register all necessary plugins (middleware)
    this.registerPlugins();

    // Register all controllers (routes)
    this.registerControllors();

    await this.startHttpServer();
  }
}

// Extend Fastify request interface to include our added properties
declare module "fastify" {
  interface FastifyRequest {
    startTime?: [number, number]; // For tracking request duration
  }
}

const appInstance = new Application();
appInstance.main();