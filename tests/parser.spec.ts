import assert from 'node:assert';
import { describe, it } from 'node:test';
import fs from 'node:fs';
import process from 'node:process';
import { parseConfig } from '../src/config/parser';
import log from '../src/utils/log';

const mockPrimaryConfig = `
name: primary
extends: ./extends
environment:
  - FIZZ=buzz
services:
  - foo:
      extends: ./extends
      environment:
        - FOO=bar
`;

const mockExtendsConfig = `
environment:
  - QUZ=baz
`;

const mockFSReadFn = (mockFile: string) => {
  switch (mockFile) {
    case './primary':
      return mockPrimaryConfig;
    case './extends':
      return mockExtendsConfig;
    default:
      throw new Error(`File not found ${mockFile}`);
  }
};

describe('parser', () => {
  it('should throw an error if the config file does not exist', (t) => {
    t.mock.method(fs, 'readFileSync', mockFSReadFn);
    const logErrorMock = t.mock.method(log, 'error', () => null);
    const processExitMock = t.mock.method(process, 'exit', () => null);
    parseConfig('dne');
    assert.strictEqual(logErrorMock.mock.calls.length, 1);
    assert.strictEqual(processExitMock.mock.calls.length, 1);
  });
  it('should return valid config with extends', (t) => {
    t.mock.method(fs, 'readFileSync', mockFSReadFn);
    const config = parseConfig('./primary');
    // Name should be primary
    assert.strictEqual(config.name, 'primary');
    // Should have extended, then removed extends property
    assert.strictEqual(config.extends, undefined);
    // Should have merged environment variables in primary
    assert.deepEqual(config.environment, ['FIZZ=buzz', 'QUZ=baz']);
    // Should have merged environment variables in services
    assert.deepEqual(
      config && config.services && config?.services[0].foo.environment,
      ['QUZ=baz', 'FOO=bar'],
    );
  });
});
