'use strict';

const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
const PQueue = require('p-queue').default;
const App = require('../App');
const Log = require('../Log');

class Translate {

  static LANGUAGES_TRANSLATE = ['nl', 'da', 'de', 'es', 'fr', 'it', 'no', 'sv', 'pl', 'ru', 'ko', 'ar'];
  static LANGUAGES = ['en', ...Translate.LANGUAGES_TRANSLATE];

  constructor({ appPath }) {
    this._appPath = appPath;
  }

  async translateWithOpenAI({
    languages = [],
    apiKey = process.env.OPENAI_API_KEY,
    model = 'gpt-4o',
    file = null,
  }) {
    // Validate languages
    if (languages.includes('en')) {
      throw new Error('You cannot translate to English, as it is the default language.');
    }

    // Validate API Key
    if (!apiKey) {
      throw new Error(`Missing OPENAI_API_KEY in the environment variables. Try running 'OPENAI_API_KEY="..." homey app translate'.

You can create an API Key on https://platform.openai.com/api-keys.`);
    }

    // Create OpenAI instance
    this._openai = new OpenAI({ apiKey });
    this._pqueue = new PQueue({ concurrency: 10 });
    this._model = model;

    // Find & translate all .json files recursively
    const jsonFiles = new Set();

    if (file) {
      if (!file.endsWith('.json')) {
        throw new Error('--file only supports a .json file.');
      }

      jsonFiles.add(file);
    } else {
      if (App.hasHomeyCompose({ appPath: this._appPath })) {
        jsonFiles.add(path.join(this._appPath, '.homeycompose', 'app.json'));
      } else {
        jsonFiles.add(path.join(this._appPath, 'app.json'));
      }

      await this._walkSync(this._appPath, jsonFiles);
    }

    Log(`Found ${jsonFiles.size} JSON files to translate...`);

    // Get App name
    const manifest = App.getManifest({ appPath: this._appPath });
    const appName = this._getAppName(manifest.name);

    // Start translation
    await Promise.all([...jsonFiles].map(async (file) => {
      return this._pqueue.add(async () => {
        try {
          await this._translateFile(file, languages, appName);
        } catch (err) {
          Log(`❌ Error translating ${file}`);
          Log(err);
        }
      });
    }));

    if (file) return;

    // Translate /locales/en.json to /locales/{language}.json
    const enLocalePath = path.join(this._appPath, 'locales', 'en.json');
    const enLocalePathExists = !!await fs.promises.stat(enLocalePath).catch(() => null);
    if (enLocalePathExists) {
      const enLocale = await fs.promises.readFile(enLocalePath, 'utf8');

      await Promise.all(Object.values(languages).map(async (language) => {
        return this._pqueue.add(async () => {
          const translatedLocalePath = path.join(this._appPath, 'locales', `${language}.json`);

          try {
            const translationExists = !!await fs.promises.stat(translatedLocalePath).catch(() => null);
            if (translationExists) return;

            const chatResult = await this._openai.chat.completions.create({
              model: this._model,
              messages: [{
                role: 'user',
                content: `
      This JSON structure is a translation file for a Homey App.
      Your job is to translate this file to the following language: ${language}
      These are your constraints:
      — Tone of voice: casual, friendly, helpful.
      — Only change the values that are strings. Never add, remove or change keys.
      — Only output the new JSON file. No text. Don't format it as JSON. Don't output === START FILE ===.

      === START FILE ===
      ${enLocale}`,
              }],
            });
            await fs.promises.writeFile(translatedLocalePath, JSON.stringify(JSON.parse(chatResult.choices[0].message.content), false, 2));
            Log(`✅ Translated ${translatedLocalePath}`);
          } catch (err) {
            Log(`❌ Error translating ${translatedLocalePath}`);
            Log(err);
          }
        });
      }));
    }

    // Translate README.txt
    const readmePath = path.join(this._appPath, 'README.txt');
    const readmePathExists = !!await fs.promises.stat(readmePath).catch(() => null);
    if (readmePathExists) {
      const readme = await fs.promises.readFile(readmePath, 'utf8');
      await Promise.all(Object.values(languages).map(async (language) => {
        return this._pqueue.add(async () => {
          const translatedReadmePath = path.join(this._appPath, `README.${language}.txt`);
          try {
            const translationExists = !!await fs.promises.stat(translatedReadmePath).catch(() => null);
            if (translationExists) return;

            const chatResult = await this._openai.chat.completions.create({
              model: this._model,
              messages: [{
                role: 'user',
                content: `       
This text is a description of an integration published on the Homey App Store.
Your job is to translate this text to the following language: ${language}
These are your constraints:
— Tone of voice: casual, friendly, helpful.
— Only output the new text. No other words. Don't format it. Don't output === START FILE ===.

=== START FILE ===
${readme}`,
              }],
            });

            await fs.promises.writeFile(translatedReadmePath, chatResult.choices[0].message.content);
            Log(`✅ Translated ${translatedReadmePath}`);
          } catch (err) {
            Log(`❌ Error translating ${translatedReadmePath}`);
            Log(err);
          }
        });
      }));
    }
  }

