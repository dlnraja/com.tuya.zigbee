'use strict';

const fs = require('fs');
const fsPromises = require('fs/promises');
const path = require('path');
const zlib = require('zlib');
const stream = require('stream');
const { promisify } = require('util');
const { arch } = require('node:process');

const colors = require('colors');
const tmp = require('tmp-promise');
const tar = require('tar-fs');
const ignoreWalk = require('ignore-walk');
const fse = require('fs-extra');
const filesize = require('filesize');

const inquirer = require('inquirer');
const TOML = require('smol-toml');
const HomeyLibApp = require('homey-lib').App;
const AthomApi = require('../services/AthomApi');
const Log = require('./Log');
const HomeyCompose = require('./HomeyCompose');
const DockerHelper = require('./DockerHelper');
const App = require('./App');
const StacklessError = require('./StacklessError');

const statAsync = promisify(fs.stat);
const mkdirAsync = promisify(fs.mkdir);
const writeFileAsync = promisify(fs.writeFile);
const copyFileAsync = promisify(fs.copyFile);
const pipeline = promisify(stream.pipeline);

const PYTHON_PACKAGES_FOLDER = 'python_packages';
const INVALID_PYTHON_MODULE_CHARACTERS = /[^a-z0-9_]/g;
const BUILDER_IMAGES = {
  arm64: 'ghcr.io/athombv/python-homey-app-builder-arm64:latest',
  amd64: 'ghcr.io/athombv/python-homey-app-builder-amd64:latest',
};

class AppPython extends App {
  static async checkHomeyCompatibility(homey) {
    if (!(homey.__properties.apiVersion === 3)) {
      throw new StacklessError('Python apps are currently not supported on Homey Pro (2016—2019)');
    }
  }

  static usesTypeScript({ appPath }) {
    throw new Error('Method should not be called for Python: "App.usesTypeScript"');
  }

  static usesModules({ appPath }) {
    throw new Error('Method should not be called for Python: "App.usesModules"');
  }

  static async transpileToTypescript({ appPath }) {
    throw new Error('Method should not be called for Python: "App.transpileToTypescript".');
  }

  async build({ findLinks, dockerSocketPath } = {}) {
    Log.success('Building app...');
    await this.preprocess({ findLinks, dockerSocketPath });

    const valid = await this._validate();
    if (valid !== true)
      throw new Error('The app is not valid, please fix the validation issues first.');

    Log.success('App built successfully');
  }

  async run({
    clean = false,
    remote = false,
    skipBuild = false,
    linkModules = '',
    network,
    dockerSocketPath,
    findLinks,
  } = {}) {
    const homey = await AthomApi.getActiveHomey();

    await AppPython.checkHomeyCompatibility(homey);

    if (remote) {
      return this.runRemote({
        homey,
        clean,
        skipBuild,
        dockerSocketPath,
      });
    }

    return this.runDocker({
      homey,
      clean,
      skipBuild,
      linkModules,
      network,
      dockerSocketPath,
      findLinks,
    });
  }

  async buildForLocalRunner(skipBuild, { findLinks, dockerSocketPath } = {}) {
    if (skipBuild) {
      Log(colors.yellow("\n⚠ Can't skip build step for Python!\n"));
    }
    await this.preprocess({
      platforms: [AppPython.getLocalPlatform()],
      dockerSocketPath,
      findLinks,
    });
  }

  static collectRunnerEnv() {
    return {
      HOMEY_APP_RUNNER_DEVMODE: process.env.HOMEY_APP_RUNNER_DEVMODE === '1',
      HOMEY_APP_RUNNER_PATH: process.env.HOMEY_APP_RUNNER_PATH_PYTHON, // e.g. /Users/username/Git/homey-app-runner/src
      HOMEY_APP_RUNNER_CMD: ['bash', 'entrypoint.sh'],
      HOMEY_APP_RUNNER_ID: process.env.HOMEY_APP_RUNNER_ID_PYTHON || 'ghcr.io/athombv/python-homey-app-runner:latest',
      HOMEY_APP_RUNNER_SDK_PATH: process.env.HOMEY_APP_RUNNER_SDK_PATH_PYTHON, // e.g. /Users/username/Git/python-homey-sdk-v3/dist
    };
  }

  async startRunnerContainer(
    sessionId,
    manifest,
    env,
    serverPort,
    inspectPort,
    network,
    homey,
    tmpDir,
    userdataDir,
    linkModules,
    docker,
  ) {
    const {
      HOMEY_APP_RUNNER_DEVMODE,
      HOMEY_APP_RUNNER_PATH,
      HOMEY_APP_RUNNER_CMD,
      HOMEY_APP_RUNNER_ID,
      HOMEY_APP_RUNNER_SDK_PATH,
    } = AppPython.collectRunnerEnv(inspectPort);
    // Download Image (if there is no local override)
    if (!process.env.HOMEY_APP_RUNNER_ID_PYTHON) {
      await DockerHelper.imagePullIfNeeded(HOMEY_APP_RUNNER_ID, AppPython.getLocalPlatform());
    }

    const host = await DockerHelper.determineHost();

    const containerEnv = [
      'APP_PATH=/app',
      `APP_ENV=${JSON.stringify(env)}`,
      `SERVER=ws://${host}:${serverPort}`,
      'DEBUG=1',
    ];

    if (HOMEY_APP_RUNNER_DEVMODE) {
      containerEnv.push('DEVMODE=1');
    }

    const containerBinds = [`${this._homeyBuildPath}:/app`];

    await fse.ensureDir(path.join(this._homeyBuildPath, '.venv'));

    if (HOMEY_APP_RUNNER_PATH !== undefined) {
      containerBinds.push(`${HOMEY_APP_RUNNER_PATH}:/runner/src:ro,z`);
    }

    if (HOMEY_APP_RUNNER_SDK_PATH !== undefined) {
      containerBinds.push(`${HOMEY_APP_RUNNER_SDK_PATH}:/runner/sdk:ro,z`);
    }

    // Mount /userdata & /tmp for platform local
    if (homey.platform === 'local') {
      containerBinds.push(`${tmpDir}:/tmp:rw,z`, `${userdataDir}:/userdata:rw,z`);
    }

    const createOpts = {
      name: `homey-app-runner-${sessionId}-${manifest.id}-v${manifest.version}`,
      Env: containerEnv,
      Labels: {
        'com.athom.session': sessionId,
        'com.athom.port': String(serverPort),
        'com.athom.app-id': manifest.id,
        'com.athom.app-version': manifest.version,
        'com.athom.app-runtime': manifest.runtime,
      },
      HostConfig: {
        NetworkMode: network,
        Binds: containerBinds,
      },
      User: process.getuid !== undefined ? `${process.getuid()}:${process.getgid()}` : undefined,
    };

    Log.success(`Starting \`${manifest.id}@${manifest.version}\` in a Docker container...`);
    Log.info(' — Press CTRL+C to quit.');
    Log('─────────────── Logging stdout & stderr ───────────────');

    const passThrough = new stream.PassThrough();
    passThrough.pipe(process.stdout);

    await docker.run(HOMEY_APP_RUNNER_ID, HOMEY_APP_RUNNER_CMD, passThrough, createOpts);
  }

  async install({
    homey,
    clean = false,
    skipBuild = false,
    debug = false,
    dockerSocketPath,
    findLinks,
  } = {}) {
    if (homey.platform === 'cloud') {
      throw new Error(
        'Installing apps is not available on Homey Cloud.\nPlease run your app instead.',
      );
    }
    await AppPython.checkHomeyCompatibility(homey);

    if (skipBuild) {
      Log(colors.yellow("\n⚠ Can't skip build step for Python!\n"));
    }
    await this.preprocess({ findLinks, dockerSocketPath });

    const valid = await this._validate();
    if (valid !== true) throw new Error('Not installing, please fix the validation issues first');

    Log.success('Packing Homey App...');

    const app = await this._getPackStream({
      appPath: this._homeyBuildPath,
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
    platforms = HomeyLibApp.REQUIRED_PYTHON_PLATFORMS,
    dockerSocketPath,
    findLinks,
  } = {}) {
    Log.success('Pre-processing app...');
    // Build app.json from Homey Compose files
    if (App.hasHomeyCompose({ appPath: this.path })) {
      await HomeyCompose.build({ appPath: this.path, usesModules: false });
    }

    const manifest = App.getManifest({ appPath: this.path });

    // Clear the .homeybuild/ folder
    await fse.remove(this._homeyBuildPath).catch(async (err) => {
      // It helps to wait a bit when ENOTEMPTY is thrown.
      if (err.code === 'ENOTEMPTY') {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return fse.remove(this._homeyBuildPath);
      }

      throw err;
    });

    await this._copyAppSourceFiles();

    // Collect production dependencies in ./homeybuild
    const hasDependencies =
      manifest.pythonPackages !== undefined && manifest.pythonPackages.length > 0;
    if (copyAppProductionDependencies && hasDependencies) {
      let shouldRecompile;

      // Check whether the Python version has changed in the manifest
      HomeyLibApp.validatePythonVersion(manifest);

      const pythonVersion = manifest.pythonVersion;
      const previousPythonVersion = await fsPromises
        .readFile(path.join(this.path, PYTHON_PACKAGES_FOLDER, '.python-version'), 'utf8')
        .catch(() => undefined);

      shouldRecompile = pythonVersion !== previousPythonVersion;

      // Check whether pre-compiled venvs exist for all platforms
      for (const platform of platforms) {
        const venvCachePath = path.join(
          this.path,
          PYTHON_PACKAGES_FOLDER,
          platform ?? 'local',
          '.venv',
        );
        shouldRecompile |= !fse.pathExistsSync(venvCachePath);
      }

      if (shouldRecompile) {
        Log.error(`No pre-compiled venvs found for Python ${pythonVersion}`);
        Log.success('Compiling dependencies...');
        await this.installDependencies({ findLinks, dockerSocketPath });
      }

      await this.collectProductionDependencies(platforms);
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

    Log.success('Pre-processed app');
  }

  async collectProductionDependencies(platforms) {
    for (const platform of platforms) {
      try {
        const venvCachePath = path.join(
          this.path,
          PYTHON_PACKAGES_FOLDER,
          platform ?? 'local',
          '.venv',
        );
        const venvBuildPath =
          platform === undefined
            ? path.join(this._homeyBuildPath, '.venv')
            : path.join(this._homeyBuildPath, PYTHON_PACKAGES_FOLDER, platform);
        await fsPromises.cp(venvCachePath, venvBuildPath, { recursive: true });

        // Remove broken symlinks
        const venvBinPath = path.join(venvBuildPath, 'bin');
        const binFiles = fs.readdirSync(venvBinPath);
        const pythonBinRegex = /^python\d*(?:\.\d+)?$/;
        const pythonBinFiles = binFiles.filter((value) => pythonBinRegex.test(value));
        for (const pythonBinFile of pythonBinFiles) {
          fs.rmSync(path.join(venvBinPath, pythonBinFile));
        }
      } catch (e) {
        throw new StacklessError(
          `Error while collecting cross-compiled virtual environment for ${platform}. Did you run 'homey app dependencies install'?`,
        );
      }
    }
  }

  async _getPackStream({ appPath = this._homeyBuildPath } = {}) {
    let appSize = 0;
    let numFiles = 0;

    const tmpFile = await tmp.file({ postfix: '.tgz' });

    // Include just the packages in lib and ignore the rest of the venv
    const venvLibRegex = RegExp(String.raw`\/${PYTHON_PACKAGES_FOLDER}\/\w+\/lib(?!64)`);
    // Do not exclude the venv root folders
    const venvFolderRegex = RegExp(String.raw`\/${PYTHON_PACKAGES_FOLDER}\/\w+$`);

    await pipeline(
      tar
        .pack(appPath, {
          dereference: true,
          map(header) {
            if (header.type === 'file') numFiles += 1;
          },
          ignore(name) {
            if (name.includes(`/${PYTHON_PACKAGES_FOLDER}/`)) {
              const isVenvRootFolder = venvFolderRegex.test(name);
              const isVenvLibFolder = venvLibRegex.test(name);
              if (isVenvRootFolder) return false;
              if (isVenvLibFolder) {
                // Do not pack the homey library, as it will be provided at runtime
                return name.endsWith('/homey');
              }
              return true;
            }

            if (name.endsWith('pyproject.toml') || name.endsWith('uv.lock')) return true;

            if (name.startsWith('.')) return true;
            if (name.includes('/.git/')) return true;
            return false;
          },
        })
        .on('data', (chunk) => {
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
      '.venv',
      PYTHON_PACKAGES_FOLDER,
      'env.json',
      '*.compose.json',
    ];
    // Add a "file" containing our default ignore rules for dotfiles, env.json and node_modules
    walker.onReadIgnoreFile(DEFAULT_IGNORE_RULES_FILE, ignoreRules.join('\r\n'), () => {});

    const fileEntries = await new Promise((resolve, reject) => {
      walker.on('done', resolve).on('error', reject).start();
    });

    return fileEntries;
  }

  getDriverIdPrompt(driverName) {
    return {
      type: 'input',
      name: 'driverId',
      message: "What is your Driver's ID?",
      default: () => {
        let name = driverName;
        name = name.toLowerCase();
        name = name.replace(/ /g, '_');
        name = name.replace(INVALID_PYTHON_MODULE_CHARACTERS, '');
        return name;
      },
      validate: (input) => {
        if (!input.match(/^[a-z_]/)) {
          throw new Error('Invalid characters: needs to start with a letter or underscore (_)');
        }
        if (input.match(INVALID_PYTHON_MODULE_CHARACTERS)) {
          throw new Error('Invalid characters: only use letters, numbers, and underscores (_)');
        }
        if (fs.existsSync(path.join(this.path, 'drivers', input))) {
          throw new Error('Driver directory already exists!');
        }
        return true;
      },
    };
  }

  async copyDriverAndDeviceTemplate(templatePath, driverPath) {
    await copyFileAsync(path.join(templatePath, 'driver.py'), path.join(driverPath, 'driver.py'));
    await copyFileAsync(path.join(templatePath, 'device.py'), path.join(driverPath, 'device.py'));
  }

  async installRfLibrary() {
    throw new Error('homey-rfdriver is not supported for Python yet...');
  }

  async installZigbeeLibrary() {
    throw new Error('homey-zigbeedriver is not supported for Python yet...');
  }

  async installZWaveLibrary() {
    throw new Error('homey-zwavedriver is not supported for Python yet...');
  }

  async installOAuth2Library() {
    throw new Error('homey-oauth2app is not supported for Python yet...');
  }

  async copyWidgetTemplate(widgetPath, widgetName) {
    await fse.ensureDir(widgetPath);

    const widgetJson = {
      name: { en: widgetName },
      height: 188,
      settings: [],
      api: {
        get_something: {
          method: 'GET',
          path: '/',
        },
        add_something: {
          method: 'POST',
          path: '/',
        },
        update_something: {
          method: 'PUT',
          path: '/:id',
        },
        delete_something: {
          method: 'DELETE',
          path: '/:id',
        },
      },
    };

    await writeFileAsync(
      path.join(widgetPath, 'widget.compose.json'),
      JSON.stringify(widgetJson, false, 2),
    );

    const templatePath = path.join(__dirname, '..', 'assets', 'templates', 'app', 'widgets');
    await fse.ensureDir(path.join(widgetPath, 'public'));
    await copyFileAsync(
      path.join(templatePath, 'public/index.html'),
      path.join(widgetPath, 'public/index.html'),
    );
    await copyFileAsync(
      path.join(templatePath, 'public/homey-logo.png'),
      path.join(widgetPath, 'public/homey-logo.png'),
    );
    await copyFileAsync(path.join(templatePath, 'api.py'), path.join(widgetPath, 'api.py'));
    await copyFileAsync(
      path.join(templatePath, 'preview-dark.png'),
      path.join(widgetPath, 'preview-dark.png'),
    );
    await copyFileAsync(
      path.join(templatePath, 'preview-light.png'),
      path.join(widgetPath, 'preview-light.png'),
    );
  }

  static async create({ appPath: cwd, globalAnswers }) {
    const stat = await statAsync(cwd);
    if (!stat.isDirectory()) {
      throw new Error('Invalid path, must be a directory');
    }

    const localAnswers = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Seems good?',
        default: true,
      },
    ]);

    // Combine global and local answers
    const answers = {
      ...globalAnswers,
      ...localAnswers,
    };

    if (!answers.confirm) return;

    const appPath = path.join(cwd, answers.id);
    // Create the app folder (and fail if it already exists)
    await mkdirAsync(appPath);

    const latestSupportedPythonVersion = HomeyLibApp.SUPPORTED_PYTHON_VERSIONS.at(-1);

    const appJson = {
      id: answers.id,
      version: '1.0.0',
      compatibility: '>=13.0.0',
      sdk: 3,
      runtime: 'python',
      pythonVersion: latestSupportedPythonVersion,
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
    } catch (err) {}

    // make dirs
    const dirs = ['locales', 'drivers', 'assets', path.join('assets', 'images')];
    for (let i = 0; i < dirs.length; i++) {
      const dir = dirs[i];
      try {
        await mkdirAsync(path.join(appPath, dir));
      } catch (err) {
        Log(err);
      }
    }

    await HomeyCompose.createComposeDirectories({ appPath });

    if (answers['github-workflows']) {
      Log.error('Github workflows are not supported for Python yet.');
      // TODO call once implemented
    }

    await writeFileAsync(
      path.join(appPath, '.homeycompose', 'app.json'),
      JSON.stringify(appJson, false, 2),
    );

    const generatedAppManifestWarning = {
      _comment: 'This file is generated. Please edit .homeycompose/app.json instead.',
      ...appJson,
    };
    await writeFileAsync(
      path.join(appPath, 'app.json'),
      JSON.stringify(generatedAppManifestWarning, false, 2),
    );

    await writeFileAsync(path.join(appPath, 'locales', 'en.json'), JSON.stringify({}, false, 2));
    await writeFileAsync(path.join(appPath, 'README.txt'), `${appJson.description.en}\n`);

    // i18n pre-support
    if (appJson.description.nl) {
      await writeFileAsync(path.join(appPath, 'README.nl.txt'), `${appJson.description.nl}\n`);
    }

    // copy files
    const templatePath = path.join(__dirname, '..', 'assets', 'templates', 'app');
    const files = [path.join('assets', 'icon.svg'), 'app.py'];

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

    const gitIgnore = '/env.json\n/.homeybuild/\n';

    await writeFileAsync(path.join(appPath, '.gitignore'), gitIgnore.toString());
    await writeFileAsync(
      path.join(appPath, '.homeychangelog.json'),
      JSON.stringify(
        {
          [appJson.version]: {
            en: 'First version!',
          },
        },
        false,
        2,
      ),
    );

    Log.success(`App created in \`${appPath}\``);
    Log(
      `\nLearn more about Homey app development at: ${colors.underline('https://apps.developer.homey.app')}\n`,
    );
  }

  skipFolderForOpenAI(file) {
    return (
      file === 'locales' ||
      file === '.venv' ||
      file === PYTHON_PACKAGES_FOLDER ||
      file === '.homeybuild'
    );
  }

  static async addTypes({ appPath, findLinks }) {
    throw new Error('Installing homey-stubs locally needs to be done manually');
  }

  static async addGitHubWorkflows({ appPath }) {
    throw new Error('Github workflows are not supported for Python yet.');
  }

  async syncPythonVersion(pythonVersionPath) {
    let manifest;
    try {
      manifest = App.getComposeManifest({ appPath: this.path });
    } catch (err) {
      manifest = App.getManifest({ appPath: this.path });
    }

    HomeyLibApp.validatePythonVersion(manifest);

    const pythonVersion = manifest.pythonVersion;
    const previousPythonVersion = await fsPromises
      .readFile(pythonVersionPath, 'utf8')
      .catch(() => undefined);

    if (pythonVersion !== previousPythonVersion) {
      Log.success(`Python version changed to ${pythonVersion}`);
      await fse.ensureFile(pythonVersionPath);
      await fsPromises.writeFile(pythonVersionPath, pythonVersion);
    }
  }

  async syncPyproject(pyprojectPath) {
    let manifest;
    try {
      manifest = App.getComposeManifest({ appPath: this.path });
    } catch (err) {
      manifest = App.getManifest({ appPath: this.path });
    }

    const pyproject = {
      project: {
        name: manifest.id,
        version: manifest.version,
        dependencies: manifest.pythonPackages ?? [],
      },
    };

    await fse.ensureFile(pyprojectPath);
    await fsPromises.writeFile(pyprojectPath, TOML.stringify(pyproject));
  }

  async installDependencies({ findLinks, dockerSocketPath }) {
    await this.uvCommand(['uv', 'sync', '--active', '--no-dev', '-q'], {
      findLinks,
      dockerSocketPath,
    });

    Log.success('Installed dependencies');
    await this.listDependencies();
  }

  async addDependencies({ dependencies, findLinks, dockerSocketPath }) {
    // Write dependencies to app manifest
    let manifest;
    let manifestPath;
    try {
      manifest = App.getComposeManifest({ appPath: this.path });
      manifestPath = path.join(this.path, '.homeycompose', 'app.json');
    } catch (err) {
      manifest = App.getManifest({ appPath: this.path });
      manifestPath = path.join(this.path, 'app.json');
    }

    const oldDependencies = manifest.pythonPackages ?? [];

    // Add/update the given dependencies
    const versions = AppPython.parseDependencyVersions(oldDependencies);
    const newVersions = AppPython.parseDependencyVersions(dependencies);

    for (const [packageName, newVersion] of newVersions.entries()) {
      const oldVersion = versions.get(packageName);
      if (newVersion !== undefined && versions.has(packageName)) {
        Log(`Changing ${packageName} version from ${oldVersion} to ${newVersion}`);
      }
      versions.set(packageName, newVersion ?? oldVersion);
    }

    const newDependencies = [];

    for (const [packageName, version] of versions.entries()) {
      if (version !== undefined) {
        newDependencies.push(`${packageName}${version}`);
      } else {
        newDependencies.push(packageName);
      }
    }

    manifest.pythonPackages = newDependencies;
    await writeFileAsync(manifestPath, JSON.stringify(manifest, undefined, 2));
    Log.info('Updated app manifest');

    // Update venvs according to manifest
    await this.installDependencies({ findLinks, dockerSocketPath }).catch(async (error) => {
      manifest.pythonPackages = oldDependencies;
      await writeFileAsync(manifestPath, JSON.stringify(manifest, undefined, 2)).catch(() => {
        Log.info('Failed to restore app manifest');
      });
      Log.info('Restored app manifest');
      throw error;
    });
  }

  async removeDependencies({ dependencies, findLinks, dockerSocketPath }) {
    // Write dependencies to app manifest
    let manifest;
    let manifestPath;
    try {
      manifest = App.getComposeManifest({ appPath: this.path });
      manifestPath = path.join(this.path, '.homeycompose', 'app.json');
    } catch (err) {
      manifest = App.getManifest({ appPath: this.path });
      manifestPath = path.join(this.path, 'app.json');
    }

    const oldDependencies = manifest.pythonPackages ?? [];
    const versions = AppPython.parseDependencyVersions(oldDependencies);

    // Remove the given dependencies
    for (const packageName of dependencies) {
      versions.delete(packageName);
    }

    const newDependencies = [];

    for (const [packageName, version] of versions.entries()) {
      if (version !== undefined) {
        newDependencies.push(`${packageName}${version}`);
      } else {
        newDependencies.push(packageName);
      }
    }

    manifest.pythonPackages = newDependencies;
    await writeFileAsync(manifestPath, JSON.stringify(manifest, undefined, 2));
    Log.info('Updated app manifest');

    // Update venvs according to manifest
    await this.installDependencies({ findLinks, dockerSocketPath }).catch(async (error) => {
      manifest.pythonPackages = oldDependencies;
      await writeFileAsync(manifestPath, JSON.stringify(manifest, undefined, 2)).catch(() => {
        Log.info('Failed to restore app manifest');
      });
      Log.info('Restored app manifest');
      throw error;
    });
  }

  static parseDependencyVersions(dependencyStrings) {
    const versionMap = new Map();
    for (const dependency of dependencyStrings) {
      const [packageName, version] = dependency.split(/((?:[<>]=?|=).*)/);
      versionMap.set(packageName, version);
    }
    return versionMap;
  }

  async listDependencies() {
    let manifest;
    try {
      manifest = App.getComposeManifest({ appPath: this.path });
    } catch (err) {
      manifest = App.getManifest({ appPath: this.path });
    }
    const dependencies = manifest.pythonPackages ?? [];
    Log(dependencies.join('\n'));
  }

  static getLocalPlatform() {
    switch (arch) {
      case 'x64':
        return 'amd64';
      default:
        // Fall back to arm64 for unsupported architectures
        return 'arm64';
    }
  }

  async uvCommand(command, { findLinks, dockerSocketPath } = {}) {
    const docker = await DockerHelper.ensureDocker({ dockerSocketPath });

    const platforms = HomeyLibApp.REQUIRED_PYTHON_PLATFORMS;

    if (!process.env.HOMEY_APP_BUILDER_ID_PYTHON) {
      await DockerHelper.imagePullIfNeeded(
        'ghcr.io/athombv/python-homey-app-builder-amd64:latest',
        'amd64',
      );
      await DockerHelper.imagePullIfNeeded(
        'ghcr.io/athombv/python-homey-app-builder-arm64:latest',
        'arm64',
      );
    }

    const cacheBasePath = path.join(this.path, PYTHON_PACKAGES_FOLDER);

    // Generate .python-version
    const pythonVersionPath = path.join(cacheBasePath, '.python-version');
    await this.syncPythonVersion(pythonVersionPath);

    for (const platform of platforms) {
      // Use a temporary directory to store package management files
      const packageManagementDir = await tmp.dir({ unsafeCleanup: true });
      try {
        // Generate a completely new pyproject.toml
        const pyprojectPath = path.join(packageManagementDir.path, 'pyproject.toml');
        await this.syncPyproject(pyprojectPath);
        await fsPromises.cp(
          pythonVersionPath,
          path.join(packageManagementDir.path, '.python-version'),
        );

        const containerBinds = [`${packageManagementDir.path}:/project`];

        const venvPath = path.join(cacheBasePath, platform, '.venv');
        const uvCachePath = path.join(cacheBasePath, platform, 'uv_cache');
        await fse.ensureDir(venvPath);
        await fse.ensureDir(uvCachePath);
        containerBinds.push(`${venvPath}:/.venv`, `${uvCachePath}:/uv_cache`);

        const dockerCommand = [...command];

        if (findLinks !== undefined) {
          containerBinds.push(`${findLinks}:/find_links:ro`);
          dockerCommand.push('--find-links', '/find-links');
        }

        const createOptions = {
          WorkingDir: '/project',
          HostConfig: {
            AutoRemove: true,
            Binds: containerBinds,
          },
          User:
            process.getuid !== undefined ? `${process.getuid()}:${process.getgid()}` : undefined,
          platform,
        };

        try {
          Log.success('Executing for', platform, 'architecture...');
          await this.executeUvCommand(
            docker,
            BUILDER_IMAGES[platform],
            dockerCommand,
            createOptions,
            platform,
          );
        } finally {
          // Remove .gitignore from python_packages venvs so they can be checked into version control
          const ignorePath = path.join(venvPath, '.gitignore');
          await fse.remove(ignorePath).catch(() => {
            // ignore
          });
        }
      } finally {
        await packageManagementDir.cleanup().catch(() => {
          // ignore
        });
      }
    }
  }

  async executeUvCommand(
    docker,
    HOMEY_APP_BUILDER_ID,
    dockerCommand,
    createOptions,
    platform,
    retry = false,
  ) {
    const passThrough = new stream.PassThrough({ encoding: 'utf8' });

    let runResolve;
    let runReject;
    const runPromise = new Promise((resolve, reject) => {
      runResolve = resolve;
      runReject = reject;
    });

    // Use the docker.run callback to pass on error messages
    // Docker only puts its own errors in stderr, so we need to check the exit code and stdout as well
    const callback = (err, res) => {
      if (err !== null) {
        runReject(err);
      } else if (res.StatusCode !== 0) {
        const stderr = passThrough.read();
        if (stderr !== null) {
          runReject(AppPython.cleanUvError(stderr));
        } else {
          runReject();
        }
      } else {
        const stdout = passThrough.read();
        runResolve(stdout);
      }
    };

    docker.run(HOMEY_APP_BUILDER_ID, dockerCommand, passThrough, createOptions, callback);

    let success = false;
    await runPromise
      .then(() => {
        success = true;
      })
      .catch(async (error) => {
        // Check whether the error was caused by emulation issues or should just be thrown
        if (error instanceof Error) {
          throw error;
        } else if (error.endsWith('exec format error')) {
          if (retry) {
            throw new StacklessError('Failed to set up QEMU emulation for Docker.');
          }
          // Emulation was not set up correctly
          await DockerHelper.fixDockerEmulationError(platform, docker);
          Log.success('Retrying command...');
          retry = true;
        } else {
          throw new Error(error);
        }
      });

    if (!success && retry) {
      await this.executeUvCommand(
        docker,
        HOMEY_APP_BUILDER_ID,
        dockerCommand,
        createOptions,
        platform,
        true,
      );
    }
  }

  static cleanUvError(error) {
    let cleanError = error.replace(/^x/, '');
    cleanError = cleanError.split('help:')[0];
    cleanError = cleanError.trim();
    return cleanError;
  }
}

module.exports = AppPython;
