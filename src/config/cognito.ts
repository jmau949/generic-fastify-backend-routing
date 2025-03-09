import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import * as dotenv from "dotenv";

// Load the appropriate .env file based on the NODE_ENV environment variable
const env: string = process.env.NODE_ENV || "dev"; // Default to 'dev' if NODE_ENV is not set
dotenv.config({ path: `.env.${env}` });

// Initialize Cognito client
const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION as string,
  ...(process.env.USE_AWS_CREDENTIALS === "true"
    ? {
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
        },
      }
    : {}), // Use IAM role credentials when running in AWS
});


export default cognitoClient;
