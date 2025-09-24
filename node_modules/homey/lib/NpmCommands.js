'use strict';

const path = require('path');
const util = require('util');
const childProcess = require('child_process');

const colors = require('colors');

const { Log } = require('..');

const exec = util.promisify(childProcess.exec);

class NpmCommands {

  /**
   * Execute npm install for a given packageId or array of packageIds.
   * @param {string[]} packages - List of packages that should be installed (e.g. ['request'] or ['request@1.2.3'])
   * @param {{ appPath?: string }} [options] - Current working directory where npm install should be executed.
   * @returns {Promise<void>}
   */
  static async install(packages, { appPath } = {}) {
    Log(colors.green(`✓ Installing dependencies: ${packages.join(', ')}`));
    await exec(`npm install --save ${packages.join(' ')}`, { cwd: appPath });
    Log(colors.green('✓ Installation complete'));
  }

  /**
   * Execute npm install for a given packageId or array of packageIds.
   * @param {string[]} packages - List of packages that should be installed (e.g. ['request'] or ['request@1.2.3'])
   * @param {{ appPath?: string }} [options] - Current working directory where npm install should be executed.
   * @returns {Promise<void>}
   */
  static async installDev(packages, { appPath } = {}) {
    Log(colors.green(`✓ Installing dev dependencies: ${packages.join(', ')}`));
    await exec(`npm install --save-dev ${packages.join(' ')}`, { cwd: appPath });
    Log(colors.green('✓ Installation complete'));
  }

  /**
   * Execute npm ls to get a list of production dependencies.
   * @param {{ appPath?: string }} [options]
   * @returns {Promise<string[]>}
   */
  static async getProductionDependencies({ appPath } = {}) {
    // Note: on npm@6 this command lists packages from your package.json.
    // On npm@7 and above this list packages that are in your node_modules folder.
    // This means we can end up with "extra" packages that are still present in node_modules but not
    // listed in package.json or package-lock.json.
    // The --package-lock-only flag prevents this but then it will throw when there is no lock file.
    const { stdout } = await exec('npm ls --parseable --all --only=prod', { cwd: appPath });

    return stdout
      .split(/\r?\n/)
      .map(filePath => path.relative(appPath, filePath))
      .filter(filePath => filePath !== '');
  }

}

module.exports = NpmCommands;
