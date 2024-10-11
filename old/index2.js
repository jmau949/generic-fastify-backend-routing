import Fastify from "fastify";
import greetingsController from './greetingsController.js'
import config from '../src/config.js'

const fastify = Fastify({
    logger: true  // development
})

const options = {
    schema: {
        params: {
            properties : {
                name: { 
                    type: 'string' 
                }
            },
            required: [ 'name']
        },
        querystring: {
            properties: {
                lastName : {
                    type: 'string'
                }
            },
            required: ['lastName']
        },
        response : {
            200: {
                properties : {
                    message : {
                        type: 'string'
                    }
                },
                required: ['message']
            }
        }
    }
}




/// alternative syntax
fastify.route({
    method: "GET",
    url: '/hello/:name', 
    schema: options.schema,
    handler: (req, reply) => {
        return {
            message: `Hello ${req.params.name} ${req.query.lastName}`,
            test:"test"
        }
    }
})



fastify.register(greetingsController, {prefix : '/greetings'})






class Application {
    constructor() {
        this.server = Fastify({
            logger: true  // development
        })
    }
    async startHttpServer() {
        try {
            const address = await this.server.listen({ port: config.port })
            console.log(`Server listening at ${address}`)
        } catch (error) {
            this.server.log.error(error)
            process.exit(1)
        }
    }
    async main() {
        // await AppDataSource.initialize()
        await this.startHttpServer();
    }
}



const appInstance = new Application();
appInstance.main();