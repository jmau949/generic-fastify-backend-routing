import {
  SignUpCommand,
  AdminUpdateUserAttributesCommand,
  ConfirmSignUpCommand,
  GetUserCommand,
  AuthFlowType,
  InitiateAuthCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
  GetUserCommandOutput,
  ResendConfirmationCodeCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import cognitoClient from "../config/cognito";
import { calculateSecretHash } from "../utils/crypto-utils";
import { REFRESH_TOKEN_AUTH } from "../config/constants";
const USER_POOL_ID = process.env.AWS_COGNITO_USER_POOL_ID;
const CLIENT_ID = process.env.AWS_COGNITO_CLIENT_ID;
const CLIENT_SECRET = process.env.AWS_COGNITO_CLIENT_SECRET;
import { AuthError } from "../utils/error-handler";
// Validate the required environment variables
if (!CLIENT_ID || !CLIENT_SECRET) {
  throw new Error("Cognito credentials not found in environment variables");
}

interface UserDetails {
  email: string;
  firstName: string;
  lastName: string;
}

const generateSecretHash = (email: string) => calculateSecretHash(CLIENT_ID, CLIENT_SECRET, email);

export const userService = {
  async createUser({ email, firstName, lastName, password }: UserDetails & { password: string }) {
    const command = new SignUpCommand({
      ClientId: CLIENT_ID,
      Username: email,
      Password: password,
      UserAttributes: [
        { Name: "email", Value: email },
        { Name: "given_name", Value: firstName },
        { Name: "family_name", Value: lastName },
      ],
      SecretHash: generateSecretHash(email),
    });
    await cognitoClient.send(command);
    return { email, firstName, lastName };
  },

  // cognito confirm
  async confirmUser({ email, confirmationCode }: { email: string; confirmationCode: string }) {
    const command = new ConfirmSignUpCommand({
      Username: email,
      ConfirmationCode: confirmationCode,
      ClientId: CLIENT_ID,
      SecretHash: generateSecretHash(email),
    });
    await cognitoClient.send(command);
  },

  //login
  async login({ email, password }: { email: string; password: string }) {
    const secretHash = calculateSecretHash(CLIENT_ID, CLIENT_SECRET, email);
    const command = new InitiateAuthCommand({
      ClientId: CLIENT_ID,
      AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
      AuthParameters: { USERNAME: email, PASSWORD: password, SECRET_HASH: secretHash },
    });
    const response = await cognitoClient.send(command);
    if (!response.AuthenticationResult?.AccessToken) throw new Error("Missing authentication token");
    return response.AuthenticationResult;
  },
  // web verify
  async verifyUser(token: string) {
    if (!token) throw new AuthError("Authentication required", "MISSING_TOKEN");

    const response: GetUserCommandOutput = await cognitoClient.send(new GetUserCommand({ AccessToken: token }));

    // Use a direct loop instead of Object.fromEntries to avoid extra object creation
    let email: string | null = null;
    let firstName: string | null = null;
    let lastName: string | null = null;
    let userId: string | null = null;

    if (response.UserAttributes) {
      for (const attr of response.UserAttributes) {
        switch (attr.Name) {
          case "email":
            email = attr.Value || null;
            break;
          case "given_name":
            firstName = attr.Value || null;
            break;
          case "family_name":
            lastName = attr.Value || null;
            break;
          case "sub":
            userId = attr.Value || null;
            break;
        }
      }
    }

    return { email, firstName, lastName, userId };
  },

  // async updateUserAttributes({ email, firstName, lastName }: UserDetails) {
  //   const command = new AdminUpdateUserAttributesCommand({
  //     UserPoolId: USER_POOL_ID,
  //     Username: email,
  //     UserAttributes: [
  //       { Name: "given_name", Value: firstName },
  //       { Name: "family_name", Value: lastName },
  //     ],
  //   });
  //   await cognitoClient.send(command);
  // },

  async forgotPassword(email: string) {
    const command = new ForgotPasswordCommand({
      ClientId: CLIENT_ID,
      SecretHash: generateSecretHash(email),
      Username: email,
    });
    await cognitoClient.send(command);
  },

  async confirmForgotPassword(email: string, code: string, password: string) {
    const command = new ConfirmForgotPasswordCommand({
      ClientId: CLIENT_ID,
      Username: email,
      ConfirmationCode: code,
      Password: password,
      SecretHash: generateSecretHash(email),
    });
    await cognitoClient.send(command);
  },

  async resendConfirmationCode(email: string) {
    const command = new ResendConfirmationCodeCommand({
      ClientId: CLIENT_ID,
      Username: email,
      SecretHash: generateSecretHash(email),
    });
    await cognitoClient.send(command);
  },
  async refreshToken(refreshToken: string, email: string) {
    const command = new InitiateAuthCommand({
      AuthFlow: REFRESH_TOKEN_AUTH,
      ClientId: CLIENT_ID,
      AuthParameters: {
        REFRESH_TOKEN: refreshToken,
        SECRET_HASH: generateSecretHash(email),
      },
    });

    const response = await cognitoClient.send(command);
    return response.AuthenticationResult;
  },
};
