import { FastifyPluginCallback, FastifyReply, FastifySchema } from "fastify";
import {
  CognitoIdentityProviderClient,
  AdminGetUserCommand,
  SignUpCommand,
  AdminDeleteUserCommand,
  AdminUpdateUserAttributesCommand,
  AdminInitiateAuthCommand,
  AuthFlowType,
  InitiateAuthCommand, // can change this to AdminInitiateAuthCommand
  AdminCreateUserCommand, // can change to this one to create user because server, need set verified = false
} from "@aws-sdk/client-cognito-identity-provider";
import { User } from "../models/user";
import { IIdParams, ISuccessfulReply, IErrorReply, IEmailParams } from "./interface/generic.interface";
import { IUserBody, IUserReply, ITokenBody, IUserEmail } from "./interface/user.interface";
import { emailParamsSchema, successfulResponseSchema } from "./schemas/generic.schemas";
import { userResponseSchema, userBodySchema, tokenResponseSchema, userEmailSchema } from "./schemas/user.schemas";
import cognitoClient from "../config/cognito";
import constants from "../config/constants";
import * as crypto from "crypto";

// Define constants for your Cognito User Pool
const USER_POOL_ID = process.env.AWS_COGNITO_USER_POOL_ID; // Replace with your Cognito User Pool ID
const CLIENT_ID = process.env.AWS_COGNITO_CLIENT_ID; // Replace with your Cognito App Client ID
const CLIENT_SECRET = process.env.AWS_COGNITO_CLIENT_SECRET;

const calculateSecretHash = (clientId: string, clientSecret: string, username: string): string => {
  return crypto
    .createHmac("SHA256", clientSecret)
    .update(username + clientId)
    .digest("base64");
};
// Function to get user by ID from Cognito
const getUserById = async (userId: string) => {
  const params = {
    UserPoolId: USER_POOL_ID,
    Username: userId, // Cognito User ID is passed as the Username
  };

  try {
    const command = new AdminGetUserCommand(params);
    const response = await cognitoClient.send(command);
    return response; // Returns the user data from Cognito
  } catch (error) {
    if (error.$metadata?.httpStatusCode >= 400 && error.$metadata?.httpStatusCode < 500) {
      throw new Error(`${constants.CLIENT_ERROR}: ${error.name || "UnknownError"} ${error.message || ""}`);
    }
    console.error("Error fetching user from Cognito:", error);
    throw new Error("Could not fetch user from Cognito");
  }
};

// Separate function to handle Cognito sign-up
async function signUpUserWithCognito(email: string, firstName: string, lastName: string, password: string) {
  // Calculate the secret hash
  const secretHash = calculateSecretHash(CLIENT_ID, CLIENT_SECRET, email);
  console.log("secretHash", secretHash);

  // Define Cognito sign-up params
  const signUpParams = {
    ClientId: CLIENT_ID,
    Username: email,
    Password: password,
    UserAttributes: [
      {
        Name: "email",
        Value: email,
      },
      {
        Name: "given_name",
        Value: firstName,
      },
      {
        Name: "family_name",
        Value: lastName,
      },
    ],
    SecretHash: secretHash, // Add the secret hash here
  };

  // Send the sign-up command to Cognito
  try {
    const command = new SignUpCommand(signUpParams);
    const response = await cognitoClient.send(command);
    console.log("response11111", response);
  } catch (error) {
    if (error.$metadata?.httpStatusCode >= 400 && error.$metadata?.httpStatusCode < 500) {
      throw new Error(`${constants.CLIENT_ERROR}: ${error.name || "UnknownError"} ${error.message || ""}`);
    }
    console.error("Error during Cognito sign up:", error);
    throw new Error("Cognito Sign Up Failed");
  }
}

