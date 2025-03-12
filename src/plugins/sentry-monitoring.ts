// src/plugins/sentry-monitoring.ts

import { FastifyInstance, FastifyPluginCallback } from "fastify";
import fp from "fastify-plugin";
import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import { expressIntegration } from "@sentry/node";
import { httpIntegration } from "@sentry/node";

const errorMonitoringPlugin: FastifyPluginCallback = (fastify: FastifyInstance, options, done) => {
  // Skip initializing Sentry in test environment to avoid unnecessary logging
  if (process.env.NODE_ENV === "test") {
    fastify.log.info("Skipping Sentry initialization in test environment");
    return done();
  }
  // Check if SENTRY_DSN is missing
  if (!process.env.SENTRY_DSN) {
    fastify.log.warn("SENTRY_DSN is not set. Sentry monitoring is disabled.");
    return done();
  }

  // Initialize Sentry with necessary configurations
  Sentry.init({
    dsn: process.env.SENTRY_DSN, // Sentry DSN for sending error reports
    environment: process.env.NODE_ENV, // Set environment for better error tracking
    integrations: [httpIntegration(), expressIntegration(), nodeProfilingIntegration()], // Use integrations for better context
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0, // Lower sample rate in production
    profilesSampleRate: 1.0, // Enable profiling
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

  // Hook to ensure Sentry properly shuts down when the server closes
  fastify.addHook("onClose", async (instance) => {
    if (process.env.SENTRY_DSN) {
      try {
        await Sentry.close(2000); // Allow up to 2 seconds to flush pending events
        fastify.log.info("Sentry connection closed");
      } catch (err) {
        fastify.log.error("Error closing Sentry:", err);
        throw err; // Optionally rethrow if necessary
      }
    }
  });

  done();
};

export default fp(errorMonitoringPlugin);
