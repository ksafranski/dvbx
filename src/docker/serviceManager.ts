import { execAsync, spawnAsync } from '../utils/childProcesses';
import { PrimaryConfig } from '../config/parser';
import {
  buildDockerServiceCommands,
  buildPrimaryDockerCommand,
} from '../docker/commandBuilder';
import log, { formatDuration } from '../utils/log';

const commonErrorsTranslator = (error: string): string => {
  console.log('Error:', error);
  if (error.includes('Conflict. The container name')) {
    return 'Container already exists';
  }
  if (error.includes('No such image')) {
    return 'Image not found';
  }
  if (error.includes('Unable to find image')) {
    return 'Image not found';
  }
  if (error.includes('Port is already allocated')) {
    return 'Port is already allocated';
  }
  if (error.includes('does not match the detected host platform')) {
    return 'Image does not match the detected host platform';
  }

  return 'Check the logs for more information';
};

/**
 * Starts all services defined in the configuration
 * @param config configuration object
 * @returns links to the service containers
 */
export const startServices = async (
  config: PrimaryConfig,
): Promise<string[]> => {
  const { commands, links } = await buildDockerServiceCommands(config);

  const loader = log.loading(
    `Starting services:\n  ${commands.map((c) => c.name).join(', ')}`,
  );

  const promises = commands.map(async (command): Promise<void> => {
    try {
      const svr = await execAsync(command.exec);
      if (svr.stderr) {
        if (svr.stderr.startsWith('Unable to find image')) {
          return; // Ignore this error: will pull on start
        }
        loader.fail(
          `Error starting service ${command.name}: ${commonErrorsTranslator(
            svr.stderr,
          )}`,
        );
        process.exit(1);
      }
    } catch (error) {
      loader.fail(`Error starting service ${command.name}: ${error}`);
    }
  });

  try {
    await Promise.all(promises);
    loader.succeed(
      `Services started:\n  ${commands.map((c) => c.name).join(', ')}`,
    );
  } catch {
    await stopAndRemoveServices();
    process.exit(1);
  }

  return links;
};

/**
 * Starts the primary container
 * @param config configuration object
 * @param links links to the service containers
 * @param taskCommands list of commands to run in the container
 * @returns container name
 */
export const startPrimaryContainer = async (
  config: PrimaryConfig,
  links: string[],
  taskCommands: string[],
): Promise<string> => {
  const command = await buildPrimaryDockerCommand(config, links);

  // Run the command in the primary container
  log.line();

  const beforeCommand = config.before ? `${config.before} && ` : '';
  const afterCommand = config.after ? ` && ${config.after}` : '';
  const fullCommand = `${beforeCommand}${taskCommands.join(
    ' && ',
  )}${afterCommand}`;

  const start = Date.now();
  const id = (await execAsync(command)).stdout.trim();
  const code = await spawnAsync(`docker exec -it ${id} sh -c "${fullCommand}"`);
  try {
    log.line();
    log.info(`Execution time: ${formatDuration(Date.now() - start)}`);
    await stopAndRemoveServices();
    process.exit(code || 0);
  } catch (error: any) {
    log.line();
    log.error(`Error executing the command`);
    process.exit(1);
  }
};

/**
 * Stops and removes all services
 */
export const stopAndRemoveServices = async (): Promise<void> => {
  const loader = log.loading('Cleaning up services');
  try {
    await execAsync('docker stop $(docker ps -a -q)');
    await execAsync('docker rm $(docker ps -a -q)');
  } catch (e) {
    console.log('Error stopping and removing services', e);
  }

  loader.succeed('Services cleaned up');
};