  async _walkSync(dir, jsonFiles) {
    const files = await fs.promises.readdir(dir);
    await Promise.all(files.map(async (file) => {
      const filePath = `${dir}/${file}`;
      const fileStats = await fs.promises.stat(filePath);

      if (fileStats.isDirectory()) {
        if (file === 'locales') return;
        if (file === 'node_modules') return;
        if (file === '.homeybuild') return;

        await this._walkSync(filePath, jsonFiles);
      }

      if (dir === this._appPath) {
        // Skip root directory files
        return;
      }

      if (fileStats.isFile() && filePath.endsWith('.json')) {
        if (file.startsWith('.')) return;

        jsonFiles.add(path.normalize(filePath));
      }
    }));
  }

  /**
   * Recursively scans a JSON object to detect missing translations for specified languages.
   * Each translation object is assumed to have an 'en' key as the source text.
   * Returns a list of translation tasks including the path, source text, existing translations, and missing languages.
   * This enables targeted AI translation only where needed, preventing overwriting existing translations.
   */
  _extractTranslationTasks(obj, path = [], languages) {
    const tasks = [];

    if (typeof obj === 'object' && obj !== null) {
      const keys = Object.keys(obj);

      const isTranslationObject = keys.includes('en');

      if (isTranslationObject) {
        const missing = languages.filter((lang) => !(lang in obj));

        if (missing.length > 0) {
          tasks.push({
            // Store path strictly as an array to safely support keys that contain dots
            path: [...path],
            source: obj.en,
            existing: obj,
            missing,
          });
        }

        return tasks;
      }

      for (const key of keys) {
        const newPath = [...path, key];
        tasks.push(
          ...this._extractTranslationTasks(obj[key], newPath, languages),
        );
      }
    }

    return tasks;
  }

  /**
   * Uses the OpenAI API to translate a single text string into a target language.
   * Preserves placeholders and enums, avoids translating brand names, and ensures the output is clean.
   * Provides a consistent, friendly, and helpful tone for all translations.
   * Encapsulating this in a function keeps translation logic centralized and maintainable.
   */
  async _translateOne(lang, text, appName) {
    const ruleSet = [
      'Context:',
      `- You are translating the Homey app: "${appName}"`,
      '- No brand name translation',
      '- Tone of voice: casual, friendly, helpful.',
    ];
    // Extract placeholders [[ ]] from the source text
    const placeholders = text.match(/\[\[.+?\]\]/g) || [];
    if (placeholders.length > 0) {
      ruleSet.push(`- Preserve placeholders: ${placeholders.join(', ')}.`);
    }
    // Extract options between {{ }} from the source text
    const options = text.match(/\{\{.+?\}\}/g) || [];
    if (options.length > 0) {
      ruleSet.push(`- Translate the options within brackets {{ and }}: ${options.join(', ')}.`);
    }

    ruleSet.push(`Job: Translate the following English text into: [${lang}]`);

    const rules = ruleSet.join('\n');

    const result = await this._openai.chat.completions.create({
      model: this._model,
      temperature: 0,
      messages: [
        {
          role: 'system',
          content: rules,
        },
        {
          role: 'user',
          content: text,
        },
      ],
    });

    return result.choices[0].message.content.trim();
  }

  /**
   * Reorders the translations in the JSON object at the specified path according to Translate.LANGUAGES.
   * Preserves the order of existing keys if currentKeys is provided.
   */
  _applyTranslationOrder(obj, path, currentKeys = []) {
    if (!Array.isArray(path)) {
      throw new TypeError('applyTranslationOrder expects `path` to be an array of keys');
    }
    if (path.length === 0) {
      throw new Error('applyTranslationOrder received an empty path');
    }
    if (obj == null || typeof obj !== 'object') {
      throw new TypeError('applyTranslationOrder expects `obj` to be an object');
    }

    let current = obj;

    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i];

      if (current[key] === undefined || current[key] === null || typeof current[key] !== 'object') {
        throw new Error(
          `Invalid path: "${path
            .slice(0, i + 1)
            .join('.')}" does not exist or is not an object`,
        );
      }

      current = current[key];
    }

    const finalKey = path[path.length - 1];
    const existing = current[finalKey];

    const allKeys = Object.keys(existing);
    const sortedKeys = [...allKeys].sort((a, b) => {
      const indexA = Translate.LANGUAGES.indexOf(a);
      const indexB = Translate.LANGUAGES.indexOf(b);

      const isExistingA = currentKeys.includes(a);
      const isExistingB = currentKeys.includes(b);

      // 1. If both are in Translate.LANGUAGES, sort by their defined order
      if (indexA !== -1 && indexB !== -1) {
        // If both were existing, preserve their relative order from currentKeys
        if (isExistingA && isExistingB) {
          return currentKeys.indexOf(a) - currentKeys.indexOf(b);
        }
        return indexA - indexB;
      }

      // 2. If only one is in Translate.LANGUAGES, that one comes first
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;

      // 3. Neither is in Translate.LANGUAGES, preserve existing order or use original index
      if (isExistingA && isExistingB) {
        return currentKeys.indexOf(a) - currentKeys.indexOf(b);
      }

      // Fallback to their order in the current object keys
      return allKeys.indexOf(a) - allKeys.indexOf(b);
    });

    const ordered = {};
    sortedKeys.forEach((l) => {
      ordered[l] = existing[l];
    });

    current[finalKey] = ordered;
  }

  /**
   * Safely applies a translated value into the JSON object at the specified path.
   * Ensures existing translations are preserved and only missing languages are added.
   * This prevents accidental overwriting and maintains translation integrity.
   */
  _applyTranslation(obj, path, lang, value) {
    if (!Array.isArray(path)) {
      throw new TypeError('applyTranslation expects `path` to be an array of keys');
    }
    if (path.length === 0) {
      throw new Error('applyTranslation received an empty path');
    }
    if (obj == null || typeof obj !== 'object') {
      throw new TypeError('applyTranslation expects `obj` to be an object');
    }

    let current = obj;

    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i];

      if (current[key] === undefined || current[key] === null || typeof current[key] !== 'object') {
        throw new Error(
          `Invalid path: "${path
            .slice(0, i + 1)
            .join('.')}" does not exist or is not an object`,
        );
      }

      current = current[key];
    }

    const finalKey = path[path.length - 1];
    current[finalKey][lang] = value;
  }

  /**
   * Orchestrates the translation process for a given JSON file.
   * 1. Reads the file and parses its JSON content.
   * 2. Identifies missing translations using extractTranslationTasks().
   * 3. Translates each missing entry using translateOne().
   * 4. Writes back the updated JSON, preserving existing translations.
   * This approach ensures automated, consistent, and safe translation updates for the entire file.
   */
  async _translateFile(file, languages, appName) {
    const content = await fs.promises.readFile(file, 'utf8');
    const json = JSON.parse(content);

    const tasks = this._extractTranslationTasks(json, [], languages);

    for (const task of tasks) {
      const currentKeys = Object.keys(task.existing);
      for (const lang of task.missing) {
        const translated = await this._translateOne(lang, task.source, appName);
        this._applyTranslation(json, task.path, lang, translated);
      }
      this._applyTranslationOrder(json, task.path, currentKeys);
    }

    await fs.promises.writeFile(file, JSON.stringify(json, null, 2));
    Log(`✅ Translated ${file}`);
  }

  _getAppName(name) {
    if (typeof name === 'string') {
      return name;
    }

    if (typeof name === 'object' && name !== null && name.en) {
      return name.en;
    }

    return null;
  }

}

module.exports = Translate;