const authenticateUserWithCognito = async (email: string, password: string) => {
  const secretHash = calculateSecretHash(CLIENT_ID, CLIENT_SECRET, email);
  const params = {
    UserPoolId: USER_POOL_ID,
    ClientId: CLIENT_ID,
    AuthFlow: AuthFlowType.USER_PASSWORD_AUTH, // Changed to USER_PASSWORD_AUTH
    AuthParameters: {
      USERNAME: email,
      PASSWORD: password,
      SECRET_HASH: secretHash, // Add the secret hash here
    },
  };

  try {
    const command = new InitiateAuthCommand(params);
    const response = await cognitoClient.send(command);

    const idToken = response.AuthenticationResult?.IdToken;
    const accessToken = response.AuthenticationResult?.AccessToken;

    if (!idToken || !accessToken) {
      throw new Error("Missing tokens in Cognito response");
    }

    return response.AuthenticationResult; // Return all authentication tokens
  } catch (error) {
    if (error.$metadata?.httpStatusCode >= 400 && error.$metadata?.httpStatusCode < 500) {
      throw new Error(`${constants.CLIENT_ERROR}: ${error.name || "UnknownError"} ${error.message || ""}`);
    }
    console.error("Error during Cognito authentication:", error);
    throw new Error("Authentication failed with Cognito");
  }
};

const updateUserAttributesInCognito = async (email: string, firstName: string, lastName: string) => {
  const updateParams = {
    UserPoolId: USER_POOL_ID,
    Username: email,
    UserAttributes: [
      {
        Name: "email",
        Value: email,
      },
      {
        Name: "given_name", // Cognito attribute for first name
        Value: firstName,
      },
      {
        Name: "family_name", // Cognito attribute for last name
        Value: lastName,
      },
    ],
  };

  try {
    const updateCommand = new AdminUpdateUserAttributesCommand(updateParams);
    const response = await cognitoClient.send(updateCommand);
    return response;
  } catch (error) {
    if (error.$metadata?.httpStatusCode >= 400 && error.$metadata?.httpStatusCode < 500) {
      throw new Error(`${constants.CLIENT_ERROR}: ${error.name || "UnknownError"} ${error.message || ""}`);
    }
    console.error("Error during Cognito update:", error);
    throw new Error("Error during User update");
  }
};

async function deleteUserFromCognito(email: string): Promise<void> {
  const deleteParams = {
    UserPoolId: USER_POOL_ID,
    Username: email, // Cognito User ID
  };

  try {
    const deleteCommand = new AdminDeleteUserCommand(deleteParams);
    await cognitoClient.send(deleteCommand);
  } catch (error) {
    if (error.$metadata?.httpStatusCode >= 400 && error.$metadata?.httpStatusCode < 500) {
      throw new Error(`${constants.CLIENT_ERROR}: ${error.name || "UnknownError"} ${error.message || ""}`);
    }
    console.error("Error during deleting User", error);
    throw new Error("Error during User update");
  }
}

const handleError = (reply: FastifyReply, message: string, statusCode = 500) => {
  reply.code(statusCode).send({ error: message });
};

