# How to manage the infrastructure?

Architectural vision-wise, we are dealing with a microservices based system here. As such, generating a new service is as simple as running `yarn create-app` and following the prompts. However, this is only the first step. You will need to create a Pulumi definition for your service as well. This needs to be created in the `@cowprotocol/infrastructure` repository.

If you are working on this as a third party, you can still rely on docker compose as opposed to Pulumi. `docker-compose.yml` file serves this purpose, to allow anyone to be able to run the services.

## What do I need to know?

Initially you must contact devops teams to get access to our infrastructure. Once you have access, you will need to install the following tools;

- [Pulumi](https://www.pulumi.com/docs/get-started/install/)
- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html)
- [Docker](https://docs.docker.com/get-docker/)
  - Please do note that you need to be able to call `buildx` command. If you are using Docker Desktop, you most likely have this already. If you are using alternative projects, please refer to their docs.

Once you have verified that you have the necessary access, and the tools installed, you can proceed to the next section.

## Important commands / concepts

First, you must login to pulumi using `pulumi login` command. This will prompt you to login to pulumi. Once you have logged in, you can proceed to the next step.

Pulumi runs on a stack based system. Stacks in this case can be seen as environments. For example, we have a `dev` stack, a `staging` stack, and a `prod` stack. By default your device won't have any stacks even though on remote you will have stacks defined. As such, you will need to create stacks matching what we have on remote.

A stack is named in the following format: `@organisation/stack`. So for the purposes of this application you will need;

- `@cowprotocol/dev`
- `@cowprotocol/staging`
- `@cowprotocol/prod`

You can create these stacks by running the following command;

```bash
pulumi stack init @cowprotocol/dev
pulumi stack init @cowprotocol/staging
pulumi stack init @cowprotocol/prod
```

You can also use `pulumi stack ls` to list the stacks you have on your device, and `pulumi stack select` to select a stack to work on. `pulumi stack select` will also give you the option to create a stack in an interactive manner.

Pulumi works with previews and updates. A preview is a dry run of what will happen when you run an update. You can run `pulumi preview` to see what will happen when you run `pulumi up`. You should verify your updates on preview before running `pulumi up`. Once you have selected a stack, you can run `pulumi preview` to see what will happen when you run `pulumi up`, and `pulumi up` to apply the changes.

## How to create a new service?

You want to copy an existing service and modify it to your needs. You can do this by copying an existing service folder, and modifying the `index.ts` file, as well as corresponding `yml` files. You can also create a new service from scratch, but this is not recommended as microservices are meant to be as similar as possible. TWAP service is a good example to copy from.

You want to edit;

- `index.ts` file to modify
  - imports (add/remove)
  - environment variables
  - service name
- package.json to modify
  - name
  - description
- `Pulumi.yml` to modify
  - name for the service
- root level package.json to add your folder to the workspace
- `.yml` files with the following format `Pulumi.{stack}.yml` to modify
  - update name space
    - all variables here are defined as `name:variable` format (i.e. `twap:dbHost`). You want to update the `twap` part to your service name.
  - add or remove variables as your service needs

Once you have a decent version, you want to open a PR to infrastructure to start the review process. You should also add your service to `docker-compose.yml` with corresponding changes, to ensure we can still run it on a local environment.

Every service must talk to the outside world through BFF. So you want to go to the BFF project here and add _at least_ a pass through proxy (examples can be found under `apps/bff/src/app/routes/twap`). Because of this, your Pulumi definition does not need an ingress. However, you will need to add a new environment variable to reference your service from BFF (i.e. `http://{service-name}.{namespace}.svc.cluster.local`).

## How to read logs?

You should get kubernetes access from devops team. Once you do, you can use a tool like [k9s](https://k9scli.io/) to read logs. You can also use `kubectl` directly, but it is not recommended.

All logs are also sent to Elastic Search, and you can read them. However, you will need to get access to Elastic Search from devops team.
