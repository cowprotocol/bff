# BFF (Backend For Frontend)

Backend for frontend is a series of backend services and libraries that enhance user experience for the frontend. 

## Getting Started

Install dependencies:

```bash
yarn
```

Create the `.env` file:

```bash
# If you are not using docker
cp .env.example .env

# If you are using docker (handy to launch a service directly using NX)
cp .env.example .env.docker
```

Start docker:
```bash
yarn compose:up
```

# Develop
## Notification Producer
Make sure your `.env` file is defined, if not create one using `.env.example` as a template.

```bash
# Start RabbitMQ
docker-compose up -d queue

# Start the notification producer
yarn producer
```
## Create a new service or library

To add a new app or library, you can run the following command;

```bash
# New API
yarn new:fastify

# New Library
yarn new:lib

# New Node app
yarn new:node
```

For APIs and apps, it will create a Dockerfile. Please, remember to update:
- The `docker-compose.yml` file to include the new service.
- The github actions to include the new service (`.github/workflows/ci.yml`)

For more info, see:
- [@nx/node:application](https://nx.dev/packages/node/generators/application): Generator for Applications
- [@nx/node:application (Fastify)](https://nx.dev/showcase/example-repos/add-fastify): Generator for API Applications using Fastify 
- [@nx/node:setup-docker](https://nx.dev/nx-api/node/generators/library): Generator for NodeJS Libraries
- [@nx/node:setup-docker](https://nx.dev/nx-api/node/generators/setup-docker): Docker Generator

## Test

 ```
 # Run all tests
 yarn test

 # Run test for repositories (in watch mode)
 nx run repositories:test --watch

 # Run test on specific file (in watch mode)
 nx run repositories:test --watch --testFile=libs/repositories/src/UsdRepository/UsdRepositoryRedis.spec.ts
 ```


# Build
## Docker

Build docker containers and publish to a local registry:

```bash
yarn docker-build:affected
```

# Generate Types
There's some API types that are generated automatically from their swagger definitions. To generate them, run:

```bash
yarn gen:types
```