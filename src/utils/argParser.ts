interface ParsedArgs {
  taskName: string;
  variables: Record<string, string>;
}

/**
 * Parses CLI arguments into a task name and variables
 * @param args list of CLI arguments
 * @returns task name and variables to replace
 */
export const parseArgs = (args: string[]): ParsedArgs => {
  const taskName = args[0];
  const variables: Record<string, string> = {};

  args.slice(1).forEach((arg) => {
    const [key, value] = arg.split('=');
    if (key && value) {
      variables[key.replace(/^--/, '')] = value;
    }
  });

  return { taskName, variables };
};
