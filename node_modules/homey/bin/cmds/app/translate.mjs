import colors from 'colors';

import Log from '../../../lib/Log.js';
import AppFactory from '../../../lib/AppFactory.js';
import Translate from '../../../lib/app/Translate.js';

export const desc = 'Translate a Homey App with OpenAI';
export const builder = (yargs) => {
  return yargs
    .option('languages', {
      default: Translate.LANGUAGES_TRANSLATE.join(','),
      type: 'string',
      description: 'Comma-seperated list of languages to translate to.',
    })
    .option('api-key', {
      default: process.env.OPENAI_API_KEY,
      type: 'string',
      description:
        'OpenAI API key. You can create an API Key on https://platform.openai.com/api-keys.',
    })
    .option('model', {
      default: 'gpt-4o',
      type: 'string',
      description: 'OpenAI model to use.',
    })
    .option('file', {
      type: 'string',
      description:
        'Absolute path to a single file to translate, instead of automatically translating the entire folder.',
    });
};
export const handler = async (yargs) => {
  try {
    const app = AppFactory.getAppInstance(yargs.path);
    const translate = new Translate({ appPath: app.path });

    Log('');
    Log(colors.yellow('Start translating app...'));
    await translate.translateWithOpenAI({
      languages: yargs.languages.split(',').map((lang) => lang.trim()),
      apiKey: yargs.apiKey,
      model: yargs.model,
      file: yargs.file,
    });
    await app.preprocess({
      copyAppProductionDependencies: false,
    });
    await app.validate({
      level: yargs.level,
    });

    Log('');
    Log(
      colors.yellow(
        'The app has been translated using AI, so results may vary. Please check every file manually before committing.',
      ),
    );

    process.exit(0);
  } catch (err) {
    Log.error(err);
    process.exit(1);
  }
};
