import log from '../utils/log';
import { PrimaryConfig } from './parser';

/**
 * Validate the configuration object
 * @param config configuration object
 * @returns boolean indicating whether the configuration is valid
 */
export const validatePrimaryConfig = (config: PrimaryConfig): boolean => {
  const e = (msg: string): void => {
    log.error(msg);
    process.exit(1);
  };

  // Name is a required property on the root config
  !config.name && e("Configuration must have a 'name' property set");

  // Tasks is a required property on the root config
  (!config.tasks || Object.keys(config.tasks).length === 0) &&
    e('Configuration must have at least one task');

  // Must have a from to build images
  !config.image &&
    !config.build &&
    e("Configuration must have a 'image' or 'build' specified");

  if (config.services) {
    config.services.forEach((service) => {
      const serviceName = Object.keys(service)[0];
      const serviceConfig = service[serviceName];
      !serviceConfig.image &&
        !serviceConfig.build &&
        e(`Service ${serviceName} must have a 'image' or 'build' specified`);
    });
  }

  return true;
};
