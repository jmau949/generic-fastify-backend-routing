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
      // Add AWS Lambda integration when running in Lambda
      ...(process.env.AWS_LAMBDA_FUNCTION_NAME
        ? [
            new Sentry.AwsLambdaIntegration({
              flushTimeout: 2000, // 2 second timeout for Lambda
            }),
          ]
        : []),
    ],
    // Optimized sampling rate
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.05 : 0.3,
    // Disable session tracking for better performance
    autoSessionTracking: false,
    // Filter events before sending to Sentry
    beforeSend(event, hint) {
      // Skip non-error events in production to reduce noise
      if (process.env.NODE_ENV === "production") {
        // Only send error and fatal level events
        if (event.level !== "error" && event.level !== "fatal") {
          return null;
        }

        // Optional: Filter out specific types of errors
        // For example, skip 404 errors (these are often noise)
        const exception = hint.originalException;
        if (exception && typeof exception === "object" && "statusCode" in exception) {
          if ((exception as any).statusCode === 404) {
            return null;
          }
        }
      }

      return event;
    },
    // Set release version if available
    release: process.env.VERSION || process.env.AWS_LAMBDA_FUNCTION_VERSION,
  });

  fastify.log.info("✅ Sentry is initialized and connected");

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

  // Add flush hook for Lambda environments
  if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
    fastify.addHook("onClose", (instance, done) => {
      Sentry.flush(2000) // 2 second timeout
        .then(() => done())
        .catch(() => done());
    });
  }

  done();
};

export default fp(errorMonitoringPlugin);