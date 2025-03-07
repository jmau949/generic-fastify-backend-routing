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

import { AUTH_TOKEN } from "../config/constants";

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
        return reply.code(400).send({ error: error.message });
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
        return reply.code(400).send({ error: error.message || "Verification failed" });
      }
    }
  );

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
        const accessToken = await userService.login(request.body.user);
        reply.setCookie(AUTH_TOKEN, accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          path: "/",
        });
        return reply.code(200).send({});
      } catch (error) {
        console.error("error", error);

        if (error?.__type === "UserNotConfirmedException") {
          return reply.code(403).send({
            error: "User not confirmed. Please check your email for a verification link.",
          });
        } else if (error?.__type === "NotAuthorizedException") {
          return reply.code(400).send({
            error: "Incorrect username or password. Please verify your credentials.",
          });
        } else if (error?.__type === "UserNotFoundException") {
          return reply.code(404).send({
            error: "User not found. Please register or check your email address.",
          });
        } else if (error?.__type === "PasswordResetRequiredException") {
          return reply.code(403).send({
            error: "Password reset required. Please reset your password before logging in.",
          });
        }

        // For all other errors, return a generic message with details if available.
        return reply.code(401).send({
          error: error.message || "Authentication failed",
        });
      }
    }
  );

  // **User update**
  server.put<{ Body: IUserBody }>(
    "/",
    {
      schema: {
        body: userUpdateRequestSchema.body,
        response: userUpdateResponseSchema.response,
      },
      preHandler: server.authentication,
    },
    async (request, reply) => {
      try {
        await userService.updateUserAttributes(request.body.user);
        return reply.code(200).send({});
      } catch (error) {
        console.log("error", error);
        return reply.code(400).send({ error: error.message });
      }
    }
  );

  // **User logout**
  server.post("/logout", async (request, reply) => {
    reply.clearCookie("authToken");
    return reply.code(200).send({ message: "Logged out successfully" });
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
        return reply.code(400).send({ error: error.message });
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
        console.log("request.body", request.body);
        const { email, code, password } = request.body.user;
        await userService.confirmForgotPassword(email, code, password);
        return reply.code(200).send({});
      } catch (error) {
        console.log("error", error);
        return reply.code(400).send({ error: error.message });
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
        return reply.code(400).send({ error: error.message });
      }
    }
  );

  done();
};
