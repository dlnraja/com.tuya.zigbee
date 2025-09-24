'use strict';

/*
  Homey Compose generates an app.json file based on scattered files,
  to make it easier to create apps with lots of functionality.

  It finds the following files:
  /.homeycompose/app.json
  /.homeycompose/capabilities/<id>.json
  /.homeycompose/screensavers/<id>.json
  /.homeycompose/signals/<433|868|ir>/<id>.json
  /.homeycompose/flow/<triggers|conditions|actions>/<id>.json
  /.homeycompose/capabilities/<id>.json
  /.homeycompose/discovery/<id>.json
  /.homeycompose/drivers/templates/<template_id>.json
  /.homeycompose/drivers/settings/<setting_id>.json
  /.homeycompose/drivers/flow/<triggers|conditions|actions>/<flow_id>.json
      (flow card object, id and device arg is added automatically)
  /drivers/<id>/driver.compose.json (extend with "$extends": [ "<template_id>" ])
  /drivers/<id>/driver.settings.compose.json
    (array with driver settings, extend with "$extends": "<template_id>"))
  /drivers/<id>/driver.flow.compose.json (object with flow cards, device arg is added automatically)
  /.homeycompose/locales/en.json
  /.homeycompose/locales/en.foo.json
*/

const fs = require('fs');
const path = require('path');
const util = require('util');
const url = require('url');

const fse = require('fs-extra');
const _ = require('underscore');
const deepmerge = require('deepmerge');
const objectPath = require('object-path');
const colors = require('colors');
const HomeyLib = require('homey-lib');

const { Log } = require('..');

const readFileAsync = util.promisify(fs.readFile);
const writeFileAsync = util.promisify(fs.writeFile);
const readdirAsync = util.promisify(fs.readdir);

const deepClone = object => JSON.parse(JSON.stringify(object));

const FLOW_TYPES = ['triggers', 'conditions', 'actions'];

class HomeyCompose {

  // Temporary simpler api
  static async build({ appPath }) {
    const compose = new HomeyCompose(appPath);
    await compose.run();
  }

  constructor(appPath) {
    this._appPath = appPath;
  }

  async run() {
    this._appPathCompose = path.join(this._appPath, '.homeycompose');

    this._appJsonPath = path.join(this._appPath, 'app.json');
    this._appJson = await this._getJsonFile(this._appJsonPath);

    this._appJsonPathCompose = path.join(this._appPathCompose, 'app.json');
    try {
      const appJSON = await this._getJsonFile(this._appJsonPathCompose);
      this._appJson = {
        _comment: 'This file is generated. Please edit .homeycompose/app.json instead.',
        ...appJSON,
      };
    } catch (err) {
      if (err.code !== 'ENOENT') throw new Error(err);
    }

    await this._composeFlow();
    await this._composeDrivers();
    await this._composeCapabilities();
    await this._composeDiscovery();
    await this._composeSignals();
    await this._composeScreensavers();
    await this._composeLocales();
    await this._saveAppJson();
  }

  extendSetting(settingsTemplates, settingObj) {
    if (settingObj.type === 'group') {
      for (const childSettingId of Object.keys(settingObj.children)) {
        this.extendSetting(settingsTemplates, settingObj.children[childSettingId]);
      }
    } else if (settingObj.$extends) {
      const templateIds = [].concat(settingObj.$extends);

      let settingTemplate = {};
      let templateId;
      for (const i of Object.keys(templateIds)) {
        templateId = templateIds[i];

        if (!Object.prototype.hasOwnProperty.call(settingsTemplates, templateId)) {
          throw new Error(`Invalid driver setting template for driver: ${templateId}`);
        }
        settingTemplate = Object.assign(settingTemplate, settingsTemplates[templateId]);
      }

      Object.assign(settingObj, {
        id: settingObj.$id || templateId,
        // We need to deep clone the settings template to make sure
        // replaceSpecialPropertiesRecursive doesn't mutate references
        // shared by multiple extended settings
        ...deepClone(settingTemplate),
        ...settingObj,
      });
    }
  }

