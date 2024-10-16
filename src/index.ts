import "reflect-metadata";
import fastify, { FastifyInstance } from "fastify";
import config from "./config/config";
import { userController } from "./controllers/user-controllers";
import auth from "./plugins/auth";
import corsConfig from "./config/corsConfig"; // Import CORS config
import cors from "@fastify/cors";

class Application {
  server: FastifyInstance;

  constructor() {
    this.server = fastify({
      logger: true, // development
    });
  }
  async startHttpServer() {
    try {
      console.log("config.port", config.port);
      const address = await this.server.listen({ port: config.port });
      console.log(`Server listening at ${address}`);
    } catch (error) {
      this.server.log.error(error);
      process.exit(1);
    }
  }
  registerPlugins() {
    const env = (process.env.NODE_ENV as keyof typeof corsConfig) || "dev";
    this.server.register(cors, corsConfig[env]);
    this.server.register(auth);
  }
  registerControllors() {
    this.server.register(userController, {
      prefix: `${config.apiPrefix}/users`,
    });
  }
  async main() {
    console.log("NODE_ENV IS ", process.env.NODE_ENV);

    // await AppDataSource.initialize()
    this.registerPlugins();
    this.registerControllors();
    await this.startHttpServer();
  }
}

const appInstance = new Application();
appInstance.main();
