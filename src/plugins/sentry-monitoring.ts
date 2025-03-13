import { FastifyInstance, FastifyPluginCallback } from "fastify";
import fp from "fastify-plugin";
import * as Sentry from "@sentry/node";

const errorMonitoringPlugin: FastifyPluginCallback = (fastify: FastifyInstance, options, done) => {
  // Skip initializing Sentry in test environment to avoid unnecessary logging
  if (process.env.NODE_ENV === "test") {
    fastify.log.info("Skipping Sentry initialization in test environment");
    return done();
  }

  if (!process.env.SENTRY_DSN) {
    fastify.log.warn("SENTRY_DSN is not set. Sentry monitoring is disabled.");
    return done();
  }

  // Initialize Sentry with necessary configurations
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    integrations: [
      // Core Node.js functionality
      Sentry.httpIntegration(),
    ],
    // Transaction sampling (can adjust based on performance needs)
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  });

  console.log("✅ Sentry is initialized and connected");

  // Hook to capture request details and set user context
  fastify.addHook("onRequest", (request, reply, done) => {
    // Assign a request ID tag for better debugging in Sentry
    Sentry.setTag("requestId", request.id);

    // If the user is authenticated, set their details for context in Sentry
    if (request.user) {
      Sentry.setUser({ id: request.user.userId, email: request.user.email });
    }

    done();
  });

  // Hook to capture and report errors
  fastify.addHook("onError", (request, reply, error, done) => {
    Sentry.captureException(error, {
      tags: {
        requestId: request.id,
      },
      extra: {
        url: request.url,
        method: request.method,
      },
    });
    done();
  });


  done();
};

export default fp(errorMonitoringPlugin);
