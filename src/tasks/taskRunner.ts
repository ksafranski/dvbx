import log from '../utils/log';

/**
 * Substitutes variabls in a task command from passed in CLI
 * arguments via `--foo=bar` to replace `{{foo}}` in the task
 * @param command the task command
 * @param variables the list of variables passed
 * @returns a string with the variables replaced
 */
const substituteVariables = (
  command: string,
  variables: Record<string, string>,
): string => {
  let result = command;
  Object.entries(variables).forEach(([key, value]) => {
    const placeholder = `{{${key}}}`;
    result = result.replace(new RegExp(placeholder, 'g'), value);
  });
  return result;
};

/**
 * Runs a task by name from a list of tasks
 * @param tasks the list of tasks
 * @param taskName the name of the task to run
 * @param variables the list of variables to pass to the task
 * @returns a list of commands to run
 */
export const runTasks = (
  tasks: Record<string, string> | undefined,
  taskName: string,
  variables: Record<string, string>,
): string[] => {
  if (!tasks) {
    log.error('No tasks found in config file.');
    process.exit(1);
  }
  const task = tasks[taskName];
  if (!task) {
    throw new Error(`Task "${taskName}" not found.`);
  }

  const commands = task
    .split('\n')
    .map((cmd) => substituteVariables(cmd.trim(), variables))
    .filter((cmd) => cmd.length > 0);
  return commands;
};