  /*
    Find drivers in /drivers/:id/driver.compose.json
  */
  async _composeDrivers() {
    delete this._appJson.drivers;

    // use _getChildFolders to prevent any library or documentation files
    // ending up in the driver list.
    const drivers = await this._getChildFolders(path.join(this._appPath, 'drivers'));

    drivers.sort();
    for (let driverIndex = 0; driverIndex < drivers.length; driverIndex++) {
      const driverId = drivers[driverIndex];
      if (driverId.indexOf('.') === 0) continue;

      // merge json
      let driverJson = await this._getJsonFile(path.join(this._appPath, 'drivers', driverId, 'driver.compose.json'));
      if (driverJson.$extends) {
        if (!Array.isArray(driverJson.$extends)) {
          driverJson.$extends = [driverJson.$extends];
        }

        const templates = await this._getJsonFiles(path.join(this._appPathCompose, 'drivers', 'templates'));
        let templateJson = {};

        for (let j = 0; j < driverJson.$extends.length; j++) {
          const templateId = driverJson.$extends[j];
          templateJson = {
            ...templateJson,
            ...templates[templateId],
          };
        }

        driverJson = {
          ...templateJson,
          ...driverJson,
        };
      }

      driverJson.id = driverId;

      // merge settings
      try {
        driverJson.settings = await this._getJsonFile(path.join(this._appPath, 'drivers', driverId, 'driver.settings.compose.json'));
      } catch (err) {
        if (err.code !== 'ENOENT') throw new Error(err);
      }

      // merge template settings
      try {
        const settingsTemplates = await this._getJsonFiles(path.join(this._appPathCompose, 'drivers', 'settings'));
        if (Array.isArray(driverJson.settings)) {
          Object.values(driverJson.settings).forEach(setting => {
            this.extendSetting(settingsTemplates, setting);
          });
        }
      } catch (err) {
        if (err.code !== 'ENOENT') throw new Error(err);
      }

      // merge pair
      if (Array.isArray(driverJson.pair)) {
        const appPairPath = path.join(this._appPath, 'drivers', driverId, 'pair');
        const composePairPath = path.join(this._appPathCompose, 'drivers', 'pair');
        let composePairViews = await this._getFiles(composePairPath);
        composePairViews = composePairViews.filter(view => {
          return view.indexOf('.') !== 0;
        });

        for (let j = 0; j < driverJson.pair.length; j++) {
          const driverPairView = driverJson.pair[j];

          if (driverPairView.$template) {
            const viewId = driverPairView.id;
            const templateId = driverPairView.$template;
            if (!composePairViews.includes(templateId)) {
              throw new Error(`Invalid pair template for driver ${driverId}: ${templateId}`);
            }
            if (!viewId || typeof viewId !== 'string') {
              throw new Error(`Invalid pair template "id" property for driver ${driverId}: ${templateId}`);
            }

            await fse.ensureDir(appPairPath);

            // copy html
            let html = await readFileAsync(path.join(composePairPath, templateId, 'index.html'));
            html = html.toString();
            html = html.replace(/{{assets}}/g, `${viewId}.assets`);
            await writeFileAsync(path.join(appPairPath, `${viewId}.html`), html);

            // copy assets
            const composePairAssetsPath = path.join(composePairPath, templateId, 'assets');
            if (await fse.exists(composePairAssetsPath)) {
              await fse.copy(composePairAssetsPath, path.join(appPairPath, `${viewId}.assets`));
            }
          }

          // set pair options
          if (driverJson.$pairOptions) {
            for (const [id, options] of Object.entries(driverJson.$pairOptions)) {
              const view = _.findWhere(driverJson.pair, { id });
              if (view) {
                view.options = view.options || {};
                Object.assign(view.options, options);
              }
            }
          }
        }
      }

      // merge repair
      if (Array.isArray(driverJson.repair)) {
        const appRepairPath = path.join(this._appPath, 'drivers', driverId, 'repair');
        const composeRepairPath = path.join(this._appPathCompose, 'drivers', 'repair');
        let composeRepairViews = await this._getFiles(composeRepairPath);
        composeRepairViews = composeRepairViews.filter(view => {
          return view.indexOf('.') !== 0;
        });

        for (let j = 0; j < driverJson.repair.length; j++) {
          const driverRepairView = driverJson.repair[j];

          if (driverRepairView.$template) {
            const viewId = driverRepairView.id;
            const templateId = driverRepairView.$template;
            if (!composeRepairViews.includes(templateId)) {
              throw new Error(`Invalid repair template for driver ${driverId}: ${templateId}`);
            }
            if (!viewId || typeof viewId !== 'string') {
              throw new Error(`Invalid repair template "id" property for driver ${driverId}: ${templateId}`);
            }

            await fse.ensureDir(appRepairPath);

            // copy html
            let html = await readFileAsync(path.join(composeRepairPath, templateId, 'index.html'));
            html = html.toString();
            html = html.replace(/{{assets}}/g, `${viewId}.assets`);
            await writeFileAsync(path.join(appRepairPath, `${viewId}.html`), html);

            // copy assets
            const composeRepairAssetsPath = path.join(composeRepairPath, templateId, 'assets');
            if (await fse.exists(composeRepairAssetsPath)) {
              await fse.copy(composeRepairAssetsPath, path.join(appRepairPath, `${viewId}.assets`));
            }
          }

          // set repair options
          if (driverJson.$repairOptions) {
            for (const [id, options] of Object.entries(driverJson.$repairOptions)) {
              const view = _.findWhere(driverJson.repair, { id });
              if (view) {
                view.options = view.options || {};
                Object.assign(view.options, options);
              }
            }
          }
        }
      }

      // merge flow
      try {
        driverJson.$flow = await this._getJsonFile(path.join(this._appPath, 'drivers', driverId, 'driver.flow.compose.json'));
      } catch (err) {
        if (err.code !== 'ENOENT') throw new Error(err);
      }

      // get drivers flow templates
      const flowTemplates = {};
      try {
        for (let i = 0; i < FLOW_TYPES.length; i++) {
          const type = FLOW_TYPES[i];
          const typePath = path.join(this._appPathCompose, 'drivers', 'flow', type);
          flowTemplates[type] = await this._getJsonFiles(typePath);
        }
      } catch (err) {
        if (err.code !== 'ENOENT') throw new Error(err);
      }

      if (
        typeof driverJson.$flow === 'object'
        && driverJson.$flow !== null
        && !Array.isArray(driverJson.$flow)
      ) {
        for (let i = 0; i < FLOW_TYPES.length; i++) {
          const type = FLOW_TYPES[i];
          const cards = driverJson.$flow[type];
          if (!cards) continue;

          for (let j = 0; j < cards.length; j++) {
            const card = cards[j];

            // extend card if possible
            if (card.$extends) {
              const templateIds = [].concat(card.$extends);
              const templateCards = flowTemplates[type];

              let flowTemplate = {};
              for (const templateId of templateIds) {
                if (!templateCards[templateId]) {
                  throw new Error(`Invalid driver flow template for driver ${driverId}: ${templateId}`);
                }
                flowTemplate = Object.assign(flowTemplate, templateCards[templateId]);
              }

              // assign template to original flow object
              Object.assign(card, {
                id: card.$id || templateIds[templateIds.length - 1],
                ...flowTemplate,
                ...card,
              });
            }

            let filter = '';
            if (typeof card.$filter === 'string') {
              filter = card.$filter;
            } else if (typeof card.$filter === 'object' && card.$filter !== null) {
              filter = new url.URLSearchParams(card.$filter).toString();
            }

            card.args = card.args || [];
            card.args.unshift({
              type: 'device',
              name: card.$deviceName || 'device',
              filter: `driver_id=${driverId}${filter ? `&${filter}` : ''}`,
            });

            await this._addFlowCard({
              type,
              card,
            });
          }
        }
      }

      driverJson = this.replaceSpecialPropertiesRecursive(driverJson, driverId, driverJson);

      // add driver to app.json
      this._appJson.drivers = this._appJson.drivers || [];
      this._appJson.drivers.push(driverJson);

      Log(colors.grey(`Added Driver \`${driverId}\``));
    }
  }

