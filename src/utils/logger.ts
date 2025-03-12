// src/utils/logger.ts

import pino, { LoggerOptions, Level } from "pino";

// Logger configuration options
export const loggerOptions: LoggerOptions = {
  // Set the log level from environment variable, defaulting to "info"
  level: process.env.LOG_LEVEL || "info",

  // Redact sensitive fields from logs to prevent exposure of sensitive information
  redact: ["req.headers.authorization", "req.headers.cookie", "password", "passwordConfirmation"],

  // Use "pino-pretty" for better log formatting in non-production environments
  transport: process.env.NODE_ENV !== "production" ? { target: "pino-pretty" } : undefined,

  // Customize the log format to include the log level as an object property
  formatters: {
    level: (label: Level) => ({ level: label }),
  },

  // Include a timestamp in ISO format in each log entry
  timestamp: pino.stdTimeFunctions.isoTime,

  // Custom serializers to control how request objects are logged
  serializers: {
    req: (request) => ({
      id: request.id || request.headers["x-request-id"], // Track request ID for traceability
      method: request.method, // Log the HTTP method (GET, POST, etc.)
      url: request.url, // Log the request URL
      headers: {
        "x-request-id": request.headers["x-request-id"], // Preserve request ID in logs
      },
    }),
  },
};

// Helper function to log errors in a structured format
export const logError = (err: Error | any, context?: string) => {
  const errorObj = {
    message: err.message || "Unknown error", // Ensure an error message is always logged
    stack: err.stack, // Include the stack trace for debugging
    code: err.code || err.errorCode, // Log any error codes if available
    type: err.name || err.constructor.name, // Capture the error type
    context, // Additional context for better traceability
  };

  logger.error(errorObj); // Log the error
};

// Helper function to log HTTP requests
export const logRequest = (req: any, context?: string) => {
  logger.info({
    method: req.method, // Log HTTP method
    url: req.url, // Log requested URL
    id: req.id || req.headers["x-request-id"], // Log request ID for tracing
    context, // Additional logging context if provided
  });
};

// Create the logger instance with the specified options
const logger = pino(loggerOptions);

// Export the logger instance as the default export
export default logger;
