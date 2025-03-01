import {
  SignUpCommand,
  AdminUpdateUserAttributesCommand,
  AdminDeleteUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import cognitoClient from "../config/cognito";
import { calculateSecretHash } from "../utils/crypto-utils";

export const userService = {
  async createUser({
    email,
    firstName,
    lastName,
    password,
  }: {
    email: string;
    firstName: string;
    lastName: string;
    password: string;
  }) {
    const secretHash = calculateSecretHash(
      process.env.AWS_COGNITO_CLIENT_ID,
      process.env.AWS_COGNITO_CLIENT_SECRET,
      email
    );

    const params = {
      ClientId: process.env.AWS_COGNITO_CLIENT_ID,
      Username: email,
      Password: password,
      UserAttributes: [
        { Name: "email", Value: email },
        { Name: "given_name", Value: firstName },
        { Name: "family_name", Value: lastName },
      ],
      SecretHash: secretHash,
    };

    const command = new SignUpCommand(params);
    await cognitoClient.send(command);
    return { email, firstName, lastName };
  },

  async updateUserAttributes({ email, firstName, lastName }: { email: string; firstName: string; lastName: string }) {
    const params = {
      UserPoolId: process.env.AWS_COGNITO_USER_POOL_ID,
      Username: email,
      UserAttributes: [
        { Name: "given_name", Value: firstName },
        { Name: "family_name", Value: lastName },
      ],
    };

    const command = new AdminUpdateUserAttributesCommand(params);
    await cognitoClient.send(command);
  },

  async deleteUser(email: string) {
    const params = {
      UserPoolId: process.env.AWS_COGNITO_USER_POOL_ID,
      Username: email,
    };

    const command = new AdminDeleteUserCommand(params);
    await cognitoClient.send(command);
  },
};
