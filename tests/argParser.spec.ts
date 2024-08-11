import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseArgs } from '../src/utils/argParser';

describe('argParser', () => {
  describe('parseArgs', () => {
    it('should parse arguments correctly', () => {
      const args = ['task', '--key=value', '--key2=value2'];
      const parsed = parseArgs(args);

      assert.deepEqual(parsed, {
        taskName: 'task',
        variables: { key: 'value', key2: 'value2' },
      });
    });

    it('should parse arguments correctly with no variables', () => {
      const args = ['task'];
      const parsed = parseArgs(args);

      assert.deepEqual(parsed, { taskName: 'task', variables: {} });
    });
  });
});
