import * as fs from 'fs';
import log from './log';
import { execAsync } from './childProcesses';
import path from 'path';

/**
 * Gets the last modified time of the Dockerfile
 * @param filePath string path to the Dockerfile
 * @returns Date object representing the last modified time
 */
const getDockerfileModifiedTime = (filePath: string): Date => {
  const stats = fs.statSync(filePath);
  return new Date(stats.mtime.toString().trim());
};

/**
 * Checks if the Docker image should be rebuilt based on the Dockerfile's last modified time
 * @param dockerfilePath path to the Dockerfile
 * @param imageName name of the Docker image
 * @returns boolean indicating if the image should be rebuilt
 */
const shouldRebuildImage = async (
  dockerfilePath: string,
  imageName: string,
): Promise<boolean> => {
  const dockerfileModifiedTime = getDockerfileModifiedTime(
    `${dockerfilePath}/Dockerfile`,
  );

  try {
    const imageInspectCommand = `docker inspect --format='{{.Created}}' ${imageName}`;
    const imageCreatedTimeStr = (await execAsync(imageInspectCommand)).stdout;

    if (!imageCreatedTimeStr) {
      return true;
    }

    const imageCreatedTime = new Date(imageCreatedTimeStr.toString().trim());

    // Check if the Dockerfile was modified after the image was created
    if (dockerfileModifiedTime > imageCreatedTime) {
      return true;
    }
    return false;
  } catch (error: any) {
    return true; // Rebuild on error
  }
};

/**
 * Checks if the image exists locally
 * @param imageName name of the image
 * @returns boolean if the image exists
 */
export const imageExistsLocally = async (
  imageName: string,
): Promise<boolean> => {
  try {
    await execAsync(`docker image inspect ${imageName}`);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Builds the Dockerfile and returns the image name
 * @param dockerfile the path to the Dockerfile
 * @param name the name of the image
 * @returns name of the image
 */
export const buildDockerfile = async (
  dockerfile_path: string,
  name: string,
): Promise<string> => {
  const imageName = `${name}:latest`; // Ensure the tag is included

  // Check if the image needs to be rebuilt
  if (await shouldRebuildImage(dockerfile_path, imageName)) {
    const loader = log.loading(`Building image ${imageName}`);
    await execAsync(
      `docker build -t ${imageName} -f ${path.resolve(
        process.cwd(),
        dockerfile_path,
      )}/Dockerfile .`,
      {
        cwd: dockerfile_path,
      },
    );
    loader.succeed(`Image ${imageName} built`);
  }

  return imageName;
};
