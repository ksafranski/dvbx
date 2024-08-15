import { PrimaryConfig, ServiceConfig } from '../config/parser';
import log from '../utils/log';
import {
  buildDockerfile,
  imageExistsLocally,
} from '../utils/dockerfileBuilder';
import { execAsync } from '../utils/childProcesses';
import path from 'path';

/**
 * Builds environment variables string for docker command
 * @param env list of environment variables
 * @returns command for environment variables
 */
export const buildEnvVars = (env?: string[]): string => {
  return env ? env.map((e) => `-e ${e}`).join(' ') : '';
};

/**
 * Builds expose ports string for docker command
 * @param ports list of ports to expose
 * @returns command for exposing ports
 */
export const buildExposePorts = (ports?: string[]): string => {
  return ports ? ports.map((port) => `-p ${port}`).join(' ') : '';
};

/**
 * Builds volumes string for docker command
 * @param volumes list of volumes to mount
 * @returns command for mounting volumes
 */
export const buildVolumes = (volumes?: string[]): string => {
  return volumes ? volumes.map((volume) => `-v ${volume}`).join(' ') : '';
};

/**
 * Builds hosts string for docker command
 * @param hosts list of hosts to add
 * @returns command for adding hosts
 */
export const buildHosts = (hosts?: string[]): string => {
  return hosts ? hosts.map((host) => `--add-host=${host}`).join(' ') : '';
};

/**
 * Builds hostname string for docker command
 * @param hostname hostname to use
 * @returns command for setting hostname
 */
export const buildHostname = (hostname?: string): string => {
  return hostname ? `--hostname ${hostname}` : '';
};

/**
 * Builds links string for docker command
 * @param links list of links to add
 * @returns command for adding links
 */
export const buildLinks = (links: string[]): string => {
  return links.map((link) => `--link ${link}`).join(' ');
};

/**
 * Builds platform flag string for docker command
 * @param platform platform to run
 * @returns string for platform flag
 */
export const buildPlatformFlag = (platform?: string): string => {
  return platform ? `--platform ${platform}` : '';
};

/**
 * Builds network flag string for docker command
 * @param network network to use
 * @returns string for network flag
 */
export const buildNetworkFlag = (network?: string): string => {
  return network ? `--network=${network}` : '';
};

/**
 * Builds restart flag string for docker command
 * @param restart restart mode
 * @returns string for restart flag
 */
export const buildRestartFlag = (restart?: string, name?: string): string => {
  if (typeof restart === 'undefined') {
    return '';
  }

  // Define the valid restart policies
  const validPolicies = ['no', 'always', 'unless-stopped'];

  // Check if the restart is one of the valid policies
  if (validPolicies.includes(restart)) {
    return `--restart ${restart}`;
  }

  // Check if the restart is 'on-failure' with an optional retry count
  const onFailureRegex = /^on-failure(?::\d+)?$/;
  if (onFailureRegex.test(restart)) {
    // If there is a retry count, extract and validate it
    const retryCountMatch = restart.match(/on-failure:(\d+)/);
    if (retryCountMatch) {
      const retryCount = parseInt(retryCountMatch[1], 10);
      if (isNaN(retryCount) || retryCount < 0) {
        log.warn(
          `Invalid restart policy retry count '${retryCount}' for container '${name}'`,
        );
        return '';
      }
    }
    return `--restart ${restart}`;
  }

  // If none of the conditions are met, the restart is invalid
  log.warn(`Invalid restart policy '${restart}' for container '${name}'`);
  return '';
};

export const buildPrivelegedFlag = (privileged?: boolean): string => {
  return privileged ? '--privileged' : '';
};

/**
 * Builds container name string
 * @param name name of container
 * @returns fully formed container name
 */
export const buildContainerName = (name: string): string => {
  return `dvbx_${name}`;
};

/**
 * Compiles docker arguments string
 * @param config container configuration
 * @param name name of container
 * @returns fully formed docker arguments string
 */
export const buildArgsString = (
  config: Partial<ServiceConfig>,
  name: string,
) => {
  return `${buildEnvVars(config.environment)} ${buildExposePorts(
    config.ports,
  )} ${buildVolumes(config.volumes)} ${buildHosts(
    config.hosts,
  )} ${buildHostname(config.hostname)} ${buildPlatformFlag(
    config.platform,
  )} ${buildNetworkFlag(config.network)} ${buildRestartFlag(
    config.restart,
    name,
  )} ${buildPrivelegedFlag(config.privileged)} --name ${buildContainerName(
    name,
  )}`.replace(/ +(?= )/g, '');
};

/**
 * Builds docker networks
 * @param networks array of network names
 */
export const buildNetworks = async (networks?: string[]): Promise<void> => {
  await Promise.all(
    (networks || []).map(async (network) => {
      try {
        return await execAsync(`docker network create ${network}`);
      } catch (e) {
        log.error(`Error creating network '${network}'`);
      }
    }),
  );
};

/**
 * Pulls docker image if not using dockerfile config
 * @param imageName name of image to pull
 */
export const pullDockerImage = async (imageName: string): Promise<void> => {
  const loader = log.loading(`Pulling ${imageName}...`);
  try {
    await execAsync(`docker pull ${imageName}`);
    loader.succeed(`Pulled ${imageName}`);
  } catch (error) {
    loader.fail(`Error pulling image ${imageName}`);
    process.exit(1);
  }
};

/**
 * Builds docker commands for services
 * @param config docker configuration
 * @returns array of names and links of service containers
 */
export const buildDockerServiceCommands = async (
  config: ServiceConfig | PrimaryConfig,
): Promise<{ commands: { name: string; exec: string }[]; links: string[] }> => {
  const commands: { name: string; exec: string }[] = [];
  const links: string[] = [];

  if ('services' in config && config.services && config.services.length > 0) {
    await Promise.all(
      config.services.map(async (serviceConfig) => {
        const name = Object.keys(serviceConfig)[0];
        const service = serviceConfig[name];
        const argString = buildArgsString(service, name);

        let image = '';
        if (service.build) {
          image = await buildDockerfile(service.build, name);
        } else if (service.image) {
          image = service.image;
          if (!imageExistsLocally(image)) {
            await pullDockerImage(image);
          }
        }

        const exec = `docker run -d ${argString} ${image}`;

        const command = {
          name,
          exec,
        };
        commands.push(command);
        links.push(`dvbx_${name}`);
      }),
    );
  }

  return { commands, links };
};

/**
 * Builds primary docker command
 * @param config container configuration
 * @param links list of links to add
 * @param taskCommand specific task to run
 * @returns fully formed docker command
 */
export const buildPrimaryDockerCommand = async (
  config: PrimaryConfig,
  links: string[] = [],
): Promise<string> => {
  const projectName = config.name;
  const argString = buildArgsString(config, projectName);

  let image = config.image || '';
  if (config.build) {
    image = await buildDockerfile(
      config.build,
      buildContainerName(projectName),
    );
  } else if (image && !imageExistsLocally(image)) {
    await pullDockerImage(image);
  }

  await buildNetworks(config.networks);

  const workingDir = config.workdir ? config.workdir : '/dvbx';

  const workingVolumeMount = `-v ${process.cwd()}:${workingDir} -w ${workingDir}`;

  const runCmd = `docker run -d ${workingVolumeMount} ${argString} ${buildLinks(
    links,
  )} ${image} tail -f /dev/null`;

  return runCmd;
};
