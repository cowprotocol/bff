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

# Start DB
docker-compose up -d db

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

# FAQ

## Typeorm `DriverPackageNotInstalledError`

```
{"type":"DriverPackageNotInstalledError","message":"Postgres package has not been found installed. Try to install it: npm install pg --save","stack":"DriverPackageNotInstalledError: Postgres package has not been found installed. Try to install it: npm install pg
```

If you have faced the error above - check this fix and its description:
https://github.com/cowprotocol/bff/pull/101

# Development notes

## Notifications
To run locally the notifications, you will need to run:
- RabbitMQ locally: `docker-compose up -d queue`
- DB locally: `docker-compose up -d db`
- Telegram consumer: `yarn telegram`
- Notification producer: `yarn producer`

You need to make sure you have the relevant environment variables set.

## Quick PUSH notifications Test
There's a unit test used as a convenient way to do a quick test of the PUSH notifications.

If you have a subscription to any of the channels (i.e. Telegram), you can use the following command to send a test notification:

```bash
# Replace the POST_TO_QUEUE_ACCOUNT with your account address
POST_TO_QUEUE_ACCOUNT=0x79063d9173C09887d536924E2F6eADbaBAc099f5 nx test notification-producer --testFile=src/sendPush.test.ts
```
# Database Migrations
The database access, and therefore the migrations is handled in `libs/repositories`.


## Create a new migration
To create a new migration, run:
```bash
# Create a new migration with "your-migration-name" as name
yarn typeorm migration:create src/migrations/your-migration-name

# Alternatively, you could define the entities in `libs/repositories/src/database` and then run:
yarn migration:generate
```

This will create a new migration file in the `libs/repositories/src/migrations` directory. For example `1745364046891-initial-migration.ts`. 

Inside this file, you will need to edit the migration logic, where:
- `up` is the logic to execute the migration
- `down` is the logic to revert the migration

## Run migrations
Once you have added the migration logic, you can run the migration with:
```bash
yarn migration:run
```

## Revert migrations
To revert the last migration, run:
```bash
yarn migration:revert
```


