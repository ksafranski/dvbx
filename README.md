# DVBX

A utility for improving developer experience by containerizing development environments.

## Goal and Purpose

While docker-compose is a wonderful tool, it has some drawbacks given it's aim is
to be a general purpose tool. DVBX aims to provide a more simplistic approach to
containerizing development environments.

### Task-Base Execution

DVBX is designed to be task-based. This means that you can define tasks in a configuration
to run commands in the primary container with all required services and dependencies.

An example of a simple configuration for a database and server setup could be:

```yaml
# dvbx.yml
name: rest-api
image: node:latest
services:
  - pgdb:
      image: postgres:latest
      ports:
        - 5432:5432
      environment:
        - POSTGRES_USER=user
        - POSTGRES_PASSWORD=password
        - POSTGRES_DB=db
ports:
  - 3000:3000
tasks:
  install: yarn
  start: ts-node ./src/index.ts --port={{port}}
  test: jest ./tests/*.spec.ts
```

This configuration would create a container with a postgres database and a node server.
It would mount to the current directory which contains the above configuration file. The
`tasks` can then run the commands specified in the configuration file.

```bash
dvbx install
dvbx start --port=3000
dvbx test
```

Additionally tasks support variables which can be passed in from the command line as
shown in the `start` task above.

### Ephemerality

DVBX is designed to be ephemeral. This means that the containers are designed to be
disposable and not to be persisted by default. This is to ensure that the environment
is always clean and consistent, similar to running Continuous Integration, but locally
and across all development tasks.

### Extensibility

The configuration format is designed to be extensible. This means that you can define
multiple configurations for different components, services, and specifications.

### Compatibility

While DVBX is not a perfect 1:1 replacement for docker-compose, it is designed to be
compatible with the majority of the configuration format.

---

## Commands

The default usage of DVBX is to run tasks defined in the configuration file. The tasks can be run by using the `dvbx` command followed by the task name.

```bash
dvbx <task-name>
```

If the task requires (or support) additional arguments, they can be passed in as additional arguments to the command.

```bash
dvbx <task-name> --arg=val ...
```

The following built-in commands are also available:

```bash
version, -v                      Display the version of DVBX
help, -h                         Display this help message
shell [--name=service-name]      Open shell in container (defaults to primary)
attach [--name=service-name]     Attach to container (defaults to primary)
ps                               List all running DVBX containers
stop                             Stop and remove all running DVBX containers
```

---

## Configuration

The `dvbx.yml` configuration file is the primary configuration file for DVBX. It allows for
defining the services, tasks, and environment for the development environment.

#### `name: string`

Defines the name of the project. This is used for creating the container name.

#### `image: string`

Defines the base image for the container. This is the image that will be used to create the container.

#### `build: string`

Defines the path to the Dockerfile to use for building the container. This is an alternative to using the `image` field. Dockerfile paths are relative to the configuration file, and will be checked each run and rebuild the container if the Dockerfile has changed.

#### `extends: string`

Defines the path to another configuration file to extend. This allows for splitting configurations into multiple files.

#### `services: object`

Defines the services that are required for the development environment. This is a map of service names to service configurations, using the same format as the top-level configuration with the exception of the `name`, `workdir` and `tasks` properties.

#### `tasks: object`

Defines the tasks that can be run in the container. This is a map of task names to task configurations.

#### `before: string`

Allows for specifying a command to run before any other tasks are run.

#### `after: string`

Allows for specifying a command to run after all other tasks are run.

#### `workdir: string`

Allows for specifying the working directory for the container. This is the directory that the container will start in and the local volume will be mounted to.

#### `volumes: array`

Defines the volumes that should be mounted to the container. This is an array of volume configurations with the format `/host-path:/container-path`.

#### `ports: array`

Defines the ports that should be exposed by the container. This is an array of port configurations in format `0000:0000`.

#### `environment: array`

Defines the environment variables that should be set in the container. This is an array of environment variable configurations in format `KEY=VALUE`. This can also include vairables from the host environment by using `KEY=$HOST`

#### `network: string`

Allows for specifying a network to connect the container to, which will be created if it doesn't exist already when the container is started.

#### `hostname: string`

Allows for specifying the hostname for the container.

#### `privileged: boolean`

Allows for running the container in privileged mode.

#### `platform: string`

Allows for specifying the platform for the container.

#### `restart: string`

Allows for specifying the restart policy for the container. Can be one of `no`, `always`, `on-failure`, `unless-stopped`. The `on-failure` policy can also include a maximum number of restarts in the format `on-failure:5`.

#### `user: string`

Allows for specifying the user to run the container as.

#### `shell`

Allows for specifying the shell to use when running `dvbx shell`. This defaults to `/bin/sh`.

---

## Development

_Note: tests are implemented using the `node:test` module. To support coverage your local node version should be 21+_

This project uses `yarn` for package management. To get started, run `yarn` to install dependencies.

There are a few scripts available for development:

- `test` - Run the full test suite
- `test:watch` - Run the test suite in watch mode
- `test:coverage` - Run the test suite with coverage
- `build` - Build the project

To run the project for testing the CLI functionality the best approach is to alias the script:

```bash
alias dvbx="ts-node $(pwd)/src/index.ts"
```

This will allow you to run the CLI via the `dvbx` command.
