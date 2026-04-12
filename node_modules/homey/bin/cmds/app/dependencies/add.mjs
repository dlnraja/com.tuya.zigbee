import Log from '../../../../lib/Log.js';
import AppFactory from '../../../../lib/AppFactory.js';

export const desc = 'Add dependencies to a Homey app';
export const command = 'add [dev] <dependencies..>';
export const builder = (yargs) => {
  return yargs
    .positional('dependencies', {
      type: 'string',
      desc: 'Packages to add, optionally with specifiers such as version constraints',
    })
    .positional('dev', {
      type: 'boolean',
      default: false,
      desc: 'Install dependencies only for development',
    })
    .example('homey app dependencies add --dev some-package>=0.0.0');
};
export const handler = async (yargs) => {
  try {
    const app = AppFactory.getAppInstance(yargs.path);
    await app.addDependencies({
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
