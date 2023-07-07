# Cow Web Services

This repository contains Cow Web Services. These are a collection of web services, in a mono repo, created and used by the Cow Swap frontend.

## Getting Started

This monorepo is managed by NX. To get started, you must first install your dependencies via;

```bash
yarn
```

If you'd like to test out how the containers are functioning, you'll also need a Docker daemon running. You can then run the following command to start the containers;

```bash
yarn compose:up
```

## How to build docker containers?

To build docker containers, simply run the following;

```bash
yarn docker-build:affected
```

This will only build the affected docker containers. After that, you'll need to publish these to your container registry.

## How to create a new service?

To add a new service, you can run the following command;

```bash
yarn create-app
```

After which, you'll be prompted to enter a name for the service, and will have two apps with fastify created for you;

- /apps/{name}
- /apps/{name}-e2e

To have more control over this process and/or to create a non-fastify service, you can refer to the [NX documentation regarding node generators](https://nx.dev/packages/node/generators/application).

A generated service, will have a Dockerfile that you must adjust accordingly. You can refer to the [NX documentation regarding docker generators](https://nx.dev/packages/docker/generators/docker).

For deployments, you will need a Pulumi definition created for your service as well. This needs to be created in the https://github.com/cowprotocol/infrastructure repository. For more information on how to do this, please refer to [INFRASTRUCTURE.md](INFRASTRUCTURE.md).
