// src/plugins/error-handler.ts

import { FastifyInstance, FastifyPluginCallback, FastifyReply, FastifyRequest } from "fastify";
import { fastifyPlugin } from "fastify-plugin";
import { AppError, sendErrorResponse } from "../utils/error-handler";

/**
 * Custom Fastify plugin to handle errors, including:
 * - Centralized error handling with logging
 * - Validation error responses
 * - Custom 404 (Not Found) handler
 * - Request tracking for logging and debugging
 */
const errorHandlerPlugin: FastifyPluginCallback = (fastify: FastifyInstance, options, done) => {
  // 1️⃣ Custom error handler for handling application errors
  fastify.setErrorHandler((error, request, reply) => {
    console.log("error handler");
    // Log the error details, including stack trace and request metadata
    request.log.error({
      err: error, // The actual error object
      stack: error.stack, // Stack trace for debugging
      event: "request_error", // Log event type
      requestId: request.id, // Unique request identifier
      path: request.url, // The requested URL
      method: request.method, // HTTP method used
    });

    // If the error is due to validation (from Fastify's built-in validation)
    if (error.validation) {
      return reply.status(400).send({
        error: "Validation error",
        errorCode: "VALIDATION_ERROR",
        details: error.validation, // Provide detailed validation errors
        requestId: request.id, // Attach request ID for debugging
      });
    }

    // For all other errors, use a centralized error response handler
    return sendErrorResponse(reply, error, request.id);
  });

  // 2️⃣ Custom 404 Not Found handler for unmatched routes
  fastify.setNotFoundHandler((request, reply) => {
    // Log missing route information
    request.log.info({
      event: "not_found",
      requestId: request.id,
      path: request.url,
      method: request.method,
    });

    // Send 404 response
    reply.status(404).send({
      error: "Route not found",
      errorCode: "NOT_FOUND",
      requestId: request.id,
    });
  });

  // 3️⃣ Hook to track request start times and assign unique IDs
  fastify.addHook("onRequest", (request, reply, done) => {
    // Assign a unique request ID to each request for tracing
    reply.header("X-Request-ID", request.id);

    // Capture request start time using high-resolution timer for performance monitoring
    request.startTime = process.hrtime();

    // Log request initiation details
    request.log.info({
      event: "request_start",
      requestId: request.id,
      path: request.url,
      method: request.method,
    });

    done();
  });

  // 4️⃣ Hook to log request completion and response time
  fastify.addHook("onResponse", (request, reply, done) => {
    // Calculate request duration using high-resolution timer
    const hrDuration = process.hrtime(request.startTime);
    const durationMs = hrDuration[0] * 1000 + hrDuration[1] / 1000000; // Convert to milliseconds

    // Log request completion with response time and status code
    request.log.info({
      event: "request_end",
      requestId: request.id,
      responseTime: durationMs.toFixed(2) + "ms", // Log execution time in milliseconds
      statusCode: reply.statusCode, // HTTP response status code
      path: request.url, // Requested path
      method: request.method, // HTTP method used
    });

    done();
  });

  done();
};

// Export the Fastify plugin so it can be used in the main application
export default fastifyPlugin(errorHandlerPlugin);
