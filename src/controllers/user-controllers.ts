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
        console.log("ERROR", error);
        return reply.code(401).send({ error: "Session expired or invalid" });
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
        console.log("error", error);
        return reply.code(400).send({ error: error.message, errorCode: error.name });
      }
    }
  );

  // // User verify
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
        console.log("error", error);
        return reply.code(400).send({ error: error.message, errorCode: error.name });
      }
    }
  );

  // **Add a refresh token endpoint**
  server.post("/refresh-token", async (request, reply) => {
    try {
      const refreshToken = request.cookies.refreshToken;
      const email = request.cookies["email"]; // Get email from secure cookie

      if (!refreshToken || !email) {
        return reply.code(401).send({
          error: "Missing refresh token",
        });
      }
      // Call Cognito to get a new access token using the refresh token
      const { AccessToken, RefreshToken } = await userService.refreshToken(refreshToken, email);

      reply.setCookie(AUTH_TOKEN, AccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 12 * 60 * 60, // **12 hours in seconds**
      });

      // Set new Refresh Token in cookie (only if Cognito rotates tokens)
      if (RefreshToken) {
        reply.setCookie(REFRESH_TOKEN, RefreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          path: "/",
          maxAge: 7 * 24 * 60 * 60, // 7 days
        });
      }

      return reply.code(200).send({});
    } catch (error) {
      console.error("Token refresh error:", error);

      // Clear both tokens on refresh failure
      reply.clearCookie(AUTH_TOKEN);
      reply.clearCookie(REFRESH_TOKEN);

      return reply.code(400).send({ error: error.message, errorCode: error.name });
    }
  });

  // **User login**
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
        const email = request.body.user.email; // Extract email from request
        reply.setCookie(AUTH_TOKEN, AccessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          path: "/",
        });

        // Set Refresh Token Cookie
        reply.setCookie(REFRESH_TOKEN, RefreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          path: "/",
        });

        // **Set Email Cookie for Token Refresh**
        reply.setCookie("email", email, {
          httpOnly: true, // Prevents JavaScript access (protects from XSS)
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          path: "/",
        });

        return reply.code(200).send({});
      } catch (error) {
        if (error?.__type === "UserNotConfirmedException") {
          return reply.code(403).send({
            error: "User not confirmed. Please check your email for a verification link.",
            errorCode: error.name,
          });
        } else if (error?.__type === "NotAuthorizedException") {
          return reply.code(400).send({
            error: "Incorrect username or password. Please verify your credentials.",
            errorCode: error.name,
          });
        } else if (error?.__type === "UserNotFoundException") {
          return reply.code(404).send({
            error: "User not found. Please register or check your email address.",
            errorCode: error.name,
          });
        } else if (error?.__type === "PasswordResetRequiredException") {
          return reply.code(403).send({
            error: "Password reset required. Please reset your password before logging in.",
            errorCode: error.name,
          });
        }

        // For all other errors, return a generic message with details if available.
        return reply.code(401).send({
          error: "Authentication failed",
          errorCode: null,
        });
      }
    }
  );

  // // **User update**
  // server.put<{ Body: IUserBody }>(
  //   "/",
  //   {
  //     schema: {
  //       body: userUpdateRequestSchema.body,
  //       response: userUpdateResponseSchema.response,
  //     },
  //     preHandler: server.authentication,
  //   },
  //   async (request, reply) => {
  //     try {
  //       await userService.updateUserAttributes(request.body.user);
  //       return reply.code(200).send({});
  //     } catch (error) {
  //       console.log("error", error);
  //       return reply.code(400).send({ error: error.message, errorCode: error.name });
  //     }
  //   }
  // );

  // **User logout**
  server.post("/logout", async (request, reply) => {
    reply.clearCookie(AUTH_TOKEN);
    reply.clearCookie(REFRESH_TOKEN);
    return reply.code(200).send({});
  });

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
        console.log("error", error);
        return reply.code(400).send({ error: error.message, errorCode: error.name });
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
        console.log("error", error);
        return reply.code(400).send({ error: error.message, errorCode: error.name });
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
        console.log("error", error);
        return reply.code(400).send({ error: error.message, errorCode: error.name });
      }
    }
  );

  done();
};
