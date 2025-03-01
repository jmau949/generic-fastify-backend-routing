import { FastifyPluginCallback, FastifyReply } from "fastify";
import { IUserBody, IUserEmail } from "./interface/user.interface";
import { userResponseSchema, userBodySchema, userEmailSchema } from "./schemas/user.schemas";
import { successfulResponseSchema } from "./schemas/generic.schemas";
import { userService } from "../services/user-service";
import { authService } from "../services/auth-service";
import constants from "../config/constants";

export const userController: FastifyPluginCallback = (server, options, done) => {
  // **Get authenticated user**
  server.get("/me", async (request, reply) => {
    try {
      const user = await authService.verifyUser(request.cookies.authToken);
      return reply.send({ user });
    } catch (error) {
      reply.clearCookie("authToken");
      return reply.code(401).send({ error: "Session expired or invalid" });
    }
  });

  // **User signup**
  server.post<{ Body: IUserBody }>(
    "/",
    { schema: { ...userBodySchema, ...userResponseSchema } },
    async (request, reply) => {
      try {
        const user = await userService.createUser(request.body.user);
        return reply.code(200).send({ user });
      } catch (error) {
        return reply.code(400).send({ error: error.message });
      }
    }
  );

  // **User login**
  server.post<{ Body: IUserEmail }>(
    "/login",
    { schema: { ...userEmailSchema, ...successfulResponseSchema } },
    async (request, reply) => {
      try {
        const accessToken = await authService.login(request.body.user);
        reply.setCookie("authToken", accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          path: "/",
        });
        return reply.code(200).send({ message: "Login successful" });
      } catch (error) {
        return reply.code(401).send({ error: "Authentication failed" });
      }
    }
  );

  // **User update**
  server.put<{ Body: IUserBody }>(
    "/",
    { schema: { ...userBodySchema, ...successfulResponseSchema }, preHandler: server.authentication },
    async (request, reply) => {
      try {
        await userService.updateUserAttributes(request.body.user);
        return reply.code(200).send({ message: "User update successful" });
      } catch (error) {
        return reply.code(400).send({ error: error.message });
      }
    }
  );

  // **User delete**
  server.delete<{ Params: { email: string } }>(
    "/:email",
    { preHandler: server.authentication },
    async (request, reply) => {
      try {
        await userService.deleteUser(request.params.email);
        return reply.code(200).send({ message: "User deletion successful" });
      } catch (error) {
        return reply.code(400).send({ error: error.message });
      }
    }
  );

  // **User logout**
  server.post("/logout", async (request, reply) => {
    reply.clearCookie("authToken");
    return reply.code(200).send({ message: "Logged out successfully" });
  });

  done();
};
