import { FastifySchema } from "fastify";

const userBaseProps = {
  id: { type: "number" },
  email: { type: "string" },
  firstName: { type: "string" },
  lastName: { type: "string" },
};

export const userResponseSchema: FastifySchema = {
  response: {
    200: {
      type: "object",
      properties: {
        user: {
          type: "object",
          properties: {
            ...userBaseProps,
          },
        },
      },
    },
  },
};

export const userBodySchema: FastifySchema = {
  body: {
    type: "object",
    required: ["user"],
    properties: {
      user: {
        type: "object",
        required: ["email", "firstName", "lastName"], // Adding required fields
        properties: {
          ...userBaseProps,
          email: { type: "string", format: "email" }, // Ensure email is a valid email format
          firstName: { type: "string" },
          lastName: { type: "string" },
          password: { type: "string" },
        },
      },
    },
  },
};

export const userEmailSchema: FastifySchema = {
  body: {
    type: "object",
    required: ["user"],
    properties: {
      user: {
        type: "object",
        required: ["email", "password"], // Adding required fields
        properties: {
          ...userBaseProps,
          email: { type: "string", format: "email" }, // Ensure email is a valid email format
          password: { type: "string" },
        },
      },
    },
  },
};

export const userVerifyRequestSchema: FastifySchema = {
  body: {
    type: "object",
    required: ["user"],
    properties: {
      user: {
        type: "object",
        required: ["email", "confirmationCode"],
        properties: {
          email: {
            type: "string",
            format: "email",
          },
          confirmationCode: {
            type: "string",
          },
        },
      },
    },
  },
};

export const userVerifyResponseSchema: FastifySchema = {
  response: {
    200: {
      type: "object",
      properties: {},
    },
    400: {
      type: "object",
      properties: {
        error: { type: "string" },
      },
      required: ["error"],
    },
    404: {
      type: "object",
      properties: {
        error: { type: "string" },
      },
      required: ["error"],
    },
  },
};