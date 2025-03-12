// src/utils/error-handler.ts

import { FastifyReply } from "fastify";

/**
 * Custom base error class that extends JavaScript's built-in Error.
 * Used for defining application-specific errors with a consistent structure.
 */
export class AppError extends Error {
  statusCode: number; // HTTP status code for the error
  errorCode: string; // Unique error code for internal tracking

  /**
   * Constructs an AppError instance.
   * @param {string} message - A human-readable error message.
   * @param {number} [statusCode=500] - HTTP status code (default: 500 for internal server error).
   * @param {string} [errorCode="INTERNAL_SERVER_ERROR"] - Internal error code for tracking.
   */
  constructor(message: string, statusCode = 500, errorCode = "INTERNAL_SERVER_ERROR") {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.name = this.constructor.name;

    // Capture stack trace to retain useful debugging information
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Specialized error class for authentication-related errors.
 * Extends AppError and always returns a 401 Unauthorized status.
 */
export class AuthError extends AppError {
  /**
   * Constructs an AuthError instance.
   * @param {string} message - A human-readable authentication error message.
   * @param {string} errorCode - Internal authentication error code.
   */
  constructor(message: string, errorCode: string) {
    super(message, 401, errorCode);
  }
}

/**
 * Maps AWS Cognito error responses to our custom AppError format.
 * Ensures consistent error messages across authentication failures.
 *
 * @param {any} error - The raw error object from Cognito.
 * @returns {AppError} - A mapped AppError instance with the appropriate message and status code.
 */
export const handleCognitoError = (error: any): AppError => {
  // Extract the error type from the Cognito response
  const errorType = error?.__type || error?.name || "UnknownError";

  switch (errorType) {
    case "UserNotConfirmedException":
      return new AppError("User not confirmed. Please check your email for a verification link.", 403, errorType);
    case "NotAuthorizedException":
      return new AppError("Incorrect username or password. Please verify your credentials.", 401, errorType);
    case "UserNotFoundException":
      return new AppError("User not found. Please register or check your email address.", 404, errorType);
    case "PasswordResetRequiredException":
      return new AppError("Password reset required. Please reset your password before logging in.", 403, errorType);
    case "CodeMismatchException":
      return new AppError("Invalid verification code. Please try again.", 400, errorType);
    case "ExpiredCodeException":
      return new AppError("Verification code has expired. Please request a new one.", 400, errorType);
    case "TooManyRequestsException":
      return new AppError("Too many requests. Please try again later.", 429, errorType);
    case "InvalidPasswordException":
      return new AppError(
        "Password does not meet requirements. It should include uppercase, lowercase, numbers, and special characters.",
        400,
        errorType
      );
    case "UsernameExistsException":
      return new AppError("An account with this email already exists.", 409, errorType);
    case "LimitExceededException":
      return new AppError("Operation limit exceeded. Please try again later.", 429, errorType);
    default:
      // Log the full error for debugging, while returning a sanitized message to the user
      console.error("Unhandled Cognito error:", error);
      return new AppError("An authentication error occurred. Please try again later.", 500, "INTERNAL_AUTH_ERROR");
  }
};

/**
 * Handles error responses by formatting errors into a structured JSON response.
 * Ensures consistent error handling across the application.
 *
 * @param {FastifyReply} reply - The Fastify response object.
 * @param {any} error - The error object to handle.
 * @param {string} [requestId] - The unique request ID for logging and tracking.
 * @returns {FastifyReply} - The formatted HTTP response.
 */
export const sendErrorResponse = (reply: FastifyReply, error: any, requestId?: string): FastifyReply => {
  // Identify authentication errors by message content if not already an AuthError
  if (
    !(error instanceof AppError) &&
    (error.message?.toLowerCase().includes("unauthorized") || error.message?.toLowerCase().includes("token"))
  ) {
    error = new AuthError(error.message || "Authentication required", "AUTH_REQUIRED");
  }

  // Convert error into an AppError if it's not already
  const appError =
    error instanceof AppError
      ? error // If already an instance of AppError, use it directly
      : error?.__type
      ? handleCognitoError(error) // Handle Cognito-specific errors
      : new AppError(error.message || "An unexpected error occurred", 500); // Default fallback error

  // Log errors with more structured format
  console.error(`[ERROR] ${appError.statusCode} - ${appError.message} (Request ID: ${requestId || "N/A"})`, {
    errorCode: appError.errorCode,
    stack: appError.stack,
  });

  // Send the structured error response
  return reply.code(appError.statusCode).send({
    error: appError.message, // Human-readable error message
    errorCode: appError.errorCode, // Internal error code
    requestId, // Include request ID for easier debugging
  });
};
