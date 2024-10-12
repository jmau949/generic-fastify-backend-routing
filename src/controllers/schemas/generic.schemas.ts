import { FastifySchema } from "fastify";

export const emailParamsSchema: FastifySchema = {
  params: {
    type: "object", // Define the type for the params
    properties: {
      email: { type: "string" }, // Define the "id" property
    },
    required: ["email"], // Make sure "id" is required
  },
};
export const successfulResponseSchema: FastifySchema = {
  response: {
    200: {
      type: "object",
      properties: {
        message: {
          type: "string",
        },
      },
    },
  },
};
