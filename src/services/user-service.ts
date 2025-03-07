import {
  SignUpCommand,
  AdminUpdateUserAttributesCommand,
  AdminDeleteUserCommand,
  ConfirmSignUpCommand,
  GetUserCommand,
  AuthFlowType,
  InitiateAuthCommand,
  AdminResetUserPasswordCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import cognitoClient from "../config/cognito";
import { calculateSecretHash } from "../utils/crypto-utils";
const USER_POOL_ID = process.env.AWS_COGNITO_USER_POOL_ID;
const CLIENT_ID = process.env.AWS_COGNITO_CLIENT_ID;
const CLIENT_SECRET = process.env.AWS_COGNITO_CLIENT_SECRET;

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
    return response.AuthenticationResult.AccessToken;
  },
  // web verify
  async verifyUser(token: string) {
    if (!token) throw new Error("Unauthorized - No Token");
    const command = new GetUserCommand({ AccessToken: token });
    return await cognitoClient.send(command);
  },

  async updateUserAttributes({ email, firstName, lastName }: UserDetails) {
    const command = new AdminUpdateUserAttributesCommand({
      UserPoolId: USER_POOL_ID,
      Username: email,
      UserAttributes: [
        { Name: "given_name", Value: firstName },
        { Name: "family_name", Value: lastName },
      ],
    });
    await cognitoClient.send(command);
  },

  async forgotPassword(email: string) {
    const command = new AdminResetUserPasswordCommand({
      UserPoolId: USER_POOL_ID,
      Username: email,
    });
    await cognitoClient.send(command);
  },

  async deleteUser(email: string) {
    const command = new AdminDeleteUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: email,
    });
    await cognitoClient.send(command);
  },
};
