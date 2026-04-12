import Log from '../../../lib/Log.js';
import AppFactory from '../../../lib/AppFactory.js';

export const command = 'version <next>';
export const desc = "Update a Homey App's version";
export const builder = (yargs) => {
  return yargs
    .positional('next', {
      describe: 'patch/minor/major or semver',
      type: 'string',
    })
    .option('changelog', {
      default: null,
      type: 'string',
      description:
        'What\'s new in this version? Use dot-notation for translation. Example: --changelog.en "Add new feature" --changelog.de "Neue Funktionalität"',
    })
    .option('commit', {
      description: 'Create a git commit and tag for the new version',
    });
};
export const handler = async (yargs) => {
  try {
    const app = AppFactory.getAppInstance(yargs.path);
    await app.version(yargs.next);

    if (yargs.changelog) {
      await app.changelog(yargs.changelog);
    }

    if (yargs.commit) {
      await app.commit(yargs.changelog);
    }

    process.exit(0);
  } catch (err) {
    Log.error(err);
    process.exit(1);
  }
};
