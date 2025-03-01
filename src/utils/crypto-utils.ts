import * as crypto from "crypto";

export const calculateSecretHash = (clientId: string, clientSecret: string, username: string): string => {
  return crypto
    .createHmac("SHA256", clientSecret)
    .update(username + clientId)
    .digest("base64");
};
