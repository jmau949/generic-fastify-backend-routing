import { FastifyPluginCallback, FastifyReply } from "fastify";
import {
  IUserBody,
  IUserConfirmForgotPassword,
  IUserEmail,
  IUserForgotPassword,
  IUserVerify,
} from "./interface/user.interface";
import {
  userGetMeRequestSchema,
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
} from "./schemas/user.schemas";

import { userService } from "../services/user-service";

import { AUTH_COOKIE_NAME } from "../config/constants";

export const userController: FastifyPluginCallback = (server, options, done) => {
  // **Get authenticated user**
  server.get(
    "/me",
    {
      schema: {
        body: userGetMeRequestSchema.body,
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
        reply.setCookie(AUTH_COOKIE_NAME, accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          path: "/",
        });
        return reply.code(200).send({});
      } catch (error) {
        console.log("error", error);
        return reply.code(401).send({ error: "Authentication failed" });
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

  done();
};
