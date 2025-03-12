// server.ts
import "reflect-metadata";
import fastify, { FastifyInstance, FastifyRequest } from "fastify";
import { v4 as uuidv4 } from "uuid";
import cors from "@fastify/cors";
import fastifyCookie from "@fastify/cookie";
import fastifyHelmet from "@fastify/helmet";
import fastifyRateLimit from "@fastify/rate-limit";
import * as Sentry from "@sentry/node";
import sentryMonitoring from "./plugins/sentry-monitoring";
import config from "./config/config";
import corsConfig from "./config/corsConfig";
import { userController } from "./controllers/user-controllers";
import auth from "./plugins/auth";
import errorPlugin from "./plugins/error-handler";
import { sendErrorResponse } from "./utils/error-handler";
import logger, { loggerOptions } from "./utils/logger";

class Application {
  server: FastifyInstance;

  constructor() {
    this.server = fastify({
      logger: loggerOptions,
      genReqId: (request) => {
        return (request.headers["x-request-id"] as string) || uuidv4();
      },
      trustProxy: process.env.NODE_ENV === "production", // Trust proxy headers in production
      keepAliveTimeout: 60000,
      connectionTimeout: 60000,
    });
  }

  async startHttpServer() {
    try {
      const address = await this.server.listen({
        port: config.port,
      });
      this.server.log.info(`Server listening at ${address}`);
    } catch (error) {
      this.server.log.error(error);
      process.exit(1);
    }
  }

  registerPlugins() {
    const env = (process.env.NODE_ENV as keyof typeof corsConfig) || "dev";
    // Register Sentry monitoring first
    this.server.register(sentryMonitoring);
    // Register security plugins
    this.server.register(fastifyHelmet);

    // Register CORS
    this.server.register(cors, corsConfig[env]);

    // Register cookie handling
    this.server.register(fastifyCookie, {
      parseOptions: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 1 week
      },
    });

    // Rate limiting for security
    this.server.register(fastifyRateLimit, {
      max: 100,
      timeWindow: "1 minute",
      // Skip rate limiting for health checks
      skip: (request: FastifyRequest) => request.url.startsWith("/health"),
    } as any);

    // Register authentication plugin
    this.server.register(auth);

    // Register request tracking and error handling
    this.server.register(errorPlugin);
  }

  registerControllers() {
    // Health check endpoint for load balancers
    this.server.get("/health", async (request, reply) => {
      return { status: "ok", timestamp: new Date().toISOString() };
    });

    // Register user routes
    this.server.register(userController, {
      prefix: `${config.apiPrefix}/users`,
    });
  }

  async main() {
    this.server.log.info(`Starting server in ${process.env.NODE_ENV || "development"} mode`);

    // Register all middleware
    this.registerPlugins();

    // Register all route controllers
    this.registerControllers();

    // Start HTTP server
    await this.startHttpServer();
  }

  // Add graceful shutdown
  setupGracefulShutdown() {
    const gracefulShutdown = async (signal: string) => {
      this.server.log.info(`${signal} received, starting graceful shutdown`);

      try {
        // Close Fastify server - stops accepting new connections
        await this.server.close();

        // Close Sentry if it's being used
        if (process.env.SENTRY_DSN) {
          await Sentry.close(2000);
        }

        this.server.log.info("Server shutdown completed");
        process.exit(0);
      } catch (err) {
        this.server.log.error("Error during shutdown:", err);
        process.exit(1);
      }
    };

    // Listen for termination signals
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  }
}

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

// Create and start application
const appInstance = new Application();
appInstance.setupGracefulShutdown();
appInstance.main().catch((err) => {
  console.error("Fatal error starting application:", err);
  process.exit(1);
});
