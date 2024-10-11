import { FastifySchema } from "fastify";

export const idParamsSchema: FastifySchema = {
  params: {
    type: "object", // Define the type for the params
    properties: {
      id: { type: "string" }, // Define the "id" property
    },
    required: ["id"], // Make sure "id" is required
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
