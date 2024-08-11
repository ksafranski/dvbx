import log from './log';

/**
 * Checks if the given item is an object
 * @param item object to check
 * @returns boolean indicating if the item is an object
 */
const isObject = (item: any): item is Record<string, any> => {
  return item && typeof item === 'object' && !Array.isArray(item);
};

/**
 * Merges two arrays and removes duplicates
 * @param targetArray array to merge into
 * @param sourceArray array to merge from
 * @returns array with unique values from both arrays
 */
const mergeArrays = (
  targetArray: any[] = [],
  sourceArray: any[] = [],
): any[] => {
  const combinedArray = [...targetArray, ...sourceArray];
  return Array.from(new Set(combinedArray));
};

/**
 * Deep merges two objects including nested objects and arrays
 * @param target object to merge into
 * @param source object to merge from
 * @returns Resulting merged object
 */
export const deepMerge = (target: any, source: any): any => {
  try {
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        const targetValue = target[key];
        const sourceValue = source[key];

        if (isObject(sourceValue)) {
          if (!isObject(targetValue)) {
            target[key] = {} as any; // Initialize target as an empty object if not already an object
          }

          // Recursively merge nested objects
          target[key] = deepMerge(target[key], sourceValue);
        } else if (Array.isArray(sourceValue)) {
          if (!Array.isArray(targetValue)) {
            target[key] = [] as any; // Initialize target as an empty array if not already an array
          }

          // Merge arrays and remove duplicates
          target[key] = mergeArrays(targetValue as any[], sourceValue) as any;
        } else {
          // Assign non-object and non-array values from source to target
          target[key] = sourceValue;
        }
      }
    }
    return target;
  } catch (error) {
    log.error(`Error parsing config, please ensure proper format`);
    process.exit(1);
  }
};
