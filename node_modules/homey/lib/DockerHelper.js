/**
 * Docker helper util
 *
 * This module is created to separate the Docker logic from business logic.
 */

'use strict';

const os = require('os');
const dgram = require('dgram');

const Docker = require('dockerode');
const inquirer = require('inquirer');

const Log = require('./Log');
const Settings = require('../services/Settings');

class DockerHelper {
  static #dockerInstanceCache = null;

  /**
   * Ensure there is a Docker instance
   *
   * @throws Error when docker is not reachable
   * @returns {Promise<Docker>} A docker instance
   */
  static async ensureDocker({ dockerSocketPath } = {}) {
    const dockerOptions = {};
    if (dockerSocketPath) {
      dockerOptions.socketPath = dockerSocketPath;
    }
    const docker = DockerHelper.#dockerInstanceCache || new Docker(dockerOptions);
    DockerHelper.#dockerInstanceCache = docker;

    await docker.ping().catch((err) => {
      Log.info(err.message);
      let dockerUrl;
      switch (os.platform()) {
        case 'darwin': {
          dockerUrl = 'https://docs.docker.com/docker-for-mac/install/';
          break;
        }
        case 'win32': {
          dockerUrl = 'https://docs.docker.com/docker-for-windows/install/';
          break;
        }
        default: {
          dockerUrl = 'https://docs.docker.com/desktop/';
        }
      }

      throw new Error(
        `Could not connect to Docker. Is it running?\nIf you haven't installed Docker yet, please download & install it first:\n\n   ${dockerUrl}`,
      );
    });
    return docker;
  }

  /**
   * @returns {Promise<boolean>}
   */
  static async imageExists(imageName) {
    const docker = await this.ensureDocker();

    const images = await docker.listImages();
    return images.find(
      (image) => Array.isArray(image.RepoTags) && image.RepoTags.includes(imageName),
    );
  }

  static async imageNeedPull(imageName, platform = undefined) {
    const now = new Date();

    let lastCheck = await Settings.get(
      platform === undefined
        ? `dockerPullLastCheck-${imageName}`
        : `dockerPullLastCheck-${imageName}-platform`,
    );

    if (lastCheck === null) {
      return true;
    }

    lastCheck = new Date(lastCheck);
    const hours = Math.abs(now - lastCheck) / 36e5;

    return hours > 12;
  }

  static async imagePullIfNeeded(imageName, platform = undefined) {
    if (
      !(await DockerHelper.imageExists(imageName, platform)) ||
      (await DockerHelper.imageNeedPull(imageName, platform))
    ) {
      await DockerHelper.imagePull(imageName, platform);
    }
  }

  /**
   * @param {string} imageName The name of the image to pull
   */
  static async imagePull(imageName, platform = undefined) {
    const docker = await this.ensureDocker();

    // Adjust settings
    await Settings.set(
      platform === undefined
        ? `dockerPullLastCheck-${imageName}`
        : `dockerPullLastCheck-${imageName}-platform`,
      new Date(),
    );

    Log.success('Downloading Docker Image...');
    await new Promise((resolve, reject) => {
      docker.pull(
        imageName,
        {
          platform,
        },
        // Callback:
        (err, stream) => {
          if (err) return reject(err);

          docker.modem.followProgress(
            stream,
            // onFinish:
            (err) => {
              if (err) return reject(err);
              return resolve();
            },
            // onProgress:
            ({ id, status, progressDetail }) => {
              if (progressDetail && progressDetail.total) {
                if (id) {
                  Log.info(
                    ` — [${id}] ${status} ${Math.round((progressDetail.current / progressDetail.total) * 100)}%`,
                  );
                } else {
                  Log.info(
                    ` — ${status} ${Math.round((progressDetail.current / progressDetail.total) * 100)}%`,
                  );
                }
              } else if (id) {
                Log.info(` — [${id}] ${status}`);
              } else {
                Log.info(` — ${status}`);
              }
            },
            //
          );
        },
        //
      );
    });
  }

  /**
   * @param {string} sessionId container['Labels']['com.athom.session']
   */
  static async deleteContainerBySessionId(sessionId) {
    const docker = await this.ensureDocker();

    Log.success('Removing container...');
    const containers = await docker.listContainers({
      all: true,
    });
    const container = containers.find((container) => {
      return container['Labels']['com.athom.session'] === sessionId;
    });

    if (container) {
      const containerInstance = docker.getContainer(container['Id']);
      await containerInstance.stop().catch(() => {});
      await containerInstance.wait().catch(() => {});
      await containerInstance.remove().catch(() => {});
    }

    Log.success('Removed container');
  }

  /**
   * @param {string} appId container['Labels']['com.athom.app-id']
   */
  static async deleteContainerByManifestAppId(appId) {
    const docker = await this.ensureDocker();

    const containers = await docker.listContainers({
      all: true,
    });

    for (const container of containers) {
      if (container['Labels']['com.athom.app-id'] === appId) {
        const containerInstance = docker.getContainer(container['Id']);
        await containerInstance.stop().catch(() => {});
        await containerInstance.wait().catch(() => {});
        await containerInstance.remove().catch(() => {});
        Log.success('Removed existing container');
      }
    }
  }

  /**
   * @returns {Promise<string>} e.g. host.docker.internal
   */
  static async determineHost() {
    if (process.env.DOCKER_HOST_GATEWAY) {
      return process.env.DOCKER_HOST_GATEWAY;
    }

    if (process.platform !== 'linux') {
      return 'host.docker.internal';
    }

    try {
      const outboundIp = await DockerHelper.getOutboundIp();

      if (outboundIp?.address) {
        return outboundIp.address;
      }
    } catch (error) {
      Log.info(error.message);
    }

    return '172.17.0.1';
  }

  /**
   * @returns {Promise<os.NetworkInterfaceInfo>}
   */
  static async getOutboundIp() {
    return new Promise((resolve, reject) => {
      const sock = dgram.createSocket('udp4');

      sock.once('error', () => {
        sock.close();
        reject(new Error('Unable to determine outbound IP address'));
      });

      sock.connect(53, '8.8.8.8', () => {
        const socketAddress = sock.address();
        const ip =
          typeof socketAddress === 'string' ? '127.0.0.1' : socketAddress.address || '127.0.0.1';
        sock.close();

        const networkInterfaces = os.networkInterfaces();
        for (const interfaceName of Object.keys(networkInterfaces)) {
          const networkAddresses = networkInterfaces[interfaceName] || [];

          for (const networkAddress of networkAddresses) {
            if (
              networkAddress.family === 'IPv4' &&
              networkAddress.internal !== true &&
              networkAddress.address === ip
            ) {
              resolve(networkAddress);
              return;
            }
          }
        }

        reject(new Error('Unable to determine outbound IP address'));
      });
    });
  }

  static async fixDockerEmulationError(platform, docker) {
    Log.error('It looks like you are using Docker Engine without emulation support.');
    Log.error(`Emulation is needed to cross-compile Python packages for ${platform}.`);
    const response = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Would you like to set up QEMU emulation for Docker?',
        default: true,
      },
    ]);
    if (!response.confirm) {
      throw new Error('Cannot finish without cross-compilation');
    }
    await docker.runPromise('tonistiigi/binfmt', ['--install', 'all'], undefined, {
      HostConfig: {
        AutoRemove: true,
        Privileged: true,
      },
    });
    Log.success('Registered QEMU emulation for Docker');
  }
}

module.exports = DockerHelper;
