import {
  exec as execCb,
  spawn,
  ExecOptions,
  SpawnOptions,
} from 'node:child_process';
import { cwd } from 'node:process';
import { promisify } from 'util';

const execPromise = promisify(execCb);

/**
 * Runs an exec command asynchronously
 * @param command command to execute
 * @param options default exec options
 * @returns stdout and stderr
 */
export const execAsync = async (
  command: string,
  options?: ExecOptions,
): Promise<{ stdout: string; stderr: string }> =>
  new Promise(async (resolve, reject) => {
    try {
      const { stdout, stderr } = await execPromise(command, options || {});
      resolve({
        stdout: stdout.toString() as string,
        stderr: stderr.toString() as string,
      });
    } catch (error) {
      reject(error);
    }
  });

export const spawnAsync = async (
  command: string,
  args?: ReadonlyArray<string>,
  options?: SpawnOptions,
): Promise<number> => {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args || [], {
      ...options,
      stdio: 'inherit', // This makes the process output to the console and interactive
      shell: true,
    });

    child.on('close', (code) => {
      resolve(code || 0);
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
};
