/* eslint-disable no-process-exit */

'use strict';

const os = require('os');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const http = require('http');
const stream = require('stream');
const { promisify } = require('util');
const sharp = require('sharp');

const { AthomAppsAPI, HomeyAPIV2 } = require('homey-api');
const { getAppLocales } = require('homey-lib');
const HomeyLibApp = require('homey-lib').App;
const HomeyLibDevice = require('homey-lib').Device;
const HomeyLibUtil = require('homey-lib').Util;
const colors = require('colors');
const inquirer = require('inquirer');
const tmp = require('tmp-promise');
const tar = require('tar-fs');
const semver = require('semver');
const ignoreWalk = require('ignore-walk');
const fse = require('fs-extra');
const filesize = require('filesize');
const querystring = require('querystring');
const fetch = require('node-fetch');
const Docker = require('dockerode');
const getPort = require('get-port');
const SocketIOServer = require('socket.io');
const SocketIOClient = require('socket.io-client');
const express = require('express');
const childProcess = require('child_process');
const isWsl = require('is-wsl');

const AthomApi = require('../services/AthomApi');
const Settings = require('../services/Settings');
const Util = require('./Util');
const Log = require('./Log');
const HomeyCompose = require('./HomeyCompose');
const GitCommands = require('./GitCommands');
const NpmCommands = require('./NpmCommands');
const ZWave = require('./ZWave');

const exec = promisify(childProcess.exec);
const statAsync = promisify(fs.stat);
const mkdirAsync = promisify(fs.mkdir);
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);
const copyFileAsync = promisify(fs.copyFile);
const readDirAsync = promisify(fs.readdir);

const pipeline = promisify(stream.pipeline);

const INVALID_CHARACTERS = /[^a-zA-Z0-9-_]/g;
const FLOW_TYPES = ['triggers', 'conditions', 'actions'];

class App {

  constructor(appPath) {
    this.path = path.resolve(appPath);
    this._homeyBuildPath = path.join(this.path, '.homeybuild');
    this._homeyComposePath = path.join(this.path, '.homeycompose');
    this._exiting = false;
    this._std = {};
    this._git = new GitCommands(appPath);
  }

  static usesTypeScript({ appPath }) {
    const pkgPath = path.join(appPath, 'package.json');

    try {
      const pkg = fse.readJSONSync(pkgPath);
      return Boolean(pkg && pkg.devDependencies && pkg.devDependencies.typescript);
    } catch (error) {
      // Ignore
    }

    return false;
  }

  static usesModules({ appPath }) {
    const pkgPath = path.join(appPath, 'package.json');

    try {
      const pkg = fse.readJSONSync(pkgPath);
      return Boolean(pkg && pkg.type === 'module');
    } catch (error) {
      // Ignore
    }

    return false;
  }

  static async transpileToTypescript({ appPath }) {
    Log.success('Typescript detected. Compiling...');

    try {
      let tsconfig;
      try {
        const { stdout } = await exec('npx tsc --showConfig');
        tsconfig = JSON.parse(stdout);
      } catch (error) {
        throw new Error('Tsconfig validation failed: unable to read configuration from `npx tsc --showConfig`.');
      }
      const actualOutDir = tsconfig.compilerOptions?.outDir;
      const expectedOutDir = './.homeybuild';
      if (actualOutDir !== expectedOutDir) {
        throw new Error(`Expected \`outDir\` to be \`${expectedOutDir}\`, but found \`${actualOutDir || 'undefined'}\``);
      }
      await exec('npm run build', { cwd: appPath });

      Log.success('Typescript compilation successful');
    } catch (err) {
      Log.error('Error occurred while running tsc');
      if (err instanceof Error) {
        Log(err.message);
      } else {
        Log(err.stdout);
      }
      throw new Error('Typescript compilation failed.');
    }
  }

  static async monitorCtrlC(callback) {
    process.once('SIGINT', callback); // CTRL+C
    process.once('SIGQUIT', callback); // Keyboard quit
    process.once('SIGTERM', callback); // `kill` command
  }

  async validate({ level = 'debug' } = {}) {
    await this._validate({ level });
  }

  async _validate({ level = 'debug' } = {}) {
    Log.success('Validating app...');

    try {
      const validator = new HomeyLibApp(this._homeyBuildPath);
      await validator.validate({ level });

      Log.success(`App validated successfully against level \`${level}\``);
      return true;
    } catch (err) {
      Log.error(`App did not validate against level \`${level}\`:`);
      throw new Error(err.message);
    }
  }

  async build() {
    Log.success('Building app...');
    await this.preprocess();

    const valid = await this._validate();
    if (valid !== true) throw new Error('The app is not valid, please fix the validation issues first.');

    Log.success('App built successfully');
  }

  async run({
    clean = false,
    remote = false,
    skipBuild = false,
    linkModules = '',
    network,
    dockerSocketPath,
  } = {}) {
    const homey = await AthomApi.getActiveHomey();

    // Homey Cloud does not support running apps remotely.
    if (homey.platform === 'cloud' && remote === true) {
      throw new Error('Homey Cloud does not support running apps remotely. Try again without --remote.');
    }

    // Force remote for Homey Pro (2016 — 2019)
    if (homey instanceof HomeyAPIV2) {
      remote = true;
    }

    if (remote) {
      return this.runRemote({
        homey,
        clean,
        skipBuild,
      });
    }

    return this.runDocker({
      homey,
      clean,
      skipBuild,
      linkModules,
      network,
      dockerSocketPath,
    });
  }

  async runRemote({
    homey,
    clean,
    skipBuild,
  }) {
    homey.devkit.on('std', this._onStd.bind(this));
    homey.devkit.on('disconnect', () => {
      Log.error('Connection has been lost, attempting to reconnect...');

      // reconnect event isn't forwarded from athom api
      homey.devkit.once('connect', () => {
        Log.success('Connection restored, some logs might be missing');
      });
    });

    await homey.devkit.connect();

    this._session = await this.install({
      homey,
      clean,
      skipBuild,
      debug: true,
    });

    if (clean) {
      Log.warning('Purged all Homey App settings');
    }

    Log.success(`Running \`${this._session.appId}\`, press CTRL+C to quit`);
    Log.info(` — Profile your app's performance at https://go.athom.com/app-profiling?homey=${homey.id}&app=${this._session.appId}`);
    Log('─────────────── Logging stdout & stderr ───────────────');

    App.monitorCtrlC(this._onCtrlC.bind(this));
  }

