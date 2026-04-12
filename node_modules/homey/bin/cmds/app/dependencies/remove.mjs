import Log from '../../../../lib/Log.js';
import AppFactory from '../../../../lib/AppFactory.js';

export const desc = 'Remove dependencies from a Homey app';
export const command = 'remove [dev] <dependencies..>';
export const builder = (yargs) => {
  return yargs
    .positional('dependencies', {
      type: 'string',
      desc: 'Packages to remove',
    })
    .positional('dev', {
      type: 'boolean',
      default: false,
      desc: 'Remove dependencies only for development',
    })
    .example('homey app dependencies remove some-package');
};
export const handler = async (yargs) => {
  try {
    const app = AppFactory.getAppInstance(yargs.path);
    await app.removeDependencies({
      dockerSocketPath: yargs.dockerSocketPath,
      findLinks: yargs.findLinks,
      dependencies: yargs.dependencies,
      dev: yargs.dev,
    });
    process.exit(0);
  } catch (err) {
    Log.error(err);
    process.exit(1);
  }
};
