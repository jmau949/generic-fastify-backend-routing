import { FastifyPluginCallback, FastifySchema } from "fastify";
import {
  CognitoIdentityProviderClient,
  AdminGetUserCommand,
  SignUpCommand,
  AdminDeleteUserCommand,
  AdminUpdateUserAttributesCommand,
  AdminInitiateAuthCommand,
  AuthFlowType,
} from "@aws-sdk/client-cognito-identity-provider";
import { User } from "../models/user";
import { IIdParams, ISuccessfulReply } from "./interface/generic.interface";
import { IUserBody, IUserReply, ITokenBody } from "./interface/user.interface";
import { idParamsSchema, successfulResponseSchema } from "./schemas/generic.schemas";
import { userResponseSchema, userBodySchema, tokenResponseSchema } from "./schemas/user.schemas";
import { auth } from "../helpers/authentication";

// Initialize AWS Cognito client
const cognitoClient = new CognitoIdentityProviderClient({ region: "us-east-1" });

// Define constants for your Cognito User Pool
const USER_POOL_ID = "your_user_pool_id"; // Replace with your Cognito User Pool ID
const CLIENT_ID = "your_client_id"; // Replace with your Cognito App Client ID

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
    console.error("Error fetching user from Cognito:", error);
    throw new Error("Could not fetch user from Cognito");
  }
};

export const userController: FastifyPluginCallback = (server, options, done) => {
  server.get<{
    Params: IIdParams;
    Reply: IUserReply;
  }>("/:id", { schema: { ...idParamsSchema, ...userResponseSchema }, ...auth(server) }, async (request, reply) => {
    const { id } = request.params;
    const user = await getUserById(id);
    if (!user) throw new Error("User not found");
    reply.code(200); // ADD SEND({user})
  });

  server.post<{
    Body: IUserBody;
    Reply: IUserReply;
  }>("/", { schema: { ...userBodySchema, ...userResponseSchema } }, async (request, reply) => {
    const { email, firstName, lastName, password } = request.body;

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
          Name: "name",
          Value: firstName,
        },
        {
          Name: "lastName",
          Value: lastName,
        },
      ],
    };
    try {
      const user = new User(email, password, firstName, lastName);
      const command = new SignUpCommand(signUpParams);
      const response = await cognitoClient.send(command);
      console.log("User sign-up successful:", response);
      reply.code(200).send({ user });
    } catch (error) {
      console.error("Error signing up user:", error);
    }
  });

  server.post<{
    Body: IUserBody;
    Reply: ITokenBody;
  }>("/login", { schema: { ...userBodySchema, ...tokenResponseSchema } }, async (request, reply) => {
    const { email, password, firstName, lastName } = request.body;
    const authParams = {
      UserPoolId: USER_POOL_ID,
      ClientId: CLIENT_ID,
      AuthFlow: AuthFlowType.ADMIN_NO_SRP_AUTH, // Using password-based auth flow
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
    };
    try {
      // Send the authentication request to Cognito
      const user = new User(email, password, firstName, lastName);
      const command = new AdminInitiateAuthCommand(authParams);
      const authResponse = await cognitoClient.send(command);

      const idToken = authResponse.AuthenticationResult?.IdToken;
      const refreshToken = authResponse.AuthenticationResult?.RefreshToken;
      const accessToken = authResponse.AuthenticationResult?.AccessToken;

      if (!idToken || !accessToken) {
        throw new Error("blah");
      }

      // Create a JWT for the session using Fastify JWT
      // Return the authentication tokens if login is successful
      reply.code(200).send({
        token: authResponse.AuthenticationResult?.AccessToken || "",
      });
    } catch (error) {
      console.error("Error during login", error);
      throw new Error("Error logging in");
    }
  });

  server.put<{
    Body: IUserBody;
    Reply: ISuccessfulReply;
  }>("/", { schema: { ...userBodySchema, ...successfulResponseSchema } }, async (request, reply) => {
    const { id, email, firstName, lastName } = request.body;
    const updateParams = {
      UserPoolId: USER_POOL_ID,
      Username: id, // The user's Cognito ID
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
      // Send the update request to Cognito
      const updateCommand = new AdminUpdateUserAttributesCommand(updateParams);
      await cognitoClient.send(updateCommand);

      reply.code(200).send({ message: "User update successful" });
    } catch (error) {
      console.error("Error updating user", error);
      reply.code(500).send({ message: "Error updating user" });
    }
  });

  server.delete<{
    Params: IIdParams;
    Reply: ISuccessfulReply;
  }>("/:id", { schema: { ...idParamsSchema, ...successfulResponseSchema } }, async (request, reply) => {
    const { id } = request.params;

    const deleteParams = {
      UserPoolId: USER_POOL_ID,
      Username: id, // Cognito User ID
    };

    try {
      // Send the delete request to Cognito
      const deleteCommand = new AdminDeleteUserCommand(deleteParams);
      await cognitoClient.send(deleteCommand);

      reply.code(200).send({ message: "User deletion successful" });
    } catch (error) {
      console.error("Error deleting user", error);
      reply.code(500).send({ message: "Error deleting user" });
    }
  });

  done();
};
