import { describe, it } from 'node:test';
import assert from 'node:assert';
import { deepMerge } from '../src/utils/deepMerge';

describe('deepMerge', () => {
  it('should merge two objects', () => {
    const target = { a: 1, b: 2, arr: [1, 2, 3] };
    const source = { b: 3, c: 4, arr: [3, 4, 5] };
    const result = deepMerge(target, source);
    assert.deepStrictEqual(result, { a: 1, b: 3, c: 4, arr: [1, 2, 3, 4, 5] });
  });
});
