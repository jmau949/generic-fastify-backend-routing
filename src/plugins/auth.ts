import { fastifyPlugin } from "fastify-plugin";
import { FastifyPluginCallback, FastifyReply, FastifyRequest } from "fastify";
import axios from "axios";
import * as jwt from "jsonwebtoken";
const jwkToPem = require("jwk-to-pem");

import config from "../config";

declare module "fastify" {
  export interface FastifyInstance {
    authenticate: Function;
  }
}

const USER_POOL_ID = config.cognito.userPoolId;
const REGION = config.cognito.region;
const JWK_URL = `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}/.well-known/jwks.json`;

let jwksCache: any = null; // To cache the JWKs
let jwksLastFetch = 0;
const CACHE_TTL = 24 * 60 * 60 * 1000; // Cache for 24 hours

// Function to get JWKs from AWS Cognito and cache them
async function getJwks() {
  const now = Date.now();
  if (!jwksCache || now - jwksLastFetch > CACHE_TTL) {
    const response = await axios.get(JWK_URL);
    jwksCache = response.data.keys;
    jwksLastFetch = now;
  }
  return jwksCache;
}

// Function to validate the token
async function validateToken(token: string) {
  const decodedToken = jwt.decode(token, { complete: true });

  if (!decodedToken) {
    throw new Error("Invalid token");
  }

  const jwks = await getJwks();
  const key = jwks.find((k: any) => k.kid === decodedToken.header.kid);

  if (!key) {
    throw new Error("Invalid token signature");
  }

  const pem = jwkToPem(key);

  // Verify the token with the PEM key
  const verifiedToken = jwt.verify(token, pem, {
    issuer: `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`,
    algorithms: ["RS256"],
  });

  return verifiedToken;
}

const authPlugin: FastifyPluginCallback = (server, options, done) => {
  server.decorate("authentication", async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    try {
      const token = request.headers["authorization"]?.split(" ")[1]; // Extract token
      console.log("token", token);
      if (!token) {
        return reply.code(401).send({ message: "No token provided" });
      }
      // Validate the token locally without calling Cognito
      const verifiedToken = await validateToken(token);

      // Attach the token claims to the request object for use in your routes
      //   request.user = verifiedToken;
    } catch (error) {
      return reply.code(401).send({ message: "Invalid token" });
    }
  });

  done();
};

export default fastifyPlugin(authPlugin);