  replaceSpecialPropertiesRecursive(obj, driverId, driverJson, zwaveParameterIndex) {
    if (typeof obj !== 'object' || obj === null) return obj;

    // store last found zwave parameter index
    if (Object.prototype.hasOwnProperty.call(obj, 'zwave') && Object.prototype.hasOwnProperty.call(obj.zwave, 'index')) {
      zwaveParameterIndex = obj.zwave.index;
    }

    for (const key of Object.keys(obj)) {
      if (typeof obj[key] === 'string') {
        obj[key] = obj[key].replace(/{{driverId}}/g, driverId);

        try {
          obj[key] = obj[key].replace(/{{driverName}}/g, driverJson.name.en);

          for (const locale of HomeyLib.App.getLocales()) {
            const replacement = driverJson.name[locale] || driverJson.name.en;
            obj[key] = obj[key].replace(new RegExp(`{{driverName${locale.charAt(0).toUpperCase()}${locale.charAt(1).toLowerCase()}}}`, 'g'), replacement);
          }
        } catch (err) {
          throw new Error(`Missing property \`name\` in driver ${driverId}`);
        }
        obj[key] = obj[key].replace(/{{driverPath}}/g, `/drivers/${driverId}`);
        obj[key] = obj[key].replace(/{{driverAssetsPath}}/g, `/drivers/${driverId}/assets`);

        if (zwaveParameterIndex) {
          obj[key] = obj[key].replace(/{{zwaveParameterIndex}}/g, zwaveParameterIndex);
        }
      } else {
        obj[key] = this.replaceSpecialPropertiesRecursive(obj[key], driverId, driverJson, zwaveParameterIndex);
      }
    }
    return obj;
  }

  /*
    Find signals in /compose/signals/:frequency/:id
  */
  async _composeSignals() {
    delete this._appJson.signals;

    const frequencies = ['433', '868', 'ir'];
    for (let i = 0; i < frequencies.length; i++) {
      const frequency = frequencies[i];

      const signals = await this._getJsonFiles(path.join(this._appPathCompose, 'signals', frequency));

      for (const [_signalId, signal] of Object.entries(signals)) {
        const signalId = signal.$id || path.basename(_signalId, '.json');

        this._appJson.signals = this._appJson.signals || {};
        this._appJson.signals[frequency] = this._appJson.signals[frequency] || {};
        this._appJson.signals[frequency][signalId] = signal;

        Log(colors.grey(`Added Signal \`${signalId}\` for frequency \`${frequency}\``));
      }
    }
  }

  /*
    Find flow cards in /compose/flow/:type/:id
  */
  async _composeFlow() {
    delete this._appJson.flow;

    for (let i = 0; i < FLOW_TYPES.length; i++) {
      const type = FLOW_TYPES[i];

      const typePath = path.join(this._appPathCompose, 'flow', type);
      const cards = await this._getJsonFiles(typePath);
      for (const [cardId, card] of Object.entries(cards)) {
        await this._addFlowCard({
          type,
          card,
          id: path.basename(cardId, '.json'),
        });
      }
    }
  }

  async _addFlowCard({ type, card, id }) {
    const cardId = card.$id || card.id || id;
    card.id = cardId;

    this._appJson.flow = this._appJson.flow || {};
    this._appJson.flow[type] = this._appJson.flow[type] || [];
    this._appJson.flow[type].push(card);

    Log(colors.grey(`Added FlowCard \`${cardId}\` for type \`${type}\``));
  }

  async _composeScreensavers() {
    delete this._appJson.screensavers;

    const screensavers = await this._getJsonFiles(path.join(this._appPathCompose, 'screensavers'));
    for (const [screensaverId, screensaver] of Object.entries(screensavers)) {
      screensaver.name = screensaver.$name || screensaver.name || screensaverId;

      this._appJson.screensavers = this._appJson.screensavers || [];
      this._appJson.screensavers.push(screensaver);

      Log(colors.grey(`Added Screensaver \`${screensaver.name}\``));
    }
  }

  async _composeCapabilities() {
    delete this._appJson.capabilities;

    const capabilities = await this._getJsonFiles(path.join(this._appPathCompose, 'capabilities'));
    for (const [_capabilityId, capability] of Object.entries(capabilities)) {
      const capabilityId = capability.$id || _capabilityId;

      this._appJson.capabilities = this._appJson.capabilities || {};
      this._appJson.capabilities[capabilityId] = capability;

      Log(colors.grey(`Added Capability \`${capabilityId}\``));
    }
  }

  async _composeDiscovery() {
    delete this._appJson.discovery;

    const strategies = await this._getJsonFiles(path.join(this._appPathCompose, 'discovery'));
    for (const [strategyId, strategy] of Object.entries(strategies)) {
      this._appJson.discovery = this._appJson.discovery || {};
      this._appJson.discovery[strategyId] = strategy;
      Log(colors.grey(`Added Discovery Strategy \`${strategyId}\``));
    }
  }

  /*
    Merge locales (deep merge). They are merged from long to small filename.

    Example files:
    /.homeycompose/locales/en.json
    /.homeycompose/locales/en.foo.json (will be placed under property `foo`)
    /.homeycompose/locales/en.foo.bar.json (will be placed under property `foo.bar`)
  */

