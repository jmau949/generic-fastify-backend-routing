import { InitiateAuthCommand, AuthFlowType, GetUserCommand } from "@aws-sdk/client-cognito-identity-provider";
import cognitoClient from "../config/cognito";
import { calculateSecretHash } from "../utils/crypto-utils";

const USER_POOL_ID = process.env.AWS_COGNITO_USER_POOL_ID;
const CLIENT_ID = process.env.AWS_COGNITO_CLIENT_ID;
const CLIENT_SECRET = process.env.AWS_COGNITO_CLIENT_SECRET;

export const authService = {
  async login({ email, password }: { email: string; password: string }) {
    const secretHash = calculateSecretHash(CLIENT_ID, CLIENT_SECRET, email);

    const params = {
      ClientId: CLIENT_ID,
      AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
      AuthParameters: { USERNAME: email, PASSWORD: password, SECRET_HASH: secretHash },
    };

    const command = new InitiateAuthCommand(params);
    const response = await cognitoClient.send(command);

    if (!response.AuthenticationResult?.AccessToken) throw new Error("Missing authentication token");
    return response.AuthenticationResult.AccessToken;
  },

  async verifyUser(token: string) {
    if (!token) throw new Error("Unauthorized - No Token");

    const params = { AccessToken: token };
    const command = new GetUserCommand(params);
    const response = await cognitoClient.send(command);

    return response;
  },
};
