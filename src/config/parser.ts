import fs from 'node:fs';
import * as yaml from 'js-yaml';
import { deepMerge } from '../utils/deepMerge';
import log from '../utils/log';

export interface PrimaryConfig extends ServiceConfig {
  name: string;
  workdir?: string;
  tasks: Record<string, string>;
  before?: string;
  after?: string;
  services?: Record<string, ServiceConfig>[];
}

export interface ServiceConfig {
  workdir?: any;
  image?: string;
  platform?: string;
  networks?: string[];
  network?: string;
  restart?: string;
  build?: string;
  environment?: string[];
  ports?: string[];
  volumes?: string[];
  user?: string;
  hosts?: string[];
  hostname?: string;
  privileged?: boolean;
  extends?: string;
  shell?: string;
}

/**
 * Reads a config file from a given path
 * @param filePath path to the config file
 * @returns config file content
 */
export const readConfigFile = (filePath: string): any => {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    log.error(`Error reading config file: ${error}`);
    process.exit(1);
  }
};

/**
 * Loads a config file from a given path
 * @param filePath path to the config file
 * @returns config object
 */
export const parseConfig = (filePath: string): PrimaryConfig => {
  const fileContent = readConfigFile(filePath);
  let config = yaml.load(fileContent) as PrimaryConfig;

  if (!config) {
    log.error(
      'Error parsing configuration file, do you have a valid dvbx.yml?',
    );
    process.exit(1);
  }

  // Check primary config for extend config
  if (config?.extends) {
    const extendsFileContent = readConfigFile(config.extends);
    const extendsConfig = yaml.load(extendsFileContent) as PrimaryConfig;
    delete config.extends;
    config = deepMerge(config, extendsConfig);
  }

  // Check services for extend configs
  if (config?.services) {
    config.services.forEach((service, idx) => {
      const serviceName = Object.keys(service)[0];
      const serviceConfig = service[serviceName];
      if (serviceConfig.extends) {
        const extendsFileContent = readConfigFile(serviceConfig.extends);
        const extendsConfig = yaml.load(extendsFileContent) as ServiceConfig;
        delete serviceConfig.extends;
        if (config.services) {
          config.services[idx][serviceName] = deepMerge(
            extendsConfig,
            serviceConfig,
          );
        }
      }
    });

    // Merge shell command
    config.tasks = {
      ...config?.tasks,
      ...{ shell: config.shell || '/bin/sh' },
    };
  }

  return config;
};
