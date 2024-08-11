import chalk from 'chalk';
import ora from 'ora';

/**
 * Logger utility that wraps the `ora` spinner library
 * and provides a consistent interface for logging messages.
 */
export default {
  loading: (message: string): ora.Ora => {
    return ora(message).start();
  },
  info: (message: string): void => {
    ora(message).succeed();
  },
  error: (message: string): void => {
    ora(message).fail();
  },
  warn: (message: string): void => {
    ora(message).warn();
  },
  line: (): void => {
    console.log(chalk.gray('----------------------------------------'));
  },
};

/**
 * Formats a duration in milliseconds to a human-readable string
 * @param ms duration in milliseconds
 * @returns formatted duration string
 */
export const formatDuration = (ms: number): string => {
  const millisecondsInSecond = 1000;
  const millisecondsInMinute = millisecondsInSecond * 60;
  const millisecondsInHour = millisecondsInMinute * 60;
  const millisecondsInDay = millisecondsInHour * 24;

  // Calculate each unit from milliseconds
  const days = Math.floor(ms / millisecondsInDay);
  ms %= millisecondsInDay;
  const hours = Math.floor(ms / millisecondsInHour);
  ms %= millisecondsInHour;
  const minutes = Math.floor(ms / millisecondsInMinute);
  ms %= millisecondsInMinute;
  const seconds = Math.floor(ms / millisecondsInSecond);
  const milliseconds = ms % millisecondsInSecond;

  // Construct the formatted string
  let formattedDuration = '';

  if (days > 0) formattedDuration += `${days}d `;
  if (hours > 0) formattedDuration += `${hours}h `;
  if (minutes > 0) formattedDuration += `${minutes}m `;
  if (seconds > 0) formattedDuration += `${seconds}s `;
  if (milliseconds > 0) formattedDuration += `${milliseconds}ms`;

  // Trim any trailing space and return
  return formattedDuration.trim();
};