  async _composeLocales() {
    const appLocalesPath = path.join(this._appPath, 'locales');
    const appLocales = await this._getJsonFiles(appLocalesPath);
    const appLocalesChanged = [];

    const appComposeLocalesPath = path.join(this._appPathCompose, 'locales');
    const appComposeLocales = await this._getJsonFiles(appComposeLocalesPath);

    // sort locales to merge the longest paths first
    const sortedAppComposeLocaleIds = Object.keys(appComposeLocales)
      .sort((a, b) => b.split('.').length - a.split('.').length);

    for (const appComposeLocaleId of sortedAppComposeLocaleIds) {
      const appComposeLocale = appComposeLocales[appComposeLocaleId];
      const appComposeLocaleIdArray = path.basename(appComposeLocaleId, '.json').split('.');
      const appComposeLocaleLanguage = appComposeLocaleIdArray.shift();

      appLocales[appComposeLocaleLanguage] = appLocales[appComposeLocaleLanguage] || {};

      if (appComposeLocaleIdArray.length === 0) {
        appLocales[appComposeLocaleLanguage] = deepmerge(appLocales[appComposeLocaleLanguage],
          appComposeLocale);
      } else {
        const value = objectPath.get(appLocales[appComposeLocaleLanguage], appComposeLocaleIdArray);

        objectPath.set(
          appLocales[appComposeLocaleLanguage],
          appComposeLocaleIdArray,
          deepmerge(value || {}, appComposeLocale),
        );
      }

      if (!appLocalesChanged.includes(appComposeLocaleLanguage)) {
        appLocalesChanged.push(appComposeLocaleLanguage);
      }
    }

    for (let i = 0; i < appLocalesChanged.length; i++) {
      const appLocaleId = appLocalesChanged[i];
      const appLocale = appLocales[appLocaleId];
      await writeFileAsync(path.join(appLocalesPath, `${appLocaleId}.json`), JSON.stringify(appLocale, false, 2));
      Log(colors.grey(`Added Locale \`${appLocaleId}\``));
    }
  }

  async _saveAppJson() {
    function removeDollarPropertiesRecursive(obj) {
      if (typeof obj !== 'object' || obj === null) return obj;
      for (const key of Object.keys(obj)) {
        if (key.indexOf('$') === 0) {
          delete obj[key];
        } else {
          obj[key] = removeDollarPropertiesRecursive(obj[key]);
        }
      }
      return obj;
    }

    let json = JSON.parse(JSON.stringify(this._appJson));
    json = removeDollarPropertiesRecursive(json);

    await writeFileAsync(this._appJsonPath, JSON.stringify(json, false, 2));
  }

  async _getChildFolders(rootPath) {
    const childFolders = [];
    try {
      const pathContents = await readdirAsync(rootPath, { withFileTypes: true });

      // Check all paths for dirs
      Object.values(pathContents).forEach(pathConent => {
        if (pathConent.isDirectory()) {
          childFolders.push(pathConent.name);
        }
      });

      return childFolders;
    } catch (err) {
      return childFolders;
    }
  }

  async _getFiles(filesPath) {
    try {
      const files = await readdirAsync(filesPath);

      return files.filter(file => {
        return file.indexOf('.') !== 0;
      }).sort((a, b) => {
        a = path.basename(a, path.extname(a)).toLowerCase();
        b = path.basename(b, path.extname(b)).toLowerCase();
        return a.localeCompare(b);
      });
    } catch (err) {
      return [];
    }
  }

  async _getJsonFiles(filesPath) {
    const result = {};
    const files = await this._getFiles(filesPath);
    for (let i = 0; i < files.length; i++) {
      const filePath = files[i];
      if (path.extname(filePath) !== '.json') continue;

      const fileJson = await this._getJsonFile(path.join(filesPath, filePath));
      const fileId = path.basename(filePath, '.json');

      result[fileId] = fileJson;
    }
    return result;
  }

  async _getJsonFile(filePath) {
    let fileJson = await readFileAsync(filePath);
    try {
      fileJson = JSON.parse(fileJson);
    } catch (err) {
      throw new Error(`Error in file ${filePath}\n${err.message}`);
    }

    return fileJson;
  }

}

module.exports = HomeyCompose;
