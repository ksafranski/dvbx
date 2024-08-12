#!/usr/bin/env node
import path from 'path';
import fs from 'fs'; // Add this line
import { parseConfig, PrimaryConfig } from './config/parser';
import { validatePrimaryConfig } from './config/validator';
import {
  startServices,
  startPrimaryContainer,
  stopAndRemoveServices,
} from './docker/serviceManager';
import { runTasks } from './tasks/taskRunner';
import { parseArgs } from './utils/argParser';
import { execAsync, spawnAsync } from './utils/childProcesses';
import log from './utils/log';
import { get } from 'http';

const getVersion = (): string => {
  const pkg = fs.readFileSync(
    path.resolve(__dirname, '../package.json'),
    'utf8',
  );
  return JSON.parse(pkg).version;
};

const cleanup = async () => {
  try {
    await stopAndRemoveServices();
    process.exit();
  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  }
};

const main = async () => {
  const args = process.argv.slice(2);
  const { taskName, variables } = parseArgs(args);

  const configPath = path.resolve(process.cwd(), 'dvbx.yml');
  const config = parseConfig(configPath);

  if (taskName === 'version' || taskName === '-v') {
    console.log(getVersion());
    process.exit();
  }

  if (taskName === 'attach') {
    const containerId = (
      await execAsync(
        `docker ps -aqf "name=dvbx_${variables.name || config.name}"`,
      )
    ).stdout.trim();
    if (containerId.length === 0) {
      log.error('Container not running');
      process.exit(0);
    }
    await spawnAsync(`docker attach ${containerId}`);
    return;
  }

  if (taskName === 'shell') {
    const containerId = (
      await execAsync(
        `docker ps -aqf "name=dvbx_${variables.name || config.name}"`,
      )
    ).stdout.trim();
    if (containerId.length === 0) {
      // Not running, start the full dvbx run in shell
      await start(config, 'shell', variables, true);
    } else {
      // Already running, exec into the container
      const code = await spawnAsync(
        `docker exec -it ${containerId} sh -c "${config.shell || '/bin/sh'}"`,
      );
      process.exit(code);
    }
    return;
  }

  if (taskName === 'ps') {
    const containers = (await execAsync('docker ps -a --filter "name=dvbx_"'))
      .stdout;
    console.log(containers);
    process.exit(0);
  }

  if (taskName === 'stop') {
    await cleanup();
  }

  if (taskName === 'help' || taskName === '-h') {
    console.log(`
DVBX [DeVBoX] v${getVersion()}\n
\n-------------------------\n
Usage: dvbx [command] [variables]
\n-------------------------\n
COMMANDS:\n
  version, -v                      Display the version of DVBX
  help, -h                         Display this help message
  shell [--name=service-name]      Open shell in container (defaults to primary)
  attach [--name=service-name]     Attach to container (defaults to primary)
  ps                               List all running DVBX containers
  stop                             Stop and remove all running DVBX containers
\n--------------------------\n 
AVAILABLE TASKS:\n
  ${Object.keys(config.tasks || {}).join('\n  ')}
`);
    process.exit(0);
  }

  start(config, taskName, variables);
};

const start = async (
  config: PrimaryConfig,
  taskName: string,
  variables: Record<string, any>,
  isShell = false,
) => {
  if (validatePrimaryConfig(config)) {
    const links = await startServices(config);

    const taskCommands = runTasks(config.tasks, taskName, variables);
    await startPrimaryContainer(config, links, taskCommands);

    if (!isShell) {
      process.on('exit', cleanup);
      process.on('SIGINT', () => {
        cleanup();
        process.exit();
      });
      process.on('SIGTERM', () => {
        cleanup();
        process.exit();
      });
    }
  } else {
    console.error('Invalid configuration file.');
    process.exit(1);
  }
};

main();
