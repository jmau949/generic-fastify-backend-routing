import { FastifyPluginCallback, FastifyReply } from "fastify";
import {
  IUserBody,
  IUserConfirmForgotPassword,
  IUserEmail,
  IUserForgotPassword,
  IUserResendConfirmationCode,
  IUserVerify,
} from "./interface/user.interface";
import {
  userGetMeResponseSchema,
  userSignUpRequestSchema,
  userSignUpResponseBodySchema,
  userVerifyRequestSchema,
  userVerifyResponseSchema,
  userLoginRequestSchema,
  userLoginResponseSchema,
  userUpdateRequestSchema,
  userUpdateResponseSchema,
  userForgotPasswordRequestSchema,
  userForgotPasswordResponseSchema,
  userConfirmForgotPasswordRequestSchema,
  userConfirmForgotPasswordResponseSchema,
  userResendConfirmationCodeRequestSchema,
  userResendConfirmationCodeResponseSchema,
} from "./schemas/user.schemas";

import { userService } from "../services/user-service";
import { sendErrorResponse } from "../utils/error-handler";
import { AUTH_TOKEN, REFRESH_TOKEN } from "../config/constants";

export const userController: FastifyPluginCallback = (server, options, done) => {
  // **Get authenticated user**
  server.get(
    "/me",
    {
      schema: {
        response: userGetMeResponseSchema.response,
      },
    },
    async (request, reply) => {
      try {
        const user = await userService.verifyUser(request.cookies.authToken);
        return reply.send({ user });
      } catch (error) {
        reply.clearCookie("authToken");
        reply.clearCookie("refreshToken");
        reply.clearCookie("email");
        return sendErrorResponse(reply, error);
      }
    }
  );

  // **User signup**
  server.post<{ Body: IUserBody }>(
    "/",
    {
      schema: {
        body: userSignUpRequestSchema.body,
        response: userSignUpResponseBodySchema.response,
      },
    },
    async (request, reply) => {
      try {
        const user = await userService.createUser(request.body.user);
        return reply.code(200).send({ user });
      } catch (error) {
        return sendErrorResponse(reply, error);
      }
    }
  );

  // User verify
  server.post<{ Body: IUserVerify }>(
    "/confirm",
    {
      schema: {
        body: userVerifyRequestSchema.body,
        response: userVerifyResponseSchema.response,
      },
    },
    async (request, reply) => {
      try {
        await userService.confirmUser({
          email: request.body.user.email,
          confirmationCode: request.body.user.confirmationCode,
        });
        return reply.code(200).send({});
      } catch (error) {
        return sendErrorResponse(reply, error);
      }
    }
  );

  // **Add a refresh token endpoint**
  server.post("/refresh-token", async (request, reply) => {
    try {
      const refreshToken = request.cookies.refreshToken;
      const email = request.cookies["email"];

      if (!refreshToken || !email) {
        return reply.code(401).send({
          error: "Missing refresh token or email",
          errorCode: "INVALID_REFRESH_REQUEST",
        });
      }

      const { AccessToken, RefreshToken } = await userService.refreshToken(refreshToken, email);

      // Set cookie configuration - extract to a helper for consistency
      const cookieConfig = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict" as "strict" | "lax" | "none",
        path: "/",
      };

      reply.setCookie(AUTH_TOKEN, AccessToken, {
        ...cookieConfig,
        maxAge: 12 * 60 * 60, // 12 hours in seconds
      });

      if (RefreshToken) {
        reply.setCookie(REFRESH_TOKEN, RefreshToken, {
          ...cookieConfig,
          maxAge: 7 * 24 * 60 * 60, // 7 days
        });
      }

      return reply.code(200).send({});
    } catch (error) {
      // Clear all auth cookies on failure
      reply.clearCookie(AUTH_TOKEN);
      reply.clearCookie(REFRESH_TOKEN);
      reply.clearCookie("email");

      return sendErrorResponse(reply, error);
    }
  });

  // Remaining controller methods with updated error handling
  server.post<{ Body: IUserEmail }>(
    "/login",
    {
      schema: {
        body: userLoginRequestSchema.body,
        response: userLoginResponseSchema.response,
      },
    },
    async (request, reply) => {
      try {
        const { AccessToken, RefreshToken } = await userService.login(request.body.user);
        const email = request.body.user.email;

        // Cookie configuration
        const cookieConfig = {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict" as "strict" | "lax" | "none",
          path: "/",
        };

        reply.setCookie(AUTH_TOKEN, AccessToken, cookieConfig);
        reply.setCookie(REFRESH_TOKEN, RefreshToken, cookieConfig);
        reply.setCookie("email", email, cookieConfig);

        return reply.code(200).send({});
      } catch (error) {
        return sendErrorResponse(reply, error);
      }
    }
  );

  // User logout
  server.post("/logout", async (request, reply) => {
    reply.clearCookie(AUTH_TOKEN);
    reply.clearCookie(REFRESH_TOKEN);
    reply.clearCookie("email");
    return reply.code(200).send({});
  });

  // Forgot password flow
  server.post<{ Body: IUserForgotPassword }>(
    "/forgot-password",
    {
      schema: {
        body: userForgotPasswordRequestSchema.body,
        response: userForgotPasswordResponseSchema.response,
      },
    },
    async (request, reply) => {
      try {
        await userService.forgotPassword(request.body.user.email);
        return reply.code(200).send({});
      } catch (error) {
        return sendErrorResponse(reply, error);
      }
    }
  );

  server.post<{ Body: IUserConfirmForgotPassword }>(
    "/confirm-forgot-password",
    {
      schema: {
        body: userConfirmForgotPasswordRequestSchema.body,
        response: userConfirmForgotPasswordResponseSchema.response,
      },
    },
    async (request, reply) => {
      try {
        const { email, code, password } = request.body.user;
        await userService.confirmForgotPassword(email, code, password);
        return reply.code(200).send({});
      } catch (error) {
        return sendErrorResponse(reply, error);
      }
    }
  );

  server.post<{ Body: IUserResendConfirmationCode }>(
    "/resend-confirmation-code",
    {
      schema: {
        body: userResendConfirmationCodeRequestSchema.body,
        response: userResendConfirmationCodeResponseSchema.response,
      },
    },
    async (request, reply) => {
      try {
        const { email } = request.body.user;
        await userService.resendConfirmationCode(email);
        return reply.code(200).send({});
      } catch (error) {
        return sendErrorResponse(reply, error);
      }
    }
  );

  done();
};