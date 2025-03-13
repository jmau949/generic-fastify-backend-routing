# **Fastify Backend Service**

This is a **Fastify-based backend service** that provides authentication, user management, and secure API endpoints using **AWS Cognito** and **cookie-based authentication**.

## **Table of Contents**

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Running the Server](#running-the-server)
- [Authentication Flow](#authentication-flow)
- [API Routes](#api-routes)
- [Middleware and Plugins](#middleware-and-plugins)
- [Error Handling](#error-handling)
- [Security Features](#security-features)
- [Postman Collection](#postman-collection)

## **Overview**

This Fastify backend handles:

- **User Authentication** with AWS Cognito
- **JWT validation** stored in **HttpOnly, Secure cookies**
- **User registration, login, logout, profile updates**
- **Fast and scalable API performance**
- **CORS, Helmet, and security configurations**

## **Tech Stack**

| Technology             | Purpose                                         |
| ---------------------- | ----------------------------------------------- |
| **Fastify**            | Lightweight, high-performance Node.js framework |
| **AWS Cognito**        | User authentication and identity management     |
| **Fastify-Cookie**     | Handles session management with cookies         |
| **Fastify-CORS**       | Enables cross-origin requests                   |
| **Fastify-Helmet**     | Security middleware for HTTP headers            |
| **JWT (jsonwebtoken)** | Used to verify authentication tokens            |
| **Axios**              | For external API calls (fetching Cognito keys)  |
| **TypeScript**         | Strong typing for better maintainability        |

## **Installation**

Clone the repository:

```sh
git clone https://github.com/jmau949/generic-fastify-backend-routing.git
cd generic-fastify-backend-routing
```

Install dependencies:

```sh
npm install
npm run dev
```

## **Environment Variables**

Create a `.env` file in the root directory and define the required environment variables:

```sh
PORT=3010
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=aws-access-key-id
AWS_SECRET_ACCESS_KEY=aws-secret-access-key
AWS_COGNITO_USER_POOL_ID=your-cognito-user-pool-id
AWS_COGNITO_CLIENT_ID=your-cognito-app-client-id
AWS_COGNITO_CLIENT_SECRET=your-secure-cookie-secret
NODE_ENV=dev
```

Explanation of Variables:

- **PORT** → Defines the port the Fastify server runs on.
- **AWS_ACCESS_KEY_ID**
- **AWS_SECRET_ACCESS_KEY**
- **AWS_REGION** → AWS region where Cognito is hosted.
- **AWS_COGNITO_USER_POOL_ID** → ID of the Cognito user pool.
- **AWS_COGNITO_CLIENT_ID** → Cognito application client ID.
- **COOKIE_SECRET** → Secret for signing cookies.
- **NODE_ENV** → Set to production for live environments.

# Below are for lambda deployments

- **CERTIFICATE_ARN**
- **SENTRY_LAMBDA_LAYER_ARN**
- **HOSTED_ZONE_ID**

For running in Sam local, need env.json file that looks like env.example.json



## **Running the Server**

To start the Fastify server in development mode:

```sh
npm run dev
```

```sh
npm run sam:local
```

For production:

```sh
npm start
```

After starting, the server will listen at:

```sh
http://localhost:3010
```

### Deployment Production

```sh
npm run build:lambda
npm run sam:build
npm run sam:deploy
```

to create lambda layers
```
mkdir -p sentry-layer/nodejs
cd sentry-layer/nodejs
npm init -y
npm install @sentry/node@9.5.0
cd ..
zip -r sentry-layer.zip nodejs

aws lambda publish-layer-version \
  --layer-name SentryLayer \
  --description "Sentry monitoring package for Fastify Lambda" \
  --zip-file fileb://sentry-layer.zip \
  --compatible-runtimes nodejs18.x \
  --region us-west-2
```


## **Authentication Flow**

This backend follows a cookie-based JWT authentication mechanism.

### How It Works

1. **User Logs In**
   - Client sends a `POST /api/v1/users/login` request with email and password.
   - Backend authenticates against AWS Cognito.
   - Upon successful login, the server sets an `authToken` cookie.
2. **User Requests a Protected Route**
   - Client automatically includes the `authToken` cookie when making API requests.
   - Fastify extracts the token from the cookie and validates it with AWS Cognito.
3. **User Logs Out**
   - Client sends `POST /api/v1/users/logout`.
   - Server clears the `authToken` cookie.

### JWT Handling

- Tokens are stored in an HttpOnly and Secure cookie (cannot be accessed by JavaScript).
- Tokens expire based on Cognito's session timeout.
- On every request, Fastify middleware verifies the JWT validity.


#### Register a New User

```http
POST /api/v1/users
```

**Request Body:**

```json
{
  "user": {
    "email": "example@email.com",
    "firstName": "John",
    "lastName": "Doe",
    "password": "SecurePassword123!"
  }
}
```

**Response:**

```json
{
  "message": "User registered successfully"
}
```

#### Login User

```http
POST /api/v1/users/login
```

**Request Body:**

```json
{
  "user": {
    "email": "example@email.com",
    "password": "SecurePassword123!"
  }
}
```

**Response:**

```json
{
  "message": "Login successful"
}
```

📌 Sets an `authToken` cookie upon successful login.

#### Get Current User

```http
GET /api/v1/users/me
```

**Response:**

```json
{
  "user": {
    "email": "example@email.com",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

📌 Requires authentication (reads `authToken` from cookie).

#### Logout User

```http
POST /api/v1/users/logout
```

**Response:**

```json
{
  "message": "Logged out successfully"
}
```

📌 Clears the `authToken` cookie.

## **Middleware and Plugins**

| Plugin         | Purpose                              |
| -------------- | ------------------------------------ |
| Fastify-Cookie | Handles cookies (`authToken`)        |
| Fastify-Helmet | Secures HTTP headers                 |
| Fastify-CORS   | Enables secure cross-origin requests |

## **Error Handling**

Errors follow this structured format:

```json
{
  "error": "Unauthorized",
  "errorCode": "CognitoException"
}
```

## **Security Features**

- ✔ Cookies are HttpOnly and Secure (prevents XSS attacks).
- ✔ JWT verification ensures users are authenticated.
- ✔ CORS configured for secure cross-origin requests.

## **Postman Collection**

To test the API, import the following JSON file into Postman.

📥 **Download Postman Collection**

To import in Postman:

- Open Postman.
- Click **Import**.
- Upload the `postman_collection.json`.
- Test all available routes.
