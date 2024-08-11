import { describe, it } from 'node:test';
import assert from 'node:assert';

import log from '../src/utils/log';
import process from 'node:process';
import { execAsync } from '../src/utils/childProcesses';

import {
  buildEnvVars,
  buildExposePorts,
  buildVolumes,
  buildHosts,
  buildHostname,
  buildLinks,
  buildPlatformFlag,
  buildNetworkFlag,
  buildRestartFlag,
  buildPrivelegedFlag,
  buildContainerName,
  buildArgsString,
  pullDockerImage,
  buildNetworks,
  buildDockerServiceCommands,
  buildPrimaryDockerCommand,
} from '../src/docker/commandBuilder';
import { PrimaryConfig, ServiceConfig } from '../src/config/parser';

describe('commandBuilder', () => {
  describe('buildEnvVars', () => {
    it('should return empty string when no env vars', () => {
      assert.strictEqual(buildEnvVars(), '');
    });

    it('should return env vars string', () => {
      assert.strictEqual(
        buildEnvVars(['VAR1=VALUE1', 'VAR2=VALUE2']),
        '-e VAR1=VALUE1 -e VAR2=VALUE2',
      );
    });
  });
  describe('buildExposePorts', () => {
    it('should return empty string when no ports', () => {
      assert.strictEqual(buildExposePorts(), '');
    });

    it('should return ports string', () => {
      assert.strictEqual(
        buildExposePorts(['80:80', '443:443']),
        '-p 80:80 -p 443:443',
      );
    });
  });
  describe('buildVolumes', () => {
    it('should return empty string when no volumes', () => {
      assert.strictEqual(buildVolumes(), '');
    });

    it('should return volumes string', () => {
      assert.strictEqual(
        buildVolumes(['/host:/container', '/host2:/container2']),
        '-v /host:/container -v /host2:/container2',
      );
    });
  });
  describe('buildHosts', () => {
    it('should return empty string when no hosts', () => {
      assert.strictEqual(buildHosts(), '');
    });

    it('should return hosts string', () => {
      assert.strictEqual(
        buildHosts(['host1', 'host2']),
        '--add-host=host1 --add-host=host2',
      );
    });
  });
  describe('buildHostname', () => {
    it('should return empty string when no hostname', () => {
      assert.strictEqual(buildHostname(), '');
    });

    it('should return hostname string', () => {
      assert.strictEqual(buildHostname('hostname'), '--hostname hostname');
    });
  });
  describe('buildLinks', () => {
    it('should return empty string when no links', () => {
      assert.strictEqual(buildLinks([]), '');
    });

    it('should return links string', () => {
      assert.strictEqual(
        buildLinks(['container1:alias1', 'container2:alias2']),
        '--link container1:alias1 --link container2:alias2',
      );
    });
  });
  describe('buildPlatformFlag', () => {
    it('should return empty string when no platform', () => {
      assert.strictEqual(buildPlatformFlag(), '');
    });

    it('should return platform string', () => {
      assert.strictEqual(
        buildPlatformFlag('linux/amd64'),
        '--platform linux/amd64',
      );
    });
  });
  describe('buildNetworkFlag', () => {
    it('should return empty string when no network', () => {
      assert.strictEqual(buildNetworkFlag(), '');
    });

    it('should return network string', () => {
      assert.strictEqual(buildNetworkFlag('network'), '--network network');
    });
  });
  describe('buildRestartFlag', () => {
    it('should return empty string when no restart policy', () => {
      assert.strictEqual(buildRestartFlag(), '');
    });

    it('should return restart policy string', () => {
      assert.strictEqual(buildRestartFlag('always'), '--restart always');
    });

    it('should log a warning if invalid retryCount', (t) => {
      const logWarnMock = t.mock.method(log, 'warn', () => null);
      buildRestartFlag('on-failure:n');
      assert.strictEqual(logWarnMock.mock.calls.length, 1);
    });
  });
  describe('buildPrivelegedFlag', () => {
    it('should return empty string when not privileged', () => {
      assert.strictEqual(buildPrivelegedFlag(), '');
    });

    it('should return privileged flag', () => {
      assert.strictEqual(buildPrivelegedFlag(true), '--privileged');
    });
  });
  describe('buildContainerName', () => {
    it('should return container name string', () => {
      assert.strictEqual(buildContainerName('container'), 'dvbx_container');
    });
  });
  describe('buildArgsString', () => {
    it('should return args string', () => {
      assert.strictEqual(
        buildArgsString(
          { environment: ['VAR1=VALUE1', 'VAR2=VALUE2'] },
          'container',
        ),
        '-e VAR1=VALUE1 -e VAR2=VALUE2 --name dvbx_container',
      );
    });
  });
  describe('buildNetworks', () => {
    it('should call docker network create', async (t) => {
      await buildNetworks(['test-network']);
      const { stdout } = await execAsync('docker network ls');
      assert.ok(stdout.includes('test-network'));
      await execAsync('docker network rm test-network');
    });
  });
  describe('pullDockerImage', () => {
    it('should pull docker image', async (t) => {
      const successMock = t.mock.fn();
      t.mock.method(log, 'loading', () => ({
        succeed: successMock,
      }));
      await pullDockerImage('hello-world');
      const { stdout } = await execAsync('docker images -q hello-world');
      assert.ok(stdout.length > 1);
      assert.strictEqual(successMock.mock.calls.length, 1);
      await execAsync('docker rmi hello-world');
    });
    it('should log error if pull fails', async (t) => {
      const processExitMock = t.mock.method(process, 'exit', () => null);
      const failMock = t.mock.fn();
      t.mock.method(log, 'loading', () => ({
        fail: failMock,
      }));
      await pullDockerImage('ploopploop');
      assert.strictEqual(processExitMock.mock.calls.length, 1);
      assert.strictEqual(failMock.mock.calls.length, 1);
    });
  });
  describe('buildDockerServiceCommands', () => {
    it('should return commands and links for starting service containers', async (t) => {
      const config: PrimaryConfig = {
        name: 'test',
        services: [
          {
            serviceContainer: {
              image: 'hello-world',
            },
          },
        ],
      };
      const { commands, links } = await buildDockerServiceCommands(config);
      assert.strictEqual(commands.length, 1);
      assert.strictEqual(links.length, 1);
      try {
        await execAsync('docker rmi hello-world');
      } catch {}
    });
  });
  describe('buildPrimaryDockerCommand', () => {
    it('should return primary docker command', async (t) => {
      const config: PrimaryConfig = {
        name: 'test',
        services: [
          {
            serviceContainer: {
              image: 'hello-world',
            },
          },
        ],
      };
      const command = await buildPrimaryDockerCommand(config, [], 'echo hello');
      assert.ok(command.includes('docker run'));
      try {
        await execAsync('docker rmi hello-world');
      } catch {}
    });
  });
});