export const userController: FastifyPluginCallback = (server, options, done) => {
  server.get<{
    Params: IEmailParams;
    Reply: IUserReply | IErrorReply;
  }>(
    "/:email",
    { schema: { ...emailParamsSchema, ...userResponseSchema }, preHandler: server.authentication },
    async (request, reply) => {
      const { email } = request.params;

      try {
        const cognitoResponse = await getUserById(email);
        const userAttributes = cognitoResponse.UserAttributes.reduce((acc, attr) => {
          acc[attr.Name] = attr.Value;
          return acc;
        }, {} as Record<string, string>);
        const user = new User(
          userAttributes.email,
          "", // Password is not returned from Cognito, so you can handle it accordingly
          userAttributes.given_name,
          userAttributes.family_name
        );
        if (!user) throw new Error("User not found");
        reply.code(200).send({ user }); // ADD SEND({user})
      } catch (error) {
        if (error.message.startsWith(constants.CLIENT_ERROR)) {
          handleError(
            reply,
            error.message.replace(`${constants.CLIENT_ERROR}`, ""),
            error.$metadata?.httpStatusCode || 400
          );
        } else {
          server.log.error("Error fetching user: ", error);
          handleError(reply, "Internal Server Error", 500);
        }
      }
    }
  );

  server.post<{
    Body: IUserBody;
    Reply: IUserReply;
  }>("/", { schema: { ...userBodySchema, ...userResponseSchema } }, async (request, reply) => {
    const { email, firstName, lastName, password } = request.body.user;
    // Calculate the secret hash
    try {
      const user = new User(email, password, firstName, lastName);

      // Call the separate Cognito sign-up function
      const response = await signUpUserWithCognito(email, firstName, lastName, password);
      console.log("User sign-up successful:", response);

      reply.code(200).send({ user });
    } catch (error) {
      if (error.message.startsWith(constants.CLIENT_ERROR)) {
        handleError(
          reply,
          error.message.replace(`${constants.CLIENT_ERROR}`, ""),
          error.$metadata?.httpStatusCode || 400
        );
      } else {
        server.log.error("Error fetching user: ", error);
        handleError(reply, "Internal Server Error", 500);
      }
    }
  });

  server.post<{
    Body: IUserEmail;
    Reply: ITokenBody;
  }>("/login", { schema: { ...userEmailSchema, ...tokenResponseSchema } }, async (request, reply) => {
    const { email, password } = request.body.user;
    try {
      // Send the authentication request to Cognito
      // Authenticate user with Cognito
      const authResult = await authenticateUserWithCognito(email, password);

      // Create a JWT for the session using Fastify JWT
      // Return the authentication tokens if login is successful
      reply.code(200).send({
        token: authResult.AccessToken || "",
      });
    } catch (error) {
      if (error.message.startsWith(constants.CLIENT_ERROR)) {
        handleError(
          reply,
          error.message.replace(`${constants.CLIENT_ERROR}`, ""),
          error.$metadata?.httpStatusCode || 400
        );
      } else {
        server.log.error("Error logging in: ", error);
        handleError(reply, "Internal Server Error", 500);
      }
    }
  });

  server.put<{
    Body: IUserBody;
    Reply: ISuccessfulReply;
  }>(
    "/",
    { schema: { ...userBodySchema, ...successfulResponseSchema }, preHandler: server.authentication },
    async (request, reply) => {
      const { email, firstName, lastName } = request.body.user;

      try {
        // Call the separated Cognito update function
        await updateUserAttributesInCognito(email, firstName, lastName);
        reply.code(200).send({ message: "User update successful" });
      } catch (error) {
        if (error.message.startsWith(constants.CLIENT_ERROR)) {
          handleError(
            reply,
            error.message.replace(`${constants.CLIENT_ERROR}`, ""),
            error.$metadata?.httpStatusCode || 400
          );
        } else {
          server.log.error("Error logging in: ", error);
          handleError(reply, "Internal Server Error", 500);
        }
      }
    }
  );

  server.delete<{
    Params: IEmailParams;
    Reply: ISuccessfulReply;
  }>(
    "/:email",
    { schema: { ...emailParamsSchema, ...successfulResponseSchema }, preHandler: server.authentication },
    async (request, reply) => {
      const { email } = request.params;

      try {
        await deleteUserFromCognito(email);
        reply.code(200).send({ message: "User deletion successful" });
      } catch (error) {
        if (error.message.startsWith(constants.CLIENT_ERROR)) {
          handleError(
            reply,
            error.message.replace(`${constants.CLIENT_ERROR}`, ""),
            error.$metadata?.httpStatusCode || 400
          );
        } else {
          server.log.error("Error fetching user: ", error);
          handleError(reply, "Internal Server Error", 500);
        }
      }
    }
  );

  done();
};
