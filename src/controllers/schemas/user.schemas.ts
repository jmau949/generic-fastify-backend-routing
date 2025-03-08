import fastify, { FastifySchema } from "fastify";
import { NAME_MAX_LENGTH, NAME_MIN_LENGTH, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "../../config/constants";
import { maxLength } from "class-validator";

export const userGetMeResponseSchema: FastifySchema = {
  response: {
    200: {
      type: "object",
      properties: {
        user: {
          type: "object",
          properties: {
            email: { type: "string", format: "email", nullable: true },
            firstName: { type: "string", nullable: true },
            lastName: { type: "string", nullable: true },
            userId: { type: "string", nullable: true },
          },
          required: ["userId"], // Ensure at least `userId` is present
        },
      },
      required: ["user"],
    },
    401: {
      type: "object",
      properties: {
        error: { type: "string" },
        errorCode: { type: "string" },
      },
      required: ["error"],
    },
  },
};
export const userSignUpRequestSchema: FastifySchema = {
  body: {
    type: "object",
    properties: {
      user: {
        type: "object",
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: PASSWORD_MIN_LENGTH, maxLength: PASSWORD_MAX_LENGTH },
          firstName: { type: "string", minLength: NAME_MIN_LENGTH, maxLength: NAME_MAX_LENGTH },
          lastName: { type: "string", minLength: NAME_MIN_LENGTH, maxLength: NAME_MAX_LENGTH },
        },
        required: ["email", "password", "firstName", "lastName"],
      },
    },
    required: ["user"],
  },
};

export const userSignUpResponseBodySchema: FastifySchema = {
  response: {
    200: {
      type: "object",
      properties: {
        user: {
          type: "object",
          properties: {
            email: { type: "string", format: "email" },
            firstName: { type: "string" },
            lastName: { type: "string" },
          },
          required: ["email", "firstName", "lastName"],
        },
      },
      required: ["user"],
    },
    400: {
      type: "object",
      properties: {
        error: { type: "string" },
        errorCode: { type: "string" },
      },
      required: ["error"],
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
        errorCode: { type: "string" },
      },
      required: ["error"],
    },
    404: {
      type: "object",
      properties: {
        error: { type: "string" },
        errorCode: { type: "string" },
      },
      required: ["error"],
    },
  },
};

export const userLoginRequestSchema: FastifySchema = {
  body: {
    type: "object",
    properties: {
      user: {
        type: "object",
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: PASSWORD_MIN_LENGTH, maxLength: PASSWORD_MAX_LENGTH },
        },
        required: ["email", "password"],
      },
    },
    required: ["user"],
  },
};

export const userLoginResponseSchema: FastifySchema = {
  response: {
    200: {
      type: "object",
      properties: {},
    },
    401: {
      type: "object",
      properties: {
        error: { type: "string" },
        errorCode: { type: "string" },
      },
      required: ["error"],
    },
  },
};

export const userUpdateRequestSchema: FastifySchema = {
  body: {
    type: "object",
    properties: {
      user: {
        type: "object",
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: PASSWORD_MIN_LENGTH, maxLength: PASSWORD_MAX_LENGTH },
          firstName: { type: "string", minLength: NAME_MIN_LENGTH, maxLength: NAME_MAX_LENGTH },
          lastName: { type: "string", minLength: NAME_MIN_LENGTH, maxLength: NAME_MAX_LENGTH },
        },
        required: [],
      },
    },
    required: ["user"],
  },
};

export const userUpdateResponseSchema: FastifySchema = {
  response: {
    200: {
      type: "object",
      properties: {},
      required: [],
    },
    400: {
      type: "object",
      properties: {
        error: { type: "string" },
        errorCode: { type: "string" },
      },
      required: ["error"],
    },
  },
};

export const userForgotPasswordRequestSchema = {
  body: {
    type: "object",
    properties: {
      user: {
        type: "object",
        properties: {
          email: { type: "string", format: "email" },
        },
        required: ["email"],
      },
    },
    required: ["user"],
  },
};

export const userForgotPasswordResponseSchema = {
  response: {
    200: {
      type: "object",
      properties: {},
    },
    400: {
      type: "object",
      properties: {
        error: { type: "string" },
        errorCode: { type: "string" },
      },
    },
  },
};

export const userConfirmForgotPasswordRequestSchema = {
  body: {
    type: "object",
    properties: {
      user: {
        type: "object",
        properties: {
          email: { type: "string", format: "email" },
          code: { type: "string", minLength: 6 }, // Verification code from Cognito
          password: { type: "string", minLength: PASSWORD_MIN_LENGTH, maxLength: PASSWORD_MAX_LENGTH }, // New password
        },
        required: ["email", "code", "password"],
      },
    },
    required: ["user"],
  },
};

export const userConfirmForgotPasswordResponseSchema = {
  response: {
    200: {
      type: "object",
      properties: {}, // Empty object on success
    },
    400: {
      type: "object",
      properties: {
        error: { type: "string" },
        errorCode: { type: "string" },
      },
    },
  },
};

export const userResendConfirmationCodeRequestSchema = {
  body: {
    type: "object",
    properties: {
      user: {
        type: "object",
        properties: {
          email: { type: "string", format: "email" },
        },
        required: ["email"],
      },
    },
    required: ["user"],
  },
};

export const userResendConfirmationCodeResponseSchema = {
  response: {
    200: {
      type: "object",
      properties: {}, // Empty object on success
    },
    400: {
      type: "object",
      properties: {
        error: { type: "string" },
        errorCode: { type: "string" },
      },
    },
  },
};