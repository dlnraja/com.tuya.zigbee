'use strict';

const colors = require('colors');

const Log = require('../../../lib/Log');
const App = require('../../../lib/App');

exports.desc = 'Translate a Homey App with OpenAI';
exports.builder = yargs => {
  return yargs
    .option('languages', {
      default: ['nl', 'da', 'de', 'es', 'fr', 'it', 'no', 'sv', 'pl', 'ru', 'ko'].join(','),
      type: 'string',
      description: 'Comma-seperated list of languages to translate to.',
    })
    .option('api-key', {
      default: process.env.OPENAI_API_KEY,
      type: 'string',
      description: 'OpenAI API key. You can create an API Key on https://platform.openai.com/api-keys.',
    })
    .option('model', {
      default: 'gpt-4o',
      type: 'string',
      description: 'OpenAI model to use.',
    })
    .option('file', {
      type: 'string',
      description: 'Absolute path to a single file to translate, instead of automatically translating the entire folder.',
    });
};
exports.handler = async yargs => {
  try {
    const app = new App(yargs.path);
    await app.translateWithOpenAI({
      languages: yargs.languages.split(',').map(lang => lang.trim()),
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
    Log(colors.yellow('The app has been translated using AI, so results may vary. Please check every file manually before committing.'));

    process.exit(0);
  } catch (err) {
    Log.error(err);
    process.exit(1);
  }
};