  async runDocker({
    homey,
    clean,
    skipBuild,
    linkModules,
    network,
    dockerSocketPath,
  }) {
    // Prepare Docker
    const dockerOptions = {};
    if (dockerSocketPath) {
      dockerOptions.socketPath = dockerSocketPath;
    }
    const docker = new Docker(dockerOptions);
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

      throw new Error(`Could not connect to Docker. Is it running?\nIf you haven't installed Docker yet, please download & install it first:\n\n   ${dockerUrl}`);
    });

    // Build the App
    if (skipBuild) {
      Log(colors.yellow('\n⚠ Skipping build steps!\n'));
    } else {
      await this.preprocess();
    }

    // Validate the App
    const valid = await this._validate();
    if (valid !== true) throw new Error('Not installing, please fix the validation issues first');

    const manifest = App.getManifest({ appPath: this.path });

    // Install the App
    Log.success('Creating Remote Debug Session...');
    const {
      sessionId,
    } = await homey.devkit.installApp({
      clean,
      manifest,
    }).catch((err) => {
      if (err.cause && err.cause.error) {
        err.message = err.cause.error;
      }
      throw err;
    });

    const baseUrl = await homey.baseUrl;
    const socketUrl = `${baseUrl}/devkit`;

    // Find Inspect Port
    const inspectPort = await getPort({
      port: getPort.makeRange(9229, 9229 + 100),
    });

    const HOMEY_APP_RUNNER_DEVMODE = process.env.HOMEY_APP_RUNNER_DEVMODE === '1';
    const HOMEY_APP_RUNNER_PATH = process.env.HOMEY_APP_RUNNER_PATH; // e.g. /Users/username/Git/homey-app-runner/src
    const HOMEY_APP_RUNNER_CMD = ['node', `--inspect=0.0.0.0:${inspectPort}`, 'index.js'];
    const HOMEY_APP_RUNNER_ID = process.env.HOMEY_APP_RUNNER_ID || 'ghcr.io/athombv/homey-app-runner:latest';
    const HOMEY_APP_RUNNER_SDK_PATH = process.env.HOMEY_APP_RUNNER_SDK_PATH; // e.g. /Users/username/Git/node-homey-apps-sdk-v3

    // Download Image
    if (!process.env.HOMEY_APP_RUNNER_ID) {
      let pull = false;

      // Check if the image exists
      const images = await docker.listImages();
      const image = images.find((image) => Array.isArray(image.RepoTags) && image.RepoTags.includes(HOMEY_APP_RUNNER_ID));
      if (!image) pull = true;

      // Only pull periodically
      const now = new Date();
      let lastCheck = await Settings.get('dockerPullHomeyAppRunnerLastCheck');
      if (lastCheck === null) {
        lastCheck = new Date(1970, 1, 1);
      } else {
        lastCheck = new Date(lastCheck);
      }

      const hours = Math.abs(now - lastCheck) / 36e5;
      if (hours > 12) pull = true;

      if (pull) {
        await Settings.set('dockerPullHomeyAppRunnerLastCheck', now.toString());

        Log.success('Downloading Docker Image...');
        await new Promise((resolve, reject) => {
          docker.pull(HOMEY_APP_RUNNER_ID, {}, (err, stream) => {
            if (err) return reject(err);
            docker.modem.followProgress(stream, (err) => {
              if (err) return reject(err);
              return resolve();
            }, ({ id, status, progressDetail }) => {
              if (progressDetail && progressDetail.total) {
                if (id) {
                  Log.info(` — [${id}] ${status} ${Math.round((progressDetail.current / progressDetail.total) * 100)}%`);
                } else {
                  Log.info(` — ${status} ${Math.round((progressDetail.current / progressDetail.total) * 100)}%`);
                }
              } else if (id) {
                Log.info(` — [${id}] ${status}`);
              } else {
                Log.info(` — ${status}`);
              }
            });
          });
        });
      }
    }

    // Get Environment Variables
    Log.success('Preparing Environment Variables...');
    const env = await this._getEnv();
    if (Object.keys(env).length) {
      Log.info(' — Homey.env (env.json)');
      Object.keys(env).forEach((key) => {
        const value = env[key];
        Log.info(`   — ${key}=${Util.ellipsis(value)}`);
      });
    }

    let cleanupPromise;
    const cleanup = async () => {
      if (!cleanupPromise) {
        cleanupPromise = Promise.resolve().then(async () => {
          Log('───────────────────────────────────────────────────────');

          await Promise.all([

            // Uninstall the App
            Promise.resolve().then(async () => {
              Log.success(`Uninstalling \`${manifest.id}\`...`);
              try {
                await homey.devkit.uninstallApp({ sessionId });
                Log.success(`Uninstalled \`${manifest.id}\``);
              } catch (err) {
                Log.error('Error Uninstalling:', err.message || err.toString());
              }
            }),

            // Delete the Container
            Promise.resolve().then(async () => {
              Log.success('Removing container...');
              const containers = await docker.listContainers({
                all: true,
              });
              const container = containers.find((container) => {
                return container['Labels']['com.athom.session'] === sessionId;
              });

              if (container) {
                const containerInstance = docker.getContainer(container['Id']);
                await containerInstance.stop().catch(() => { });
                await containerInstance.wait().catch(() => { });
                await containerInstance.remove().catch(() => { });
              }

              Log.success('Removed container');
            }),
          ]).catch((err) => {
            Log.error(err.message || err.toString());
          });
        });
      }

      return cleanupPromise;
    };

    const containers = await docker.listContainers({
      all: true,
    });

    for (const container of containers) {
      if (container['Labels']['com.athom.app-id'] === manifest.id) {
        const containerInstance = docker.getContainer(container['Id']);
        await containerInstance.stop().catch(() => { });
        await containerInstance.wait().catch(() => { });
        await containerInstance.remove().catch(() => { });
      }
    }

    // Monitor CTRL+C
    let exiting = false;
    App.monitorCtrlC(() => {
      if (exiting) {
        process.exit(1);
      }

      exiting = true;
      cleanup()
        .catch(() => { })
        .finally(() => {
          process.exit(0);
        });
    });

    const serverPort = await getPort({
      port: getPort.makeRange(30000, 40000),
    });

    const serverApp = express();
    const serverHTTP = http.createServer(serverApp);

    // Proxy Icons, add a X-Homey-Hash header
    serverApp.get('*.svg', (req, res, next) => {
      Util.getFileHash(path.join(this._homeyBuildPath, req.path))
        .then((hash) => {
          res.header('X-Homey-Hash', hash);
          next();
        })
        .catch((err) => {
          if (err.code === 'ENOENT') {
            res.status(404);
            res.end(`Not Found: ${req.path}`);
          } else {
            res.status(400);
            res.end(err.message || err.toString());
          }
        });
    });

    // Proxy local assets

    const middlewares = {};

    // During development with docker we get the widget public files from the source folder so that
    // the app does not have to be restarted when the widget files change. Making a change and
    // reloading the widget should fetch the new file.
    serverApp.use('/widgets/:widgetId/public', (req, res, next) => {
      const widgetId = req.params.widgetId;
      if (!middlewares[widgetId]) {
        const widgetPath = path.join(this.path, 'widgets', widgetId, 'public');
        middlewares[widgetId] = express.static(widgetPath);
      }

      return middlewares[widgetId](req, res, next);
    });
    serverApp.use('/', express.static(this._homeyBuildPath));

    // Start the HTTP Server
    await new Promise((resolve, reject) => {
      serverHTTP.listen(serverPort, (err) => {
        if (err) return reject(err);
        return resolve();
      });
    });

    // Start Socket.IO ServerIO & clientIO
    // The app inside Docker talks to 'serverIO'
    // The 'clientIO' talks to Homey
    Log.success(`Connecting to \`${homey.name}\`...`);
    let homeyIOResolve;
    let homeyIOReject;
    const homeyIOPromise = new Promise((resolve, reject) => {
      homeyIOResolve = resolve;
      homeyIOReject = reject;
    });

    const clientIO = await new Promise((resolve, reject) => {
      const clientIO = SocketIOClient(socketUrl, {
        transports: ['websocket'],
      });
      clientIO
        .on('connect', () => {
          resolve(clientIO);
        })
        .on('connect_error', (err) => {
          Log.error(`Error connecting to \`${homey.name}\``);
          Log.error(err);
          reject(err);
        })
        .on('error', reject)
        .on('disconnect', () => {
          Log.error(`Disconnected from \`${homey.name}\``);
          cleanup()
            .catch()
            .finally(() => {
              process.exit();
            });
        })
        .on('event', ({ event, data }, callback) => {
          homeyIOPromise.then((homeyIO) => {
            homeyIO.emit('event', {
              homeyId: homey.id,
              event,
              data,
            }, callback);
          }).catch((err) => callback(err));
        })
        .on('getFile', ({ path }, callback) => {
          Promise.resolve().then(async () => {
            const res = await fetch(`http://localhost:${serverPort}${path}`);
            const headers = {
              'Content-Type': res.headers.get('Content-Type') || undefined,
              'X-Homey-Hash': res.headers.get('X-Homey-Hash') || undefined,
            };
            const body = await res.buffer();

            return {
              status: res.status,
              headers,
              body,
            };
          })
            .then((result) => callback(null, result))
            .catch((error) => callback(error.message || error.toString()));
        })
        .on('getImage', ({ ...args }, callback) => {
          homeyIOPromise.then((homeyIO) => {
            homeyIO.emit('getImage', {
              homeyId: homey.id,
              ...args,
            }, callback);
          }).catch((err) => callback(err));
        });
    });

    const serverIO = SocketIOServer(serverHTTP, {
      transports: ['websocket'],
      reconnect: false,
      pingTimeout: 10000,
      pingInterval: 30000,
      maxHttpBufferSize: 10e6,
    });
    serverIO.on('connection', (socket) => {
      socket
        .on('event', ({ homeyId, ...props }, callback) => {
          if (homeyId !== homey.id) {
            return callback('Invalid Homey ID');
          }

          // Override 'Homey.api.getLocalUrl'.
          // Homey Pro returns the Docker-host, but Homey CLI is not running on the same machine.
          if (props.type === 'request' && props.uri === 'homey:manager:api' && props.event === 'getLocalUrl') {
            return homey.baseUrl
              .then((result) => callback(null, result))
              .catch((err) => callback(err));
          }

          return clientIO.emit('event', {
            sessionId,
            ...props,
          }, callback);
        })
        .emit('createClient', ({
          homeyId: homey.id,
          homeyVersion: homey.version,
          homeyPlatform: homey.platform,
          homeyPlatformVersion: homey.platformVersion,
          homeyPlatformFeatures: HomeyLibUtil.getPlatformLocalFeatures(homey.model),
          homeyLanguage: homey.language,
        }), (err) => {
          if (err) {
            Log.error('App Crashed. Stack Trace:');
            Log.error(err);

            exiting = true;
            cleanup()
              .catch(() => { })
              .finally(() => {
                process.exit(0);
              });
            return homeyIOReject(err);
          }
          return homeyIOResolve(socket);
        });
    });

    // Add Icon Hashes to Manifest
    // App Icon Hash
    manifest.iconHash = await Util.getFileHash(path.join(this.path, 'assets', 'icon.svg'));

    // Driver Icon Hashes
    if (Array.isArray(manifest.drivers)) {
      await Promise.all(manifest.drivers.map(async (driver) => {
        const iconPath = path.join(this.path, 'drivers', driver.id, 'assets', 'icon.svg');
        if (await fse.pathExists(iconPath)) {
          driver.iconHash = await Util.getFileHash(iconPath);
        }
      }));
    }

    // Capability Icon Hashes
    if (manifest.capabilities) {
      await Promise.all(Object.values(manifest.capabilities).map(async (capability) => {
        if (capability.icon) {
          const iconPath = path.join(this.path, capability.icon);
          capability.iconHash = await Util.getFileHash(iconPath);
        }
      }));
    }

    // Settings
    if (await fse.pathExists(path.join(this.path, 'settings', 'index.html'))) {
      manifest.hasSettings = true;
    }

    // Start the App on Homey
    Log.success(`Starting \`${manifest.id}@${manifest.version}\` remotely...`);
    await Promise.race([
      new Promise((resolve, reject) => {
        clientIO.emit('start', {
          sessionId,
          manifest,
          homeyId: homey.id,
          appId: manifest.id,
        }, (err) => {
          if (err) return reject(new Error(err));
          return resolve();
        });
      }),
      new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('App Start Timeout From Homey'));
        }, 10000);
      }),
    ]);

    const tmpDir = path.join(os.tmpdir(), 'apps-tmp', manifest.id);
    if (homey.platform === 'local') {
      await fse.ensureDir(tmpDir);
      await fse.emptyDir(tmpDir);

      fse.watch(tmpDir, (_, filename) => {
        Log.info(`Modified: ${path.join(tmpDir, filename)}`);
      });
    }

    let userdataDirWarned = false;
    const userdataDir = path.join(Settings.getSettingsDirectory(), 'apps-userdata', manifest.id);
    if (homey.platform === 'local') {
      // Ensure the directory exists
      await fse.ensureDir(userdataDir);

      // Empty userdata when --clean is set
      if (clean === true) {
        await fse.emptyDir(userdataDir);
      }

      // Watch /userdata/ for changes, and notify the user the files might become out of sync.
      fse.watch(userdataDir, (_, filename) => {
        if (userdataDirWarned === false) {
          userdataDirWarned = true;
          Log.warning('Warning: The /userdata folder is not synced with Homey Pro while developing.\nAfter running the app from the Homey App Store, your /userdata may be out of sync.');
        }

        Log.info(`Modified: ${path.join(userdataDir, filename)}`);
      });

      // Mount /userdata/ to webserver
      serverApp.use('/userdata/', express.static(userdataDir));
    }

    // Create & Run Container
    // eslint-disable-next-line no-nested-ternary
    const host = (process.platform === 'linux')
      ? isWsl // Windows Subsystem for Linux
        ? await new Promise((resolve, reject) => {
          childProcess.exec('wsl.exe hostname -I | awk \'{print $1;}\'', (err, stdout) => {
            if (err) return reject(err);
            return resolve(stdout.trim());
          });
        })
        : process.env.DOCKER_HOST_GATEWAY || '172.17.0.1'
      : 'host.docker.internal';

    const createOpts = {
      name: `homey-app-runner-${sessionId}-${manifest.id}-v${manifest.version}`,
      Env: [
        'APP_PATH=/app',
        `APP_ENV=${JSON.stringify(env)}`,
        `SERVER=ws://${host}:${serverPort}`,
        'DEBUG=1',
        ...(HOMEY_APP_RUNNER_DEVMODE
          ? ['DEVMODE=1']
          : []),
      ],
      ExposedPorts: {
        [`${inspectPort}/tcp`]: {},
      },
      Labels: {
        'com.athom.session': sessionId,
        'com.athom.port': String(serverPort),
        'com.athom.app-id': manifest.id,
        'com.athom.app-version': manifest.version,
      },
      HostConfig: {
        ReadonlyRootfs: true,
        NetworkMode: network,
        PortBindings: {
          [`${inspectPort}/tcp`]: [{
            HostPort: String(inspectPort),
          }],
        },
        Binds: [
          ...(HOMEY_APP_RUNNER_PATH
            ? [`${HOMEY_APP_RUNNER_PATH}:/homey-app-runner:ro,z`]
            : []),
          ...(HOMEY_APP_RUNNER_SDK_PATH
            ? [`${HOMEY_APP_RUNNER_SDK_PATH}:/homey-app-runner/node_modules/@athombv/homey-apps-sdk-v3:ro,z`]
            : []),
          `${this._homeyBuildPath}:/app:ro,z`,

          // Mount /userdata & /tmp for Homey Pro
          ...(homey.platform === 'local'
            ? [
              `${tmpDir}:/tmp:rw,z`,
              `${userdataDir}:/userdata:rw,z`,
            ]
            : []),

          // Link Node.js modules as Docker binds.
          // Note that we need to read the `name` from the module's package.json to create a correct path.
          `${path.join(this._homeyBuildPath, 'node_modules')}:/app/node_modules/:rw,z`,
          ...(linkModules.split(',')
            .filter((linkModule) => !!linkModule)
            .map((linkModule) => {
              const linkedModulePath = linkModule.trim();
              const { name } = fse.readJSONSync(path.join(linkedModulePath, 'package.json'));
              return `${linkedModulePath}:/app/node_modules/${name}`;
            })),
        ],
      },
    };

    Log.success(`Starting debugger at 0.0.0.0:${inspectPort}...`);
    Log.info(' — Open `about://inspect` in Google Chrome and select the remote target.');
    Log.success(`Starting \`${manifest.id}@${manifest.version}\` in a Docker container...`);
    Log.info(' — Press CTRL+C to quit.');
    Log('─────────────── Logging stdout & stderr ───────────────');

    const passThrough = new stream.PassThrough();
    passThrough.pipe(process.stdout);

    // On Raspberry Pi, an outdated libseccomp crashes the container.
    // Help the developer by letting them know to upgrade.
    if (process.platform === 'linux') {
      passThrough.on('data', (chunk) => {
        chunk = chunk.toString();

        if (chunk.includes('# Fatal error in , line 0')) {
          setTimeout(() => {
            Log.error(`
Oops! Node.js inside Docker has crashed. This is a known issue due to an outdated package on Linux.
To fix, simply run:

$ wget http://ftp.debian.org/debian/pool/main/libs/libseccomp/libseccomp2_2.5.3-2_armhf.deb
$ sudo dpkg -i libseccomp2_2.5.3-2_armhf.deb
$ rm libseccomp2_2.5.3-2_armhf.deb
$ sudo systemctl restart docker
`);
          }, 1000);
        }
      });
    }

    await docker.run(HOMEY_APP_RUNNER_ID, HOMEY_APP_RUNNER_CMD, passThrough, createOpts);

    await cleanup();
    process.exit(0);
  }

  async install({
    homey,
    clean = false,
    skipBuild = false,
    debug = false,
  } = {}) {
    if (homey.platform === 'cloud') {
      throw new Error('Installing apps is not available on Homey Cloud.\nPlease run your app instead.');
    }

    if (skipBuild) {
      Log(colors.yellow('\n⚠ Skipping build steps!\n'));
    } else {
      await this.preprocess();
    }

    const valid = await this._validate();
    if (valid !== true) throw new Error('Not installing, please fix the validation issues first');

    Log.success('Packing Homey App...');

    const app = await this._getPackStream({
      appPath: skipBuild
        ? this.path
        : this._homeyBuildPath,
    });
    const env = await this._getEnv();

    Log.success(`Installing Homey App on \`${homey.name}\` (${await homey.baseUrl})...`);

    try {
      const result = await homey.devkit.runApp({
        app,
        env,
        debug,
        clean,
      });

      Log.success(`Homey App \`${result.appId}\` successfully installed`);

      return result;
    } catch (err) {
      Log.error(err);
      process.exit();
    }
  }

  async preprocess({
    copyAppProductionDependencies = true,
  } = {}) {
    if (App.hasHomeyCompose({ appPath: this.path }) === false) {
      // Note: this checks that we are in a valid homey app folder
      App.getManifest({ appPath: this.path });
    }

    Log.success('Pre-processing app...');

    // Build app.json from Homey Compose files
    if (App.hasHomeyCompose({ appPath: this.path })) {
      const usesModules = App.usesModules({ appPath: this.path });

      await HomeyCompose.build({ appPath: this.path, usesModules });
    }

    // Clear the .homeybuild/ folder
    await fse.remove(this._homeyBuildPath).catch(async (err) => {
      // It helps to wait a bit when ENOTEMPTY is thrown.
      if (err.code === 'ENOTEMPTY') {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return fse.remove(this._homeyBuildPath);
      }

      throw err;
    });

    // Copy app source over to .homeybuild/
    await this._copyAppSourceFiles();

    // Copy production dependencies to .homeybuild/
    if (copyAppProductionDependencies) {
      await this._copyAppProductionDependencies();
    }

    // Compile TypeScript files to .homeybuild/
    if (App.usesTypeScript({ appPath: this.path })) {
      await App.transpileToTypescript({ appPath: this.path });
    }

    const appJsonPath = path.join(this.path, 'app.json');

    // Read app.json file as json.
    try {
      const appJsonDataRaw = await fs.promises.readFile(appJsonPath, 'utf-8');
      const appJsonData = JSON.parse(appJsonDataRaw);

      // Ensure package.json contains type: module
      if (appJsonData.esm === true) {
        const packageJsonPath = path.join(this.path, 'package.json');

        try {
          const packageJsonDataRaw = await fs.promises.readFile(packageJsonPath, 'utf-8');
          const packageJsonData = JSON.parse(packageJsonDataRaw);
          packageJsonData.type = 'module';

          // Write to build folder.
          await fs.promises.writeFile(path.join(this._homeyBuildPath, 'package.json'), JSON.stringify(packageJsonData, null, 2));
        } catch (err) {
          Log.error('Error reading the file', err);
        }
      }
    } catch (err) {
      Log.error('Error reading the file', err);
    }

    // Ensure `/.homeybuild` is added to `.gitignore`, if it exists
    const gitIgnorePath = path.join(this.path, '.gitignore');
    if (await fse.pathExists(gitIgnorePath)) {
      const gitIgnore = await fse.readFile(gitIgnorePath, 'utf8');
      if (!gitIgnore.includes('.homeybuild')) {
        Log.success('Automatically added `/.homeybuild/` to .gitignore');
        await fse.writeFile(gitIgnorePath, `${gitIgnore}\n\n# Added by Homey CLI\n/.homeybuild/`);
      }
    }
  }

  async _copyAppSourceFiles() {
    const sourceFiles = await this._getAppSourceFiles();

    for (const filePath of sourceFiles) {
      const fullSrc = path.join(this.path, filePath);
      const fullDest = path.join(this._homeyBuildPath, filePath);

      await fse.copy(fullSrc, fullDest);
    }

    const appJson = await fs.promises.readFile(path.join(this.path, 'app.json')).then((data) => {
      return JSON.parse(data);
    });

    if (appJson.widgets) {
      for (const [widgetId] of Object.entries(appJson.widgets)) {
        const previewLightPath = path.join(this.path, 'widgets', widgetId, 'preview-light.png');
        const previewDarkPath = path.join(this.path, 'widgets', widgetId, 'preview-dark.png');

        // eslint-disable-next-line no-useless-catch
        try {
          await fs.promises.access(previewLightPath);
          await fs.promises.access(previewDarkPath);

          const imageLight = sharp(previewLightPath);
          const imageDark = sharp(previewDarkPath);

          await fs.promises.mkdir(path.join(this._homeyBuildPath, 'widgets', widgetId, '__assets__'), { recursive: true });
          await Promise.all([
            fs.promises.copyFile(previewLightPath, path.join(this._homeyBuildPath, 'widgets', widgetId, '__assets__', 'preview-light.png')),
            imageLight.resize(128, 128).toFile(path.join(this._homeyBuildPath, 'widgets', widgetId, '__assets__', 'preview-light@1x.png')),
            imageLight.resize(192, 192).toFile(path.join(this._homeyBuildPath, 'widgets', widgetId, '__assets__', 'preview-light@1.5x.png')),
            imageLight.resize(256, 256).toFile(path.join(this._homeyBuildPath, 'widgets', widgetId, '__assets__', 'preview-light@2x.png')),
            imageLight.resize(384, 384).toFile(path.join(this._homeyBuildPath, 'widgets', widgetId, '__assets__', 'preview-light@3x.png')),
            imageLight.resize(512, 512).toFile(path.join(this._homeyBuildPath, 'widgets', widgetId, '__assets__', 'preview-light@4x.png')),
            fs.promises.copyFile(previewDarkPath, path.join(this._homeyBuildPath, 'widgets', widgetId, '__assets__', 'preview-dark.png')),
            imageDark.resize(128, 128).toFile(path.join(this._homeyBuildPath, 'widgets', widgetId, '__assets__', 'preview-dark@1x.png')),
            imageDark.resize(192, 192).toFile(path.join(this._homeyBuildPath, 'widgets', widgetId, '__assets__', 'preview-dark@1.5x.png')),
            imageDark.resize(256, 256).toFile(path.join(this._homeyBuildPath, 'widgets', widgetId, '__assets__', 'preview-dark@2x.png')),
            imageDark.resize(384, 384).toFile(path.join(this._homeyBuildPath, 'widgets', widgetId, '__assets__', 'preview-dark@3x.png')),
            imageDark.resize(512, 512).toFile(path.join(this._homeyBuildPath, 'widgets', widgetId, '__assets__', 'preview-dark@4x.png')),
          ]);
        } catch (error) {
          throw error;
        }
      }
    }
  }

  async _copyAppProductionDependencies() {
    const hasNodeModules = fs.existsSync(path.join(this.path, 'node_modules'));
    const hasPackageJSON = fs.existsSync(path.join(this.path, 'package.json'));

    fse.ensureDirSync(path.join(this._homeyBuildPath, 'node_modules'));

    if (hasNodeModules === true && hasPackageJSON === false) {
      // `npm ls` (in getProductionDependencies) needs a package.json to list dependencies
      // If an app has a node_modules folder but no pacakge.json we just copy it wholesale.
      const src = path.join(this.path, 'node_modules');
      const dest = path.join(this._homeyBuildPath, 'node_modules');
      await fse.copy(src, dest);
      return;
    }

    const dependencies = await NpmCommands.getProductionDependencies({ appPath: this.path })
      .catch((error) => {
        Log.error(error.message);
        throw new Error('This error may be fixed by running `npm install` in your app.');
      });

    for (const filePath of dependencies) {
      const fullSrc = path.join(this.path, filePath);
      const fullDest = path.join(this._homeyBuildPath, filePath);

      await fse.copy(fullSrc, fullDest, {
        filter(src) {
          // Do not copy node_modules of dependencies, if we need a sub-dependency it
          // will itself be listed by `NpmCommands.getProductionDependencies()`
          const subPath = src.replace(fullSrc, '');
          // The first character is either `/` or `\` so we start looking at position 1
          return subPath.startsWith('node_modules', 1) === false;
        },
      });
    }

    // Overwrite the `node_modules/homey` module with the one from the CLI. This is so that apps can
    // import ... from 'homey';
    fse.ensureDirSync(path.join(this._homeyBuildPath, 'node_modules', 'homey'));
    fse.emptyDirSync(path.join(this._homeyBuildPath, 'node_modules', 'homey'));
    const homeyModulePath = path.join(__dirname, '..', 'assets', 'homey');
    await fse.copy(homeyModulePath, path.join(this._homeyBuildPath, 'node_modules', 'homey'));
  }

  async version(version) {
    let manifest;
    let manifestFolder;

    if (App.hasHomeyCompose({ appPath: this.path })) {
      try {
        // HACK: We trick `getManifest` to look into the wrong folder to
        // read and validate the manifest.
        manifest = App.getComposeManifest({ appPath: this.path });
        manifestFolder = path.join(this.path, '.homeycompose');
      } catch (error) {
        // .homeycompose/app.json is optional, you can use a root regular app.json
      }
    }

    if (!manifest) {
      manifest = App.getManifest({ appPath: this.path });
      manifestFolder = this.path;
    }

    const prevVersion = manifest.version;

    if (semver.valid(version)) {
      manifest.version = semver.valid(version);
    } else if (['minor', 'major', 'patch'].includes(version)) {
      manifest.version = semver.inc(manifest.version, version);
    } else {
      throw new Error('Invalid version. Must be either patch, minor or major.');
    }

    await writeFileAsync(path.join(manifestFolder, 'app.json'), JSON.stringify(manifest, false, 2));

    // Build app.json from Homey Compose files
    if (App.hasHomeyCompose({ appPath: this.path })) {
      await HomeyCompose.build({ appPath: this.path });
    }

    Log.success(`Updated app.json version to \`${manifest.version}\``);

    const undo = async () => {
      manifest.version = prevVersion;
      await writeFileAsync(
        path.join(manifestFolder, 'app.json'),
        JSON.stringify(manifest, false, 2),
      );

      // Build app.json from Homey Compose files
      if (App.hasHomeyCompose({ appPath: this.path })) {
        await HomeyCompose.build({ appPath: this.path });
      }
    };

    return undo;
  }

  async changelog(text) {
    const changelogJsonPath = path.join(this.path, '.homeychangelog.json');
    const changelogJson = (await fse.pathExists(changelogJsonPath))
      ? await fse.readJson(changelogJsonPath)
      : {};

    const manifest = App.getManifest({ appPath: this.path });
    const { version } = manifest;

    changelogJson[version] = changelogJson[version] || {};

    if (typeof text === 'string') {
      changelogJson[version]['en'] = text;
    } else if (typeof text === 'object') {
      const validLocales = getAppLocales();

      for (const [languageCode, changelog] of Object.entries(text)) {
        if (!validLocales.includes(languageCode)) {
          throw new Error(`Invalid language code: ${languageCode}. Valid codes are: ${validLocales.join(', ')}`);
        }

        changelogJson[version][languageCode] = changelog;
      }
    } else {
      throw new Error('Invalid changelog format. Must be a string or an object.');
    }

    await fse.writeJson(changelogJsonPath, changelogJson, {
      spaces: 2,
    });

    Log.success(`Updated changelog for version \`${version}\``);
  }

  async commit(changelog) {
    if (await GitCommands.isGitInstalled() && await GitCommands.isGitRepo({ path: this.path })) {
      // Check whether only app.json or also .homeycompose/app.json needs to be committed
      const commitFiles = [];
      commitFiles.push(path.join(this.path, 'app.json'));
      if (await fse.exists(path.join(this._homeyComposePath, 'app.json'))) {
        commitFiles.push(path.join(this._homeyComposePath, 'app.json'));
      }

      // Retrieve updated version
      const { version } = App.getManifest({ appPath: this.path });

      const hasChangelog = !!changelog;
      if (hasChangelog) {
        commitFiles.push(path.join(this.path, '.homeychangelog.json'));

        if (typeof changelog === 'string') {
          changelog = { en: changelog };
        }
      } else {
        // Retrieve from changelog file
        const changelogJsonPath = path.join(this.path, '.homeychangelog.json');
        const changelogJson = (await fse.pathExists(changelogJsonPath))
          ? await fse.readJson(changelogJsonPath)
          : {};

        changelog = changelogJson[version];
      }

      // Commit the changes
      await this._commitChanges(true, hasChangelog, commitFiles, version, changelog, true);
    } else {
      throw new Error('A git executable or repository was not found, could not commit version bump');
    }
  }

  async _commitChanges(bumpedVersion, updatedChangelog, commitFiles, appVersion, changelog, skipCommitQuestion = false) {
    let createdGitTag = false;
    // Only commit and tag if version is bumped
    if (bumpedVersion) {
      // First ask if version bump is desired
      const shouldCommit = skipCommitQuestion || await inquirer.prompt([
        {
          type: 'confirm',
          name: 'value',
          message: `Do you want to commit the version bump ${updatedChangelog ? 'and updated changelog' : ''}?`,
          default: true,
        },
      ]);

      // Check if commit is desired
      if (skipCommitQuestion || shouldCommit.value) {
        // If version is bumped via wizard and changelog is changed via wizard
        // then commit all at once
        if (updatedChangelog) {
          await this._git.commitFiles({
            files: commitFiles,
            message: `Bump version to v${appVersion}`,
            description: `Changelog: ${changelog['en']}`,
          });
          Log.success(`Committed ${commitFiles.map((i) => i.replace(`${this.path}/`, ''))
            .join(', and ')} with version bump`);
        } else {
          await this._git.commitFiles({
            files: commitFiles,
            message: `Bump version to v${appVersion}`,
          });
          Log.success(`Committed ${commitFiles.map((i) => i.replace(`${this.path}/`, ''))
            .join(', and ')} with version bump`);
        }

        try {
          if (await this._git.hasUncommittedChanges()) {
            throw new Error('There are uncommitted or untracked files in this git repository');
          }

          await this._git.createTag({
            version: appVersion,
            message: changelog['en'],
          });

          Log.success(`Successfully created Git tag \`${appVersion}\``);
          createdGitTag = true;
        } catch (error) {
          Log.warning(`Warning: could not create git tag (v${appVersion}), reason:`);
          Log.info(error);
        }
      }
    }

    if (await this._git.hasRemoteOrigin() && bumpedVersion) {
      const answers = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'push',
          message: 'Do you want to push the local changes to `remote "origin"`?',
          default: false,
        },
      ]);

      if (answers.push) {
        // First push tag
        if (createdGitTag) await this._git.pushTag({ version: appVersion });

        // Push all staged changes
        await this._git.push();

        Log.success('Successfully pushed changes to remote.');
      }
    }
  }

  async publish() {
    const undos = {
      version: null,
    };

    try {
      const env = await this._getEnv();

      if (await GitCommands.isGitInstalled() && await GitCommands.isGitRepo({ path: this.path })) {
        if (await this._git.hasUncommittedChanges() && process.env.HOMEY_HEADLESS !== '1') {
          const { shouldContinue } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'shouldContinue',
              message: 'There are uncommitted changes. Are you sure you want to continue?',
              default: false,
            },
          ]);
          if (!shouldContinue) return;
        }
      }

      let manifest = App.getManifest({ appPath: this.path });

      try {
        manifest = App.getComposeManifest({ appPath: this.path });
      } catch (error) {
        // Log.error(error);
      }

      const {
        id: appId,
        name: appName,
      } = manifest;
      let { version: appVersion } = manifest;

      const versionBumpChoices = {
        patch: {
          value: 'patch',
          targetVersion: `${semver.inc(appVersion, 'patch')}`,
          get name() {
            return `Patch (to v${this.targetVersion})`;
          },
        },
        minor: {
          value: 'minor',
          targetVersion: `${semver.inc(appVersion, 'minor')}`,
          get name() {
            return `Minor (to v${this.targetVersion})`;
          },
        },
        major: {
          value: 'major',
          targetVersion: `${semver.inc(appVersion, 'major')}`,
          get name() {
            return `Major (to v${this.targetVersion})`;
          },
        },
      };

      // First ask if version bump is desired
      const shouldUpdateVersion = (process.env.HOMEY_HEADLESS === '1')
        ? { value: false }
        : await inquirer.prompt([
          {
            type: 'confirm',
            name: 'value',
            message: `Do you want to update your app's version number? (current v${appVersion})`,
            default: true,
          },
        ]);
      let shouldUpdateVersionTo = null;

      // If version bump is desired ask for patch/minor/major
      if (shouldUpdateVersion.value) {
        shouldUpdateVersionTo = await inquirer.prompt([
          {
            type: 'list',
            name: 'version',
            message: 'Select the desired version number',
            choices: Object.values(versionBumpChoices),
          },
        ]);
      }

      let bumpedVersion = false;
      const commitFiles = [];
      if (shouldUpdateVersion.value) {
        // Apply new version (this changes app.json and .homeycompose/app.json if needed)
        undos.version = await this.version(shouldUpdateVersionTo.version);

        // Check if only app.json or also .homeycompose/app.json needs to be committed
        commitFiles.push(path.join(this.path, 'app.json'));
        if (await fse.exists(path.join(this._homeyComposePath, 'app.json'))) {
          commitFiles.push(path.join(this._homeyComposePath, 'app.json'));
        }

        // Update version number
        appVersion = versionBumpChoices[shouldUpdateVersionTo.version].targetVersion;

        // Set flag to know that we have changed the version number
        bumpedVersion = true;
      }

      await this.preprocess();

      const profile = await AthomApi.getProfile();
      const level = profile.roleIds.includes('app_developer_trusted')
        ? 'verified'
        : 'publish';
      const valid = await this._validate({ level });
      if (valid !== true) throw new Error('The app is not valid, please fix the validation issues first.');

      delete undos.version;

      // Get or create changelog
      let updatedChangelog = false;
      const changelog = await Promise.resolve().then(async () => {
        const changelogJsonPath = path.join(this.path, '.homeychangelog.json');
        const changelogJson = (await fse.pathExists(changelogJsonPath))
          ? await fse.readJson(changelogJsonPath)
          : {};

        if (!changelogJson[appVersion] || !changelogJson[appVersion]['en']) {
          if (process.env.HOMEY_HEADLESS === '1') {
            throw new Error(`Missing changelog for v${appVersion}, and running in headless mode.`);
          }

          const { text } = await inquirer.prompt([
            {
              type: 'input',
              name: 'text',
              message: `(Changelog) What's new in ${appName.en} v${appVersion}?`,
              validate: (input) => {
                return input.length > 3;
              },
            },
          ]);

          changelogJson[appVersion] = changelogJson[appVersion] || {};
          changelogJson[appVersion]['en'] = text;
          await fse.writeJson(changelogJsonPath, changelogJson, {
            spaces: 2,
          });

          Log.info(` — Changelog: ${text}`);

          // Mark as changed
          updatedChangelog = true;

          // Make sure to commit changelog changes
          commitFiles.push(changelogJsonPath);
        }

        return changelogJson[appVersion];
      });

      // Get readme
      const en = await readFileAsync(path.join(this.path, 'README.txt'))
        .then((buf) => buf.toString())
        .catch((err) => {
          throw new Error('Missing file `/README.txt`. Please provide a README for your app. The contents of this file will be visible in the App Store.');
        });

      const readme = { en };

      // Read files in app dir
      const files = await readDirAsync(this.path, { withFileTypes: true });

      // Loop all paths to check for matching readme names
      for (const file of files) {
        if (Object.prototype.hasOwnProperty.call(file, 'name') && typeof file.name === 'string') {
          // Check for README.<code>.txt file name
          if (file.name.startsWith('README.') && file.name.endsWith('.txt')) {
            const languageCode = file.name.replace('README.', '').replace('.txt', '');

            // Check language code against homey-lib supported language codes
            if (getAppLocales().includes(languageCode)) {
              // Read contents of file into readme object
              readme[languageCode] = await readFileAsync(path.join(this.path, file.name))
                .then((buf) => buf.toString());
            }
          }
        }
      }

      // Get delegation token
      Log.success(`Submitting ${appId}@${appVersion}...`);
      if (Object.keys(env).length) {
        Log.info(' — Homey.env (env.json)');
        Object.keys(env).forEach((key) => {
          const value = env[key];
          Log.info(`   — ${key}=${Util.ellipsis(value)}`);
        });
      }

      const athomAppsApi = new AthomAppsAPI();
      const {
        url,
        method,
        headers,
        buildId,
      } = await athomAppsApi.createBuild({
        $token: await AthomApi.createDelegationToken({
          audience: 'apps',
        }),
        env,
        appId,
        changelog,
        version: appVersion,
        readme,
      });

      // Make sure archive stream is created after any additional changes to the app
      // and right before publishing
      const archiveStream = await this._getPackStream();
      const { size } = await fse.stat(archiveStream.path);

      Log.success(`Created Build ID ${buildId}`);
      Log.success(`Uploading ${appId}@${appVersion}...`);

      await fetch(url, {
        method,
        headers: {
          'Content-Length': size,
          ...headers,
        },
        body: archiveStream,
      }).then(async (res) => {
        if (!res.ok) {
          throw new Error(res.statusText);
        }
      });

      // Commit the version bump and/or changelog to Git if the current path is a repo
      if (await GitCommands.isGitInstalled() && await GitCommands.isGitRepo({ path: this.path })) {
        await this._commitChanges(bumpedVersion, updatedChangelog, commitFiles, appVersion, changelog);
      }
      Log.success(`App ${appId}@${appVersion} successfully uploaded.`);
      Log(colors.white(`\nVisit https://tools.developer.homey.app/apps/app/${appId}/build/${buildId} to publish your app.`));
    } catch (error) {
      for (const undo of Object.values(undos)) {
        if (undo === null) continue;

        await undo().catch((err) => {
          Log.error(err);
        });
      }

      throw error;
    }
  }

  _onStd(std) {
    if (this._exiting) return;
    if (!this._session || std.session !== this._session.session) return;
    if (this._std[std.id]) return;

    if (std.type === 'stdout') process.stdout.write(std.chunk);
    if (std.type === 'stderr') process.stderr.write(std.chunk);

    // mark std as received to prevent duplicates
    this._std[std.id] = true;
  }

  async _onCtrlC() {
    if (this._exiting) return;
    this._exiting = true;

    Log('───────────────────────────────────────────────────────');
    Log.success(`Uninstalling \`${this._session.appId}\`...`);

    try {
      const homey = await AthomApi.getActiveHomey();
      await homey.devkit.stopApp({ session: this._session.session });
      Log.success(`Homey App \`${this._session.appId}\` successfully uninstalled`);
    } catch (err) {
      Log(err);
    }

    process.exit();
  }

  async _getEnv() {
    try {
      const data = await readFileAsync(path.join(this.path, 'env.json'));
      return JSON.parse(data);
    } catch (err) {
      return {};
    }
  }

  async _getPackStream({
    appPath = this._homeyBuildPath,
  } = {}) {
    let appSize = 0;
    let numFiles = 0;

    const tmpFile = await tmp.file();

    await pipeline(
      tar.pack(appPath, {
        dereference: true,
        map(header) {
          if (header.type === 'file') numFiles += 1;
        },
        ignore(name) {
          if (name.startsWith('.')) return true;
          if (name.includes('/.git/')) return true;
          return false;
        },
      }).on('data', (chunk) => {
        appSize += chunk.length;
      }),
      zlib.createGzip(),
      fs.createWriteStream(tmpFile.path),
    );

    Log.info(` — App archive size: ${filesize(appSize)}, ${numFiles} files`);

    const readFileStream = fs.createReadStream(tmpFile.path);

    stream.finished(readFileStream, () => {
      tmpFile.cleanup().catch((error) => {
        // ignore
      });
    });

    return readFileStream;
  }

  async _getAppSourceFiles() {
    const DEFAULT_IGNORE_RULES_FILE = '$default-ignore-rules';

    const walker = new ignoreWalk.Walker({
      path: this.path,
      ignoreFiles: ['.homeyignore', DEFAULT_IGNORE_RULES_FILE],
      includeEmpty: true,
      follow: true,
    });

    const ignoreRules = [
      '.*',
      '.homeybuild',
      '*.{ts,mts,cts}',
      'tsconfig.json',
      'env.json',
      '*.compose.json',
      'node_modules',
    ];
    // Add a "file" containing our default ignore rules for dotfiles, env.json and node_modules
    walker.onReadIgnoreFile(DEFAULT_IGNORE_RULES_FILE, ignoreRules.join('\r\n'), () => { });

    const fileEntries = await new Promise((resolve, reject) => {
      walker.on('done', resolve).on('error', reject).start();
    });

    return fileEntries;
  }

  /**
   * Function to get al drivers from the current path.
   * Returns: String array containing the driver id's.
   */
  async _getDrivers() {
    const driverPath = path.join(this.path, 'drivers');
    try {
      await fse.ensureDir(driverPath);
    } catch (error) {
      throw new Error('Your app doesn\'t contain any drivers!');
    }

    const folderContents = await readDirAsync(driverPath, { withFileTypes: true });
    const drivers = [];

    folderContents.forEach((content) => {
      if (content.isDirectory()) {
        drivers.push(content.name);
      }
    });

    return drivers;
  }

  async migrateToCompose() {
    if (App.hasHomeyCompose({ appPath: this.path })) throw new Error('You already have the Compose enabled, no need to run this command.');

    // Check if the current folder is a git repo. If it is, check for uncommitted changes.
    if (await GitCommands.isGitInstalled() && await GitCommands.isGitRepo({ path: this.path })) {
      if (await this._git.hasUncommittedChanges()) {
        throw new Error('Please commit changes first!');
      }
    }

    const appJson = App.getManifest({ appPath: this.path });

    const drivers = await this._getDrivers();
    let appFlowJson;
    if (appJson.flow) {
      appFlowJson = appJson.flow;
      // Delete the flow section from the app JSON.
      delete appJson.flow;
    }

    try {
      if (!await fse.exists(this._homeyComposePath)) await mkdirAsync(this._homeyComposePath);
    } catch (err) {
      Log.error('Error creating folder', this._homeyComposePath, err);
    }

    if (drivers && appJson.drivers) {
      drivers.forEach((driver) => {
        appJson.drivers.forEach(async (driverObject) => {
          if (driverObject.id === driver) {
            // Create a driver Flow JSON object.
            const driverFlowJson = {};

            if (appFlowJson) {
              FLOW_TYPES.forEach((type) => {
                if (!appFlowJson[type]) return; // Return when this type is not found in the JSON.

                appFlowJson[type].forEach((flowCard) => {
                  if (!flowCard.args) return; // Return when this flow card has no args.

                  let removeThisFlow = false;

                  flowCard.args.forEach((argument, index, flowCardArgs) => {
                    if (argument.type === 'device') {
                      const filteredArgument = querystring.parse(argument.filter);

                      // Check if the driver_id matches the current driver.
                      // If so, remove the arg  and add the Flowcard to the Flow
                      // JSON for this driver.
                      if (filteredArgument.driver_id === driver) {
                        flowCardArgs.splice(index, 1);
                        if (driverFlowJson[type]) {
                          driverFlowJson[type].push(flowCard);
                        } else {
                          driverFlowJson[type] = [flowCard];
                        }
                        removeThisFlow = true;
                      }
                    }
                  });

                  if (removeThisFlow) {
                    appFlowJson[type] = appFlowJson[type].filter((filterFlowCard) => {
                      return filterFlowCard !== flowCard;
                    });
                  }
                });
              });

              // If there are driver Flows write them to a JSON file.
              if (Object.keys(driverFlowJson).length > 0) {
                await writeFileAsync(
                  path.join(this.path, 'drivers', driver, 'driver.flow.compose.json'),
                  JSON.stringify(driverFlowJson, false, 2),
                );
                Log.success(`Created driver Flow compose file for ${driver}`);
              }
            }

            // Driver compose stuff
            delete driverObject.id; // id Should not be in the compose driver JSON.
            await writeFileAsync(
              path.join(this.path, 'drivers', driver, 'driver.compose.json'),
              JSON.stringify(driverObject, false, 2),
            );
            Log.success(`Created driver compose file for ${driver}`);
          }
        });
      });

      // Delete the driver section from the app JSON.
      delete appJson.drivers;
    }

    // Flow seperation
    if (appFlowJson) {
      try {
        if (!await fse.exists(path.join(this._homeyComposePath, 'flow'))) await mkdirAsync(path.join(this._homeyComposePath, 'flow'));
      } catch (err) {
        Log('Error creating folder', err);
      }

      FLOW_TYPES.forEach(async (type) => {
        if (!appFlowJson[type]) return; // Return when this type is not found in the JSON.

        try {
          if (!await fse.exists(path.join(this._homeyComposePath, 'flow', type))) await mkdirAsync(path.join(this._homeyComposePath, 'flow', type));
        } catch (err) {
          Log.error('Error creating folder', err);
        }

        // Loop over all flow cards
        appFlowJson[type].forEach(async (flowCard) => {
          try {
            await writeFileAsync(
              path.join(this._homeyComposePath, 'flow', type, `${flowCard.id}.json`),
              JSON.stringify(flowCard, false, 2),
            );
            Log.success(`Created Flow Card '${flowCard.id}.json'`);
          } catch (err) {
            Log.error('Error writing flow trigger JSON', err);
          }
        });
      });
    }

    // Handle custom capabilities
    if (appJson.capabilities) {
      // Create capabilities folder
      try {
        if (!await fse.exists(path.join(this._homeyComposePath, 'capabilities'))) await mkdirAsync(path.join(this._homeyComposePath, 'capabilities'));
      } catch (err) {
        Log('Error creating folder', err);
      }

      Object.entries(appJson.capabilities).forEach(async ([name, capability]) => {
        try {
          await writeFileAsync(
            path.join(this._homeyComposePath, 'capabilities', `${name.toLowerCase()}.json`),
            JSON.stringify(capability, false, 2),
          );
          Log.success(`Created Capability ${name}.json`);
        } catch (err) {
          Log.error('Error writing Capability json', err);
        }
      });

      delete appJson.capabilities;
    }

    if (appJson.discovery) {
      try {
        if (!await fse.exists(path.join(this._homeyComposePath, 'discovery'))) await mkdirAsync(path.join(this._homeyComposePath, 'discovery'));
      } catch (err) {
        Log.error('Error creating folder', err);
      }

      Object.entries(appJson.discovery).forEach(async ([name, strategy]) => {
        try {
          await writeFileAsync(
            path.join(this._homeyComposePath, 'discovery', `${name.toLowerCase()}.json`),
            JSON.stringify(strategy, false, 2),
          );
          Log.success(`Created Discovery ${name}.json`);
        } catch (err) {
          Log.error('Error writing Discovery json', err);
        }
      });

      // Remove the discovery section from the app JSON.
      delete appJson.discovery;
    }

    try {
      await writeFileAsync(
        path.join(this._homeyComposePath, 'app.json'),
        JSON.stringify(appJson, false, 2),
      );
    } catch (err) {
      Log.error('Error writing app.json', err);
    }

    Log.success(`Successfully migrated app ${appJson.id} to compose`);
  }

  async _askComposeMigration() {
    const answers = await inquirer.prompt(
      {
        type: 'confirm',
        name: 'switch_compose',
        message: 'Do you want to use Homey compose? It will split the app.json file into separate files for Drivers, Flow Cards and Discovery Strategies.',
        default: true,
      },
    );

    return answers.switch_compose;
  }

  async createDriver() {
    if (App.hasHomeyCompose({ appPath: this.path }) === false) {
      // Note: this checks that we are in a valid homey app folder
      App.getManifest({ appPath: this.path });

      if (await this._askComposeMigration()) {
        await this.migrateToCompose();
      } else {
        throw new Error('This command requires Homey compose, run `homey app compose` to migrate!');
      }
    }

    const manifest = App.getComposeManifest({ appPath: this.path });

    const { driverName } = await inquirer.prompt([
      {
        type: 'input',
        name: 'driverName',
        message: 'What is your Driver\'s Name?',
        validate: (input) => input.length > 0,
      },
    ]);

    const {
      driverId,
      driverClass,
      driverCapabilities,
    } = await inquirer.prompt([
      {
        type: 'input',
        name: 'driverId',
        message: 'What is your Driver\'s ID?',
        default: () => {
          let name = driverName;
          name = name.toLowerCase();
          name = name.replace(/ /g, '-');
          name = name.replace(INVALID_CHARACTERS, '');
          return name;
        },
        validate: (input) => {
          if (input.match(INVALID_CHARACTERS)) {
            throw new Error('Invalid characters: only use letters, numbers, minus (-) and underscore (_)');
          }

          if (fs.existsSync(path.join(this.path, 'drivers', input))) {
            throw new Error('Driver directory already exists!');
          }

          return true;
        },
      },
      {
        type: 'list',
        name: 'driverClass',
        message: 'What is your Driver\'s Device Class?',
        choices: () => {
          const classes = HomeyLibDevice.getClasses();
          return Object.keys(classes)
            .sort((a, b) => {
              a = classes[a];
              b = classes[b];
              return a.title.en.localeCompare(b.title.en);
            })
            .map((classId) => {
              return {
                name: classes[classId].title.en + colors.grey(` (${classId})`),
                value: classId,
              };
            });
        },
      },
      {
        type: 'checkbox',
        name: 'driverCapabilities',
        message: 'What are your Driver\'s Capabilities?',
        choices: () => {
          const capabilities = HomeyLibDevice.getCapabilities();
          return Object.keys(capabilities)
            .sort((a, b) => {
              a = capabilities[a];
              b = capabilities[b];
              return a.title.en.localeCompare(b.title.en);
            })
            .map((capabilityId) => {
              const capability = capabilities[capabilityId];
              return {
                name: capability.title.en + colors.grey(` (${capabilityId})`),
                value: capabilityId,
              };
            });
        },
      },
    ]);

    const driverWireless = await this.questionDriverWireless();

    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Seems good?',
        default: true,
      },
    ]);

    if (!confirm) return;

    const driverPath = path.join(this.path, 'drivers', driverId);
    await fse.ensureDir(driverPath);

    const driverJson = {
      name: { en: driverName },
      class: driverClass,
      capabilities: driverCapabilities,
      platforms: driverWireless.platforms || manifest.platforms,
      connectivity: driverWireless.connectivity,
      images: {
        small: '{{driverAssetsPath}}/images/small.png',
        large: '{{driverAssetsPath}}/images/large.png',
        xlarge: '{{driverAssetsPath}}/images/xlarge.png',
      },
      zwave: driverWireless.zwave,
      matter: driverWireless.matter,
    };

    await writeFileAsync(path.join(driverPath, 'driver.compose.json'), JSON.stringify(driverJson, false, 2));

    if (driverWireless.settings) {
      await writeFileAsync(path.join(driverPath, 'driver.settings.compose.json'), JSON.stringify(driverWireless.settings, false, 2));
    }

    const templatePath = path.join(__dirname, '..', 'assets', 'templates', 'app', 'drivers');

    // Matter devices do not need a device/driver file. As apps cannot add functionality to Matter devices.
    if (!driverWireless.matter) {
      if (App.usesModules({ appPath: this.path })) {
        await copyFileAsync(
          path.join(templatePath, 'driver.mjs'),
          path.join(driverPath, 'driver.js'),
        );
        await copyFileAsync(
          path.join(templatePath, 'device.mjs'),
          path.join(driverPath, 'device.js'),
        );
      } else {
        const fileExtension = App.usesTypeScript({ appPath: this.path }) ? '.ts' : '.js';
        await copyFileAsync(
          path.join(templatePath, `driver${fileExtension}`),
          path.join(driverPath, `driver${fileExtension}`),
        );
        await copyFileAsync(
          path.join(templatePath, `device${fileExtension}`),
          path.join(driverPath, `device${fileExtension}`),
        );
      }
    }

    await fse.ensureDir(path.join(driverPath, 'assets'));
    await fse.ensureDir(path.join(driverPath, 'assets', 'images'));
    Log.success(`Driver created in \`${driverPath}\``);

    switch (driverJson.connectivity[0]) {
      case 'infrared': {
        Log(`\n\tLearn more about Infrared app development at: ${colors.underline('https://apps.developer.homey.app/wireless/infrared')}\n`);
        break;
      }

      case 'rf433':
      case 'rf868': {
        Log(`\n\tLearn more about 433 Mhz/868 Mhz app development at: ${colors.underline('https://apps.developer.homey.app/wireless/rf-433mhz-868mhz')}\n`);
        break;
      }

      case 'ble': {
        Log(`\n\tLearn more about BLE app development at: ${colors.underline('https://apps.developer.homey.app/wireless/bluetooth')}\n`);
        break;
      }

      case 'zigbee': {
        Log(`\n\tLearn more about Zigbee app development at: ${colors.underline('https://apps.developer.homey.app/wireless/zigbee')}\n`);
        break;
      }

      case 'zwave': {
        Log(`\n\tLearn more about Z-Wave app development at: ${colors.underline('https://apps.developer.homey.app/wireless/z-wave')}\n`);
        break;
      }

      case 'cloud': {
        Log(`\n\tLearn more about OAuth2 app development at: ${colors.underline('https://apps.developer.homey.app/cloud/oauth2')}\n`);
        break;
      }

      case 'lan': {
        Log(`\n\tLearn more about LAN app development at: ${colors.underline('https://apps.developer.homey.app/wireless/wi-fi')}\n`);
        break;
      }

      case 'matter': {
        Log(`\n\tLearn more about Matter app development at: ${colors.underline('https://apps.developer.homey.app/wireless/matter')}\n`);
        break;
      }

      default: {
        break;
      }
    }
  }

  async questionDriverWireless() {
    const { wirelessType } = await inquirer.prompt([
      {
        type: 'list',
        name: 'wirelessType',
        message: 'What type of device is this?',
        choices: [
          { name: 'Other', value: 'other' },
          { name: 'LAN', value: 'lan' },
          { name: 'OAuth2', value: 'oauth2' }, // becomes `"connectivity": ["cloud"]`
          { name: 'Bluetooth Low Energy', value: 'ble' },
          { name: 'Infrared', value: 'infrared' },
          { name: '433 Mhz', value: 'rf433' },
          { name: '868 Mhz', value: 'rf868' },
          { name: 'Zigbee', value: 'zigbee' },
          { name: 'Z-Wave', value: 'zwave' },
          { name: 'Matter', value: 'matter' },
        ],
      },
    ]);

    switch (wirelessType) {
      case 'infrared': {
        const { shouldInstallRFDriver } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'shouldInstallRFDriver',
            message: 'Do you want to install homey-rfdriver?',
            default: true,
          },
        ]);

        if (shouldInstallRFDriver) {
          await NpmCommands.install(['homey-rfdriver'], { appPath: this.path });
        }

        return {
          connectivity: ['infrared'],
        };
      }

      case 'rf433': {
        const { shouldInstallRFDriver } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'shouldInstallRFDriver',
            message: 'Do you want to install homey-rfdriver?',
            default: true,
          },
        ]);

        if (shouldInstallRFDriver) {
          await NpmCommands.install(['homey-rfdriver'], { appPath: this.path });
        }

        return {
          connectivity: ['rf433'],
        };
      }

      case 'rf868': {
        const { shouldInstallRFDriver } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'shouldInstallRFDriver',
            message: 'Do you want to install homey-rfdriver?',
            default: true,
          },
        ]);

        if (shouldInstallRFDriver) {
          await NpmCommands.install(['homey-rfdriver'], { appPath: this.path });
        }

        return {
          platforms: ['local'],
          connectivity: ['rf868'],
        };
      }

      case 'zigbee': {
        const { shouldInstallZigbeeDriver } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'shouldInstallZigbeeDriver',
            message: 'Do you want to install homey-zigbeedriver?',
            default: true,
          },
        ]);

        if (shouldInstallZigbeeDriver) {
          await NpmCommands.install(['homey-zigbeedriver'], { appPath: this.path });
        }

        return {
          connectivity: ['zigbee'],
        };
      }

      case 'zwave': {
        const { shouldInstallZwaveDriver } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'shouldInstallZwaveDriver',
            message: 'Do you want to install homey-zwavedriver?',
            default: true,
          },
        ]);

        if (shouldInstallZwaveDriver) {
          await NpmCommands.install(['homey-zwavedriver'], { appPath: this.path });
        }

        const { zwave, settings } = await ZWave.autocompleteDriver();

        return {
          connectivity: ['zwave'],
          zwave,
          settings,
        };
      }

      case 'oauth2': {
        const { shouldInstallOAuth2App } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'shouldInstallOAuth2App',
            message: 'Do you want to install homey-oauth2app?',
            default: true,
          },
        ]);

        if (shouldInstallOAuth2App) {
          await NpmCommands.install(['homey-oauth2app'], { appPath: this.path });
        }

        return {
          connectivity: ['cloud'],
        };
      }

      case 'ble': {
        return {
          connectivity: ['ble'],
        };
      }

      case 'lan': {
        const { createDiscovery } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'createDiscovery',
            default: false,
            message: 'Do you want to create a Discovery strategy to find your device automatically in the LAN?',
          },
        ]);

        if (createDiscovery) {
          await this.createDiscoveryStrategy();
        }

        return {
          platforms: ['local'],
          connectivity: ['lan'],
        };
      }

      case 'matter': {
        const { isBridgedDevice } = await inquirer.prompt([{
          type: 'confirm',
          name: 'isBridgedDevice',
          default: false,
          message: 'Is this a Matter device connected through a Matter bridge?',
        }]);

        const driver = {
          platforms: ['local'],
          connectivity: ['matter'],
          matter: {},
        };

        if (isBridgedDevice) {
          const { deviceVendorId, deviceProductName } = await inquirer.prompt([
            {
              type: 'string',
              name: 'deviceVendorId',
              message: 'What is the Vendor ID of the bridged Matter device?',
              validate: (input) => {
                input = Number(input);

                if (Number.isNaN(input)) {
                  return 'Vendor ID must be a number';
                }

                // See spec 2.5.2, don't allow apps for test vendors
                // TODO: Maybe do allow test vendors, but don't allow test vendors to be published to the store?
                if (input < 0x0001 || input > 0xfff0) {
                  return 'Vendor ID must be between 0x0001 (1) and 0xfff0 (65520)';
                }

                return true;
              },
            },
            {
              type: 'string',
              name: 'deviceProductName',
              message: 'What is the product name of the bridged Matter device?',
              validate: (input) => {
                if (input.length === 0) {
                  return 'Product name cannot be empty';
                }

                if (input.length > 32) {
                  return 'Product name cannot be longer than 32 characters';
                }

                return true;
              },
            },
          ]);

          driver.matter.deviceVendorId = Number(deviceVendorId);
          driver.matter.deviceProductName = deviceProductName;
        }

        const { vendorId, productId } = await inquirer.prompt([
          {
            type: 'string',
            name: 'vendorId',
            message: `What is the Vendor ID of the Matter ${isBridgedDevice ? 'bridge' : 'device'}`,
            validate: (input) => {
              input = Number(input);

              if (Number.isNaN(input)) {
                return 'Vendor ID must be a number';
              }

              // See spec 2.5.2, don't allow apps for test vendors
              if (input < 0x0001 || input > 0xfff0) {
                return 'Vendor ID must be between 0x0001 (1) and 0xfff0 (65520)';
              }

              return true;
            },
          },
          {
            type: 'string',
            name: 'productId',
            message: `What is the product ID of the Matter ${isBridgedDevice ? 'bridge' : 'device'}?`,
            validate: (input) => {
              input = Number(input);

              if (Number.isNaN(input)) {
                return 'Vendor ID must be a number';
              }

              if (input < 0x0001 || input > 0xffff) {
                return 'Product ID must be between 0x0001 (1) and 0xffff (65535)';
              }

              return true;
            },
          },
        ]);

        driver.matter.vendorId = Number(vendorId);
        driver.matter.productId = Number(productId);

        return driver;
      }

      default: {
        return {
          connectivity: [],
        };
      }
    }
  }

  async changeDriverCapabilities() {
    if (App.hasHomeyCompose({ appPath: this.path }) === false) {
      if (await this._askComposeMigration()) {
        await this.migrateToCompose();
      } else {
        throw new Error('This command requires Homey compose, run `homey app compose` to migrate!');
      }
    }

    const drivers = await this._getDrivers();

    const selectedDriverAnswer = await inquirer.prompt([
      {
        type: 'list',
        name: 'driverId',
        message: 'For which driver do you want to change the capabilities?',
        choices: () => {
          return drivers;
        },
      },
    ]);

    const driverJsonPath = path.join(this.path, 'drivers', selectedDriverAnswer.driverId, 'driver.compose.json');

    let driverJson;
    try {
      driverJson = await readFileAsync(driverJsonPath, 'utf8');
      driverJson = JSON.parse(driverJson);
    } catch (err) {
      if (err.code === 'ENOENT') {
        throw new Error(`Could not find a valid driver.compose JSON at \`${driverJsonPath}\``);
      }

      throw new Error(`Error in \`driver.compose.json.json\`:\n${err}`);
    }

    Log(`Current Driver capabilities: ${driverJson.capabilities}`);

    const capabilitesAnswers = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'capabilities',
        message: 'What are your Driver\'s Capabilities?',
        choices: () => {
          const capabilities = HomeyLibDevice.getCapabilities();
          return Object.keys(capabilities)
            .sort((a, b) => {
              a = capabilities[a];
              b = capabilities[b];
              return a.title.en.localeCompare(b.title.en);
            })
            .map((capabilityId) => {
              const capability = capabilities[capabilityId];
              return {
                name: capability.title.en + colors.grey(` (${capabilityId})`),
                value: capabilityId,
              };
            });
        },
        default: driverJson.capabilities,
      },
    ]);

    // Since we've used the existing capabilities as a default and therefore
    // loaded them into the array,
    // we can just overwrite the capabilities array in the JSON
    driverJson.capabilities = capabilitesAnswers.capabilities;

    await writeFileAsync(driverJsonPath, JSON.stringify(driverJson, false, 2));

    Log.success(`Driver capabilities updated for \`${driverJson.id}\``);
  }

  async createDriverFlow() {
    if (App.hasHomeyCompose({ appPath: this.path }) === false) {
      // Note: this checks that we are in a valid homey app folder
      App.getManifest({ appPath: this.path });

      if (await this._askComposeMigration()) {
        await this.migrateToCompose();
      } else {
        throw new Error('This command requires Homey compose, run `homey app compose` to migrate!');
      }
    }

    const drivers = await this._getDrivers();

    const driverFlowAnswers = await inquirer.prompt([
      {
        type: 'list',
        name: 'driverId',
        message: 'For which driver do you want to create a Flow?',
        choices: () => {
          return drivers;
        },
      },
    ]);
    const chosenDriver = driverFlowAnswers.driverId;

    const flowJson = await this.createFlowJson();
    if (!flowJson) return;

    const flowPath = path.join(this.path, 'drivers', chosenDriver, 'driver.flow.compose.json');

    let driverFlowJson;
    try {
      driverFlowJson = await readFileAsync(flowPath, 'utf8');
      driverFlowJson = JSON.parse(driverFlowJson);
    } catch (err) {
      if (err.code === 'ENOENT') {
        driverFlowJson = {}; // File not found so init empty JSON
      } else {
        throw new Error(`Error in \`driver.flow.compose.json.\`:\n${err}`);
      }
    }

    // Check if the chosen flow type entry is available
    driverFlowJson[flowJson.type] = driverFlowJson[flowJson.type] || [];
    driverFlowJson[flowJson.type].push({ id: flowJson.id, ...flowJson.manifest });

    await writeFileAsync(flowPath, JSON.stringify(driverFlowJson, false, 2));

    Log.success(`Driver Flow created in \`${flowPath}\``);
  }

  async createFlowJson() {
    const { flowType } = await inquirer.prompt([
      {
        type: 'list',
        name: 'flowType',
        message: 'What is the type of your Flow card?',
        choices: [
          { name: 'Trigger (When)', value: 'triggers' },
          { name: 'Condition (And)', value: 'conditions' },
          { name: 'Action (Then)', value: 'actions' },
        ],
      },
    ]);

    const { flowTitle, flowHint } = await inquirer.prompt([
      {
        type: 'input',
        name: 'flowTitle',
        message: 'What is the title of your Flow Card?',
        validate: (input) => input.length > 0,
      },
      {
        type: 'input',
        name: 'flowHint',
        message: 'What is the hint for your Flow Card? (optional)',
      },
    ]);

    const { flowId } = await inquirer.prompt([
      {
        type: 'input',
        name: 'flowId',
        message: 'What is your Flow Card\'s ID?',
        default: () => {
          let name = flowTitle;
          name = name.toLowerCase();
          name = name.replace(/ /g, '-');
          name = name.replace(INVALID_CHARACTERS, '');
          return name;
        },
        validate: (input) => {
          if (input.match(INVALID_CHARACTERS)) {
            throw new Error('Invalid characters: only use letters, numbers, minus (-) and underscore (_)');
          }

          // Check if the flow entry already exists in the .homeycompose/flow folder
          if (fs.existsSync(path.join(this.path, '.homeycompose', 'flow', flowType, `${input}.json`))) {
            throw new Error('Flow already exists!');
          }

          return true;
        },
      },
    ]);

    const flowArguments = await App._questionFlowArguments();

    const flowTokens = flowType === 'triggers'
      ? await App._questionFlowTokens()
      : [];

    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Seems good?',
        default: true,
      },
    ]);

    if (!confirm) return undefined;

    const flowManifest = {
      title: { en: flowTitle },
    };

    if (flowHint) {
      flowManifest.hint = { en: flowHint };
    }

    if (flowArguments.length) {
      flowManifest.args = flowArguments;
    }

    if (flowTokens.length) {
      flowManifest.tokens = flowTokens;
    }

    return {
      id: flowId,
      type: flowType,
      manifest: flowManifest,
    };
  }

  static async _questionFlowArguments() {
    const flowCardArguments = [];

    let { addArgument } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'addArgument',
        message: 'Do you want to use arguments for this Flow Card?',
        default: false,
      },
    ]);

    while (addArgument) {
      // Create an empty object
      const flowCardArgument = {};

      const { argumentType, argumentName } = await inquirer.prompt([
        {
          type: 'list',
          name: 'argumentType',
          message: 'What is the type of the argument?',
          choices: [
            { name: 'Text', value: 'text' },
            { name: 'Number', value: 'number' },
            { name: 'Autocomplete', value: 'autocomplete' },
            { name: 'Range', value: 'range' },
            { name: 'Date', value: 'date' },
            { name: 'Time', value: 'time' },
            { name: 'Dropdown', value: 'dropdown' },
            { name: 'Multiselect', value: 'multiselect' },
            { name: 'Color', value: 'color' },
            { name: 'Droptoken', value: 'droptoken' },
          ],
        },
        {
          type: 'input',
          name: 'argumentName',
          message: 'What is the name of your argument?',
          validate: async (input) => {
            if (input.match(INVALID_CHARACTERS)) {
              throw new Error('Invalid characters: only use letters, numbers, minus (-) and underscore (_)');
            }

            return true;
          },
        },
      ]);

      flowCardArgument.type = argumentType;
      flowCardArgument.name = argumentName;

      if (['text', 'autocomplete', 'number', 'date', 'time', 'device'].includes(flowCardArgument.type)) {
        const { argumentPlaceholder } = await inquirer.prompt([
          {
            type: 'input',
            name: 'argumentPlaceholder',
            message: 'Enter the placeholder for the argument',
            validate: (input) => input.length > 0,
          },
        ]);

        flowCardArgument.placeholder = { en: argumentPlaceholder };
      }

      if (['number', 'range'].includes(flowCardArgument.type)) {
        const { argumentMin, argumentMax, argumentStep } = await inquirer.prompt([
          {
            type: 'input',
            name: 'argumentMin',
            message: 'What is the minimum value?',
            default: 0,
            validate: (input) => !Number.isNaN(Number(input)),
          },
          {
            type: 'input',
            name: 'argumentMax',
            message: 'What is the maximum value?',
            default: 100,
            validate: (input) => !Number.isNaN(Number(input)),
          },
          {
            type: 'input',
            name: 'argumentStep',
            message: 'What is the step size?',
            default: 1,
            validate: (input) => !Number.isNaN(Number(input)),
          },
        ]);

        flowCardArgument.min = Number(argumentMin);
        flowCardArgument.max = Number(argumentMax);
        flowCardArgument.step = Number(argumentStep);
      }

      if (flowCardArgument.type === 'dropdown') {
        let { confirmDropdownValues } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirmDropdownValues',
            message: 'Do you want to add values to the dropdown?',
            default: false,
          },
        ]);

        const dropdownValues = [];

        while (confirmDropdownValues) {
          const { title } = await inquirer.prompt([
            {
              type: 'input',
              name: 'title',
              message: 'What is the title of the value?',
              validate: (input) => input.length > 0,
            },
          ]);
          const { id } = await inquirer.prompt([
            {
              type: 'input',
              name: 'id',
              message: 'What is the ID of the value?',
              default: () => {
                let name = title;
                name = name.toLowerCase();
                name = name.replace(/ /g, '-');
                name = name.replace(INVALID_CHARACTERS, '');
                return name;
              },
              validate: (input) => input.length > 0,
            },
          ]);

          dropdownValues.push({ id, label: { en: title } });

          const { confirmMoreDropdownValues } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'confirmMoreDropdownValues',
              message: 'Add another value to the dropdown?',
              default: false,
            },
          ]);

          confirmDropdownValues = confirmMoreDropdownValues;
        }

        flowCardArgument.values = dropdownValues;
      }

      const { addAnotherArgument } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'addAnotherArgument',
          message: 'Add another argument?',
          default: false,
        },
      ]);
      flowCardArguments.push(flowCardArgument);

      addArgument = addAnotherArgument;
    }

    return flowCardArguments;
  }

  static async _questionFlowTokens() {
    const flowTokens = [];

    let { addToken } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'addToken',
        message: 'Do you want to use tokens for this Flow Card?',
        default: false,
      },
    ]);

    while (addToken) {
      const { tokenTitle, tokenExample } = await inquirer.prompt([
        {
          type: 'input',
          name: 'tokenTitle',
          message: 'Enter the user title of your token',
          validate: (input) => input.length > 0,
        },
        {
          type: 'input',
          name: 'tokenExample',
          message: 'Give a brief example of what your token can provide',
          validate: (input) => input.length > 0,
        },
      ]);

      const { tokenType, tokenName } = await inquirer.prompt([
        {
          type: 'list',
          name: 'tokenType',
          message: 'What is the type of your token?',
          choices: [
            { name: 'Text', value: 'string' },
            { name: 'Number', value: 'number' },
            { name: 'Boolean', value: 'boolean' },
            { name: 'Image', value: 'image' },
          ],
        },
        {
          type: 'input',
          name: 'tokenName',
          message: 'What is your token\'s ID?',
          default: () => {
            let name = tokenTitle;
            name = name.toLowerCase();
            name = name.replace(/ /g, '-');
            name = name.replace(INVALID_CHARACTERS, '');
            return name;
          },
          validate: async (input) => {
            if (input.match(INVALID_CHARACTERS)) {
              throw new Error('Invalid characters: only use letters, numbers, minus (-) and underscore (_)');
            }

            return true;
          },
        },
      ]);

      flowTokens.push({
        type: tokenType,
        name: tokenName,
        title: { en: tokenTitle },
        example: { en: tokenExample },
      });

      const { addAnotherToken } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'addAnotherToken',
          message: 'Add more tokens?',
          default: false,
        },
      ]);

      addToken = addAnotherToken;
    }

    return flowTokens;
  }

  async createFlow() {
    if (App.hasHomeyCompose({ appPath: this.path }) === false) {
      // Note: this checks that we are in a valid homey app folder
      App.getManifest({ appPath: this.path });

      if (await this._askComposeMigration()) {
        await this.migrateToCompose();
      } else {
        throw new Error('This command requires Homey compose, run `homey app compose` to migrate!');
      }
    }

    const flowJson = await this.createFlowJson();
    if (!flowJson) return;

    const flowFolder = path.join(this.path, '.homeycompose', 'flow');
    const flowPath = path.join(this.path, '.homeycompose', 'flow', flowJson.type);

    // Check if the folder already exists, if not create it
    if (fs.existsSync(flowFolder) === false) await mkdirAsync(flowFolder);
    if (fs.existsSync(flowPath) === false) await mkdirAsync(flowPath);

    await writeFileAsync(path.join(flowPath, `${flowJson.id}.json`), JSON.stringify(flowJson.manifest, false, 2));

    Log.success(`Flow created in \`${flowPath}\``);
  }

  async createWidget() {
    if (App.hasHomeyCompose({ appPath: this.path }) === false) {
      // Note: this checks that we are in a valid homey app folder
      App.getManifest({ appPath: this.path });

      if (await this._askComposeMigration()) {
        await this.migrateToCompose();
      } else {
        throw new Error('This command requires Homey compose, run `homey app compose` to migrate!');
      }
    }

    const { widgetName } = await inquirer.prompt([
      {
        type: 'input',
        name: 'widgetName',
        message: 'What is your Widgets\'s Name?',
        validate: (input) => input.length > 0,
      },
    ]);

    const {
      widgetId,
    } = await inquirer.prompt([
      {
        type: 'input',
        name: 'widgetId',
        message: 'What is your Widgets\'s ID?',
        default: () => {
          let name = widgetName;
          name = name.toLowerCase();
          name = name.replace(/ /g, '-');
          name = name.replace(INVALID_CHARACTERS, '');
          return name;
        },
        validate: (input) => {
          if (input.match(INVALID_CHARACTERS)) {
            throw new Error('Invalid characters: only use letters, numbers, minus (-) and underscore (_)');
          }

          if (fs.existsSync(path.join(this.path, 'widgets', input))) {
            throw new Error('Widget directory already exists!');
          }

          return true;
        },
      },
    ]);

    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Seems good?',
      },
    ]);

    if (!confirm) return;

    const widgetPath = path.join(this.path, 'widgets', widgetId);
    await fse.ensureDir(widgetPath);

    const widgetJson = {
      name: { en: widgetName },
      height: 188,
      settings: [],
      api: {
        getSomething: {
          method: 'GET',
          path: '/',
        },
        addSomething: {
          method: 'POST',
          path: '/',
        },
        updateSomething: {
          method: 'PUT',
          path: '/:id',
        },
        deleteSomething: {
          method: 'DELETE',
          path: '/:id',
        },
      },
    };

    await writeFileAsync(path.join(widgetPath, 'widget.compose.json'), JSON.stringify(widgetJson, false, 2));

    const templatePath = path.join(__dirname, '..', 'assets', 'templates', 'app', 'widgets');
    await fse.ensureDir(path.join(widgetPath, 'public'));
    await copyFileAsync(path.join(templatePath, 'public/index.html'), path.join(widgetPath, 'public/index.html'));
    await copyFileAsync(path.join(templatePath, 'public/homey-logo.png'), path.join(widgetPath, 'public/homey-logo.png'));
    await copyFileAsync(path.join(templatePath, 'api.js'), path.join(widgetPath, 'api.js'));
    await copyFileAsync(path.join(templatePath, 'preview-dark.png'), path.join(widgetPath, 'preview-dark.png'));
    await copyFileAsync(path.join(templatePath, 'preview-light.png'), path.join(widgetPath, 'preview-light.png'));

    Log.success(`Widget created in \`${widgetPath}\``);
  }

  async createDiscoveryStrategy() {
    if (App.hasHomeyCompose({ appPath: this.path }) === false) {
      // Note: this checks that we are in a valid homey app folder
      App.getManifest({ appPath: this.path });

      if (await this._askComposeMigration()) {
        await this.migrateToCompose();
      } else {
        throw new Error('This command requires Homey compose, run `homey app compose` to migrate!');
      }
    }

    const discoveryPath = path.join(this.path, '.homeycompose', 'discovery');
    const discoveryBase = await inquirer.prompt([
      {
        type: 'input',
        name: 'title',
        message: 'What is your Discovery strategy ID?',
        validate: async (input) => {
          input.replace(INVALID_CHARACTERS, '');

          if (await fse.exists(path.join(discoveryPath, `${input}.json`))) {
            throw new Error('Discovery strategy already exists!');
          }

          return true;
        },
      },
      {
        type: 'list',
        name: 'type',
        message: 'What is the type of your Discovery strategy?',
        choices: () => {
          return [
            {
              name: 'mDNS-SD',
              value: 'mdns-sd',
            },
            {
              name: 'SSDP',
              value: 'ssdp',
            },
            {
              name: 'MAC Address range',
              value: 'mac',
            },
          ];
        },
      },
    ]);

    // Create new questions based on the Discovery type selected
    let discoveryJson;
    let answers;

    // All added MAC addresses from the addMacAddress recursive function
    // will be stored in this array.
    const macAddresses = [];

    // Recursive function to input, parse and store MAC addresses.
    async function addMacAddress() {
      answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'mac',
          message: 'Enter a full MAC address or the first three bytes',
          validate: async (input) => {
            if (input.length === 17 && input.search(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/) === 0) return true;
            if (input.length === 8 && input.search(/^([0-9A-Fa-f]{2}[:-]){2}([0-9A-Fa-f]{2})$/) === 0) return true;

            return false;
          },
        },
        {
          type: 'confirm',
          name: 'more',
          message: 'Add more MAC addresses?',
          default: false,
        },
      ]);

      // Parse and store the address
      macAddresses.push(Util.parseMacToDecArray(answers.mac));

      // If the user wants to add more addresses, call this function again.
      if (answers.more) {
        await addMacAddress();
      }
    }

    switch (discoveryBase.type) {
      case 'mdns-sd':
        answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'name',
            message: 'What is the name of the mDNS query?',
            validate: (input) => {
              return input.length > 0;
            },
          },
          {
            type: 'list',
            name: 'protocol',
            message: 'What is the protocol of your mDNS query?',
            choices: ['tcp', 'udp'],
          },
          {
            type: 'input',
            name: 'id',
            message: 'What is the indentifier to indentify the device? For example, \'name\' or \'txt.id\'',
            validate: (input) => {
              return input.length > 0;
            },
          },
        ]);

        if (!answers.id.startsWith('{{') && !answers.id.endsWith('}}')) {
          answers.id = `{{${answers.id}}}`;
        }

        discoveryJson = {
          type: 'mdns-sd',
          'mdns-sd': {
            name: answers.name,
            protocol: answers.protocol,
          },
          id: answers.id,
        };

        break;
      case 'ssdp':
        answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'search',
            message: 'What is the search scheme?',
            validate: (input) => {
              return input.length > 0;
            },
          },
          {
            type: 'input',
            name: 'id',
            message: 'What is the indentifier to indentify the device? For example, \'name\' or \'headers.usn\'',
            validate: (input) => {
              if (input.match(INVALID_CHARACTERS)) {
                throw new Error('Invalid characters: only use letters, numbers, minus (-) and underscore (_)');
              }
              return true;
            },
          },
        ]);

        discoveryJson = {
          type: 'ssdp',
          ssdp: {
            name: answers.name,
            search: answers.search,
          },
          id: `{{${answers.id}}}`,
        };

        break;
      case 'mac': {
        await addMacAddress();

        if (macAddresses.length < 1) return;

        discoveryJson = {
          type: 'mac',
          mac: {
            manufacturer: macAddresses,
          },
        };

        break;
      }
      default: {
        break;
      }
    }

    const confirmCreate = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Seems good?',
        default: true,
      },
    ]);

    if (!confirmCreate.confirm) return;

    // Check if the folder already exists, if not create it
    if (!await fse.exists(discoveryPath)) await mkdirAsync(discoveryPath);

    await writeFileAsync(path.join(discoveryPath, `${discoveryBase.title}.json`), JSON.stringify(discoveryJson, false, 2));

    Log.success(`Discovery strategy created in \`${discoveryPath}\``);
  }

  static async create({ appPath: cwd }) {
    const stat = await statAsync(cwd);
    if (!stat.isDirectory()) {
      throw new Error('Invalid path, must be a directory');
    }

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'appName',
        message: 'What is your app\'s name?',
        default: 'My App',
        validate: (input) => input.length > 0,
      },
      {
        type: 'input',
        name: 'appDescription',
        message: 'What is your app\'s description?',
        default: 'Adds support for MyBrand devices.',
        validate: (input) => input.length > 0,
      },
      {
        type: 'input',
        name: 'id',
        message: 'What is your app\'s unique ID?',
        default: 'com.company.myapp',
        validate: (input) => {
          return HomeyLibApp.isValidId(input);
        },
      },
      {
        type: 'checkbox',
        name: 'platforms',
        message: 'What platforms will your app support?',
        choices: [
          { name: 'Homey Pro', value: 'local', checked: true },
          { name: 'Homey Cloud', value: 'cloud' },
        ],
      },
      {
        type: 'list',
        name: 'category',
        message: 'What is your app\'s category?',
        choices: HomeyLibApp.getCategories(),
      },
      {
        type: 'confirm',
        name: 'typescript',
        message: 'Use TypeScript?',
        default: false,
      },
      {
        type: 'confirm',
        name: 'eslint',
        message: 'Use ESLint?',
        default: true,
      },
      {
        type: 'confirm',
        name: 'github-workflows',
        message: 'Use GitHub workflows to validate, update version, and publish your app?',
        default: false,
      },
      {
        type: 'confirm',
        name: 'license',
        message: 'Use standard license for Homey Apps (GPL3)?',
        default: true,
      },
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Seems good?',
        default: true,
      },
    ]);

    if (!answers.confirm) return;

    const appPath = path.join(cwd, answers.id);
    // Create the app folder (and fail if it already exists)
    await mkdirAsync(appPath);

    // Create package.json first so we can use NpmCommands
    const packageJson = {
      name: answers.id,
      version: '1.0.0',
      main: 'app.js',
      scripts: {
        build: undefined,
        lint: answers.eslint ? 'eslint --ext .js,.ts --ignore-path .gitignore .' : undefined,
      },
    };

    if (answers.typescript) {
      delete packageJson.main;
      packageJson.scripts.build = 'tsc';
    }

    await writeFileAsync(path.join(appPath, 'package.json'), JSON.stringify(packageJson, false, 2));

    const appJson = {
      id: answers.id,
      version: '1.0.0',
      compatibility: '>=12.4.0',
      sdk: 3,
      platforms: answers.platforms,
      name: { en: answers.appName },
      description: { en: answers.appDescription },
      category: [answers.category],
      permissions: [],
      images: {
        small: '/assets/images/small.png',
        large: '/assets/images/large.png',
        xlarge: '/assets/images/xlarge.png',
      },
    };

    try {
      const profile = await AthomApi.getProfile();
      appJson.author = {
        name: `${profile.firstname} ${profile.lastname}`,
        email: profile.email,
      };
    } catch (err) { }

    // make dirs
    const dirs = [
      'locales',
      'drivers',
      'assets',
      path.join('assets', 'images'),
    ];

    // Append the homeycompose dir
    dirs.push('.homeycompose');
    dirs.push(path.join('.homeycompose', 'flow'));
    dirs.push(path.join('.homeycompose', 'flow', 'triggers'));
    dirs.push(path.join('.homeycompose', 'flow', 'conditions'));
    dirs.push(path.join('.homeycompose', 'flow', 'actions'));
    dirs.push(path.join('.homeycompose', 'drivers'));
    dirs.push(path.join('.homeycompose', 'drivers', 'templates'));
    dirs.push(path.join('.homeycompose', 'drivers', 'settings'));
    dirs.push(path.join('.homeycompose', 'capabilities'));
    dirs.push(path.join('.homeycompose', 'discovery'));
    dirs.push(path.join('.homeycompose', 'locales'));
    dirs.push(path.join('.homeycompose', 'screensavers'));
    dirs.push(path.join('.homeycompose', 'signals'));
    dirs.push(path.join('.homeycompose', 'signals', '433'));
    dirs.push(path.join('.homeycompose', 'signals', '868'));
    dirs.push(path.join('.homeycompose', 'signals', 'ir'));

    for (let i = 0; i < dirs.length; i++) {
      const dir = dirs[i];
      try {
        await mkdirAsync(path.join(appPath, dir));
      } catch (err) {
        Log(err);
      }
    }

    if (answers.typescript) {
      await NpmCommands.installDev(['typescript'], { appPath });
    }

    if (answers.eslint) {
      await NpmCommands.installDev([
        'eslint@^7.32.0',
        'eslint-config-athom',
      ], { appPath });

      const eslintConfig = {
        extends: 'athom/homey-app',
      };
      await writeFileAsync(path.join(appPath, '.eslintrc.json'), JSON.stringify(eslintConfig, false, 2));
    }

    if (answers['github-workflows']) {
      await App.addGitHubWorkflows({ appPath });
    }

    await writeFileAsync(path.join(appPath, '.homeycompose', 'app.json'), JSON.stringify(appJson, false, 2));

    const generatedAppManifestWarning = {
      _comment: 'This file is generated. Please edit .homeycompose/app.json instead.',
    };
    await writeFileAsync(path.join(appPath, 'app.json'), JSON.stringify(generatedAppManifestWarning, false, 2));

    await writeFileAsync(path.join(appPath, 'locales', 'en.json'), JSON.stringify({}, false, 2));
    await writeFileAsync(path.join(appPath, 'README.txt'), `${appJson.description.en}\n`);

    // i18n pre-support
    // TODO check if this works after creating i18n inquirer stuff
    if (appJson.description.nl) {
      await writeFileAsync(path.join(appPath, 'README.nl.txt'), `${appJson.description.nl}\n`);
    }

    // copy files
    const templatePath = path.join(__dirname, '..', 'assets', 'templates', 'app');
    const files = [
      path.join('assets', 'icon.svg'),
    ];

    // eslint-disable-next-line no-constant-condition
    if (false) { // Add question.
      await copyFileAsync(path.join(templatePath, 'app.mjs'), path.join(appPath, 'app.js'));
    } else {
      files.push(answers.typescript ? 'app.ts' : packageJson.main);
    }

    if (answers.license) {
      files.push('LICENSE');
      files.push('CODE_OF_CONDUCT.md');
      files.push('CONTRIBUTING.md');
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        await copyFileAsync(path.join(templatePath, file), path.join(appPath, file));
      } catch (err) {
        Log(err);
      }
    }

    await App.addTypes({ appPath, useTs: answers.typescript });

    const gitIgnore = `/env.json
/node_modules/
/.homeybuild/`;

    await writeFileAsync(path.join(appPath, '.gitignore'), gitIgnore.toString());
    await writeFileAsync(path.join(appPath, '.homeychangelog.json'), JSON.stringify({
      [appJson.version]: {
        en: 'First version!',
      },
    }, false, 2));

    Log.success(`App created in \`${appPath}\``);
    Log(`\nLearn more about Homey app development at: ${colors.underline('https://apps.developer.homey.app')}\n`);
  }

  static async addTypes({ appPath, useTs }) {
    if (useTs) {
      await NpmCommands.installDev([
        '@types/homey@npm:homey-apps-sdk-v3-types',
        '@types/node',
        '@tsconfig/node16',
      ], { appPath });

      const tsConfigJson = {
        extends: '@tsconfig/node16/tsconfig.json',
        compilerOptions: {
          allowJs: true,
          outDir: '.homeybuild/',
        },
      };

      await writeFileAsync(path.join(appPath, 'tsconfig.json'), JSON.stringify(tsConfigJson, false, 2));
    } else {
      await NpmCommands.installDev([
        '@types/homey@npm:homey-apps-sdk-v3-types',
      ], { appPath });
    }
  }

  static async addGitHubWorkflows({ appPath }) {
    const workflowsPath = path.join(__dirname, '..', 'assets', 'templates', 'app', '.github', 'workflows');
    const targetPath = path.join(appPath, '.github', 'workflows');
    const workflows = ['homey-app-publish.yml', 'homey-app-validate.yml', 'homey-app-version.yml'];
    await fse.ensureDir(targetPath);
    for (const file of workflows) {
      await copyFileAsync(
        path.join(workflowsPath, file),
        path.join(targetPath, file),
      );
    }
    Log.success(`Added GitHub Workflows: ${workflows.join(', ')}.`);
    Log.info('Make sure to add the HOMEY_PAT secret to your GitHub repository, the personal access token can be found at https://tools.developer.homey.app/me.');
  }

  static hasHomeyCompose({ appPath }) {
    const hasComposeFolder = fs.existsSync(path.join(appPath, '.homeycompose'));

    if (
      hasComposeFolder
      && !this.__warnedAboutMissingHomeyComposeManifest
      && !fs.existsSync(path.join(appPath, '.homeycompose/app.json'))
    ) {
      Log.warning('Warning: Could not find a Homey Compose app.json manifest!');
      Log.warning('Using the generated app.json in the root of your app is supported for now,');
      Log.warning('but it is recommended to move your manifest to .homeycompose/app.json');
      this.__warnedAboutMissingHomeyComposeManifest = true;
    }

    return hasComposeFolder;
  }

  static getManifest({ appPath }) {
    try {
      const manifestPath = path.join(appPath, 'app.json');
      const manifest = fse.readJSONSync(manifestPath);

      if (
        Object.prototype.hasOwnProperty.call(manifest, 'id') === false
        || Object.prototype.hasOwnProperty.call(manifest, 'version') === false
        || Object.prototype.hasOwnProperty.call(manifest, 'compatibility') === false
        || Object.prototype.hasOwnProperty.call(manifest, 'name') === false) {
        throw new Error('Found \'app.json\' file does not contain the required properties for a valid Homey app!');
      }

      return manifest;
    } catch (error) {
      throw new Error(`Could not find a valid Homey App at '${appPath}':\n${error.message}`);
    }
  }

  static getComposeManifest({ appPath }) {
    return App.getManifest({ appPath: path.join(appPath, '.homeycompose') });
  }

}

module.exports = App;
