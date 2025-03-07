// Enables TypeScript decorators (commonly used with dependency injection or ORM libraries like TypeORM)
import "reflect-metadata";

// Import Fastify and its types
import fastify, { FastifyInstance } from "fastify";

// Import application configuration settings
import config from "./config/config";

// Import user controller (handles user-related routes)
import { userController } from "./controllers/user-controllers";

// Import authentication plugin (handles JWT authentication via cookies)
import auth from "./plugins/auth";

// Import CORS configuration (ensures correct cross-origin settings based on the environment)
import corsConfig from "./config/corsConfig";

// Import CORS plugin for handling cross-origin requests
import cors from "@fastify/cors";

// Import Fastify Cookie plugin (used for handling cookies in requests/responses)
import fastifyCookie from "@fastify/cookie";

// Import Fastify Helmet (adds security headers to protect against attacks like XSS)
import fastifyHelmet from "@fastify/helmet";

// **Application Class**: Manages the Fastify server lifecycle
class Application {
  server: FastifyInstance; // Declare the Fastify instance

  // **Constructor:** Initializes the Fastify server instance
  constructor() {
    this.server = fastify({
      logger: true, // Enables request logging (useful for debugging in development)
    });
  }

  // **Starts the Fastify HTTP Server**
  async startHttpServer() {
    try {
      console.log("config.port", config.port); // Logs the port number (useful for debugging)

      // Start the server on the specified port
      const address = await this.server.listen({ port: config.port });
      console.log(`Server listening at ${address}`);
    } catch (error) {
      this.server.log.error(error); // Log the error if the server fails to start
      process.exit(1); // Exit the process to prevent running in an unstable state
    }
  }

  // **Registers Fastify Plugins (Middleware)**
  registerPlugins() {
    // Determine the current environment (default to "dev" if not set)
    const env = (process.env.NODE_ENV as keyof typeof corsConfig) || "dev";

    // Register Helmet for security (adds important security-related headers)
    this.server.register(fastifyHelmet);

    // Register CORS middleware (allows the frontend to communicate with the backend)
    this.server.register(cors, corsConfig[env]);

    // Register the Cookie plugin (enables Fastify to read and set cookies)
    this.server.register(fastifyCookie, {
      parseOptions: {
        httpOnly: true, // Prevents JavaScript from accessing cookies (protects against XSS)
        secure: process.env.NODE_ENV === "production", // Enforces HTTPS for cookies in production
        sameSite: "strict", // Ensures cookies are only sent with same-site requests (prevents CSRF)
        path: "/", // Cookie is valid across the entire domain
        maxAge: 60 * 60 * 24 * 7, // Cookie expires in 1 week (reduces need for frequent logins)
      },
    });

    // Register authentication plugin (adds `server.authentication` to handle JWT verification)
    this.server.register(auth);
  }

  // **Registers Controllers (Route Handlers)**
  registerControllors() {
    // Register the `userController` for handling user-related routes
    // The prefix ensures all routes inside `userController` are under `/api/v1/users`
    this.server.register(userController, {
      prefix: `${config.apiPrefix}/users`,
    });
  }

  async main() {
    console.log("NODE_ENV IS ", process.env.NODE_ENV);

    // Register all necessary plugins (middleware)
    this.registerPlugins();

    // Register all controllers (routes)
    this.registerControllors();

    await this.startHttpServer();
  }
}

const appInstance = new Application();
appInstance.main();
