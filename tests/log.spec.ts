import { describe, it } from 'node:test';
import assert from 'node:assert';
import log, { formatDuration } from '../src/utils/log';

describe('log', () => {
  describe('formatDuration', () => {
    it('should return a human readable duration string', () => {
      assert.equal(formatDuration(1000000000), '11d 13h 46m 40s');
    });
  });
  describe('log', () => {
    it('should create a loader message that can be ended', (t) => {
      const loadingSuccessMock = t.mock.fn();
      t.mock.method(log, 'loading', () => ({
        succeed: loadingSuccessMock,
      }));
      const loader = log.loading('foo');
      loader.succeed();
      assert.strictEqual(loadingSuccessMock.mock.calls.length, 1);
    });
    it('should have info, error, warn, and line methods', (t) => {
      const infoMock = t.mock.fn();
      const errorMock = t.mock.fn();
      const warnMock = t.mock.fn();
      const lineMock = t.mock.fn();
      t.mock.method(log, 'info', infoMock);
      t.mock.method(log, 'error', errorMock);
      t.mock.method(log, 'warn', warnMock);
      t.mock.method(log, 'line', lineMock);
      log.info('info');
      log.error('error');
      log.warn('warn');
      log.line();
      assert.strictEqual(infoMock.mock.calls.length, 1);
      assert.strictEqual(errorMock.mock.calls.length, 1);
      assert.strictEqual(warnMock.mock.calls.length, 1);
      assert.strictEqual(lineMock.mock.calls.length, 1);
    });
  });
});
