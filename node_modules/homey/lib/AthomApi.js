'use strict';

const path = require('path');
const os = require('os');

const { AthomCloudAPI } = require('athom-api');
const inquirer = require('inquirer');
const colors = require('colors');
const _ = require('underscore');
const fetch = require('node-fetch');
const express = require('express');
const open = require('open');

const config = require('../config');
const { Log, Settings } = require('../index');

class AthomApi {

  constructor() {
    this._api = null;
    this._user = null;
    this._homeys = null;
    this._activeHomey = null;

    this._store = {
      async get() {
        return await Settings.get('_athom_api_state') || {};
      },
      async set(value) {
        return Settings.set('_athom_api_state', value);
      },
    };
  }

  _createApi() {
    this._api = new AthomCloudAPI({
      clientId: config.athomApiClientId,
      clientSecret: config.athomApiClientSecret,
      store: this._store,
    });
  }

  async _initApi() {
    if (this._api) return this._api;

    this._createApi();

    // migration
    const token = await Settings.get('athomToken');
    if (token) {
      await this._api.setToken(token);
      await Settings.unset('athomToken');
    }

    if (!await this._api.isLoggedIn()) {
      await this.login();
    }
    return this._api;
  }

  async login() {
    Log(colors.green('✓ Logging in...'));
    let listener;

    this._createApi();

    const app = express();
    const port = await new Promise(resolve => {
      listener = app.listen(() => {
        resolve(listener.address().port);
      });
    });

    const url = `${config.athomApiLoginUrl}?port=${port}&clientId=${config.athomApiClientId}`;
    Log(colors.bold('To log in with your Athom Account, please visit', colors.underline.cyan(url)));
    open(url).catch(err => { });

    const code = await Promise.race([

      // Input code automatically by webserver
      Promise.resolve().then(async () => {
        const codePromise = new Promise(resolve => {
          app.get('/auth', (req, res) => {
            res.sendFile(path.join(__dirname, '..', 'assets', '1px.png'));
            if (req.query.code) {
              console.log(req.query.code);
              resolve(req.query.code);
            }
          });
        });
        return codePromise;
      }),

      // Input code manually
      inquirer.prompt([
        {
          type: 'text',
          name: 'receivedCode',
          message: 'Paste the code:',
        },
      ]).then(({ receivedCode }) => {
        if (!receivedCode) {
          throw new Error('Invalid code!');
        }
        return receivedCode;
      }),

      new Promise((resolve, reject) => {
        setTimeout(() => {
          console.log('');
          reject(new Error('Timeout getting authorization code!'));
        }, 1000 * 60 * 5); // 5 minutes
      }),
    ]);

    listener.close();

    const token = await this._api.authenticateWithAuthorizationCode(code);

    try {
      await this._api.setToken(token);

      const profile = await this.getProfile();

      Log(colors.green(`✓ You are now logged in as ${profile.firstname} ${profile.lastname} <${profile.email}>`));
    } catch (err) {
      Log(colors.red(`Invalid Account Token, please try again:${err.stack}`));
    }
  }

  async logout() {
    Log(colors.green('✓ You are now logged out'));
    await this._createApi();
    await this._api.logout();
    await this.unsetActiveHomey();
  }

  async getProfile() {
    await this._initApi();
    try {
      return await this._api.getAuthenticatedUser();
    } catch (e) {
      return this._api.getAuthenticatedUserCached();
    }
  }

  async getHomey(homeyId, { cache = false } = {}) {
    const homeys = await this.getHomeys();
    for (let i = 0; i < homeys.length; i++) {
      const homey = homeys[i];
      if (homey._id === homeyId) return homey;
    }
    throw new Error('Invalid Homey');
  }

  async getHomeys({
    cache = true,
    local = true,
  } = {}) {
    if (cache && this._homeys) return this._homeys;

    await this._initApi();

    this._user = this._user || await this.getProfile();
    this._homeys = await this._user.getHomeys();

    // find USB connected Homeys
    if (local) {
      const ifaces = os.networkInterfaces();

      for (const adapters of Object.values(ifaces)) {
        for (const adapter of Object.values(adapters)) {
          try {
            let ip = adapter.address.split('.');
            if (ip[0] !== '10') continue;
            ip[3] = '1';
            ip = ip.join('.');

            // TODO: manager webserver's api was removed.
            // This is fine for now since we are only checking the header but we should fix this!
            const res = await fetch(`http://${ip}/api/manager/webserver/ping`, {
              timeout: 1000,
            });

            const homeyId = res.headers.get('x-homey-id');
            if (!homeyId) continue;

            const homey = _.findWhere(this._homeys, { id: homeyId });
            if (homey) {
              homey.usb = ip;
            }
          } catch (err) { }
        }
      }
    }

    return this._homeys;
  }

  async getActiveHomey() {
    if (this._activeHomey) return this._activeHomey;

    let activeHomey = await Settings.get('activeHomey');
    if (activeHomey === null) {
      activeHomey = await this.selectActiveHomey();
    }
    const homey = await this.getHomey(activeHomey.id);
    const homeyApi = await homey.authenticate({
      ...(homey.apiVersion >= 3
        ? {}
        : {
          strategy: ['localSecure', 'local'],
        }
      ),
    }).catch(err => {
      if (err && err.cause === 'homey_offline') {
        throw new Error(`${homey.name} seems to be offline! (${homey.localUrl}, ${homey.localUrlSecure})`);
      }
      throw err;
    });

    if (homey.name) {
      homeyApi.name = homey.name;
    }

    if (homey.version) {
      homeyApi.version = homey.version;
    }

    if (homey.platform) {
      homeyApi.platform = homey.platform;
    }

    if (homey.platformVersion) {
      homeyApi.platformVersion = homey.platformVersion;
    }

    if (homey.language) {
      homeyApi.language = homey.language;
    }

    if (homey.apiVersion) {
      homeyApi.apiVersion = homey.apiVersion;
    }

    if (homey.usb) {
      homeyApi.baseUrl = Promise.resolve(`http://${homey.usb}:80`);
    }

    this._activeHomey = homeyApi;

    return this._activeHomey;
  }

  async setActiveHomey({ id, name }) {
    return Settings.set('activeHomey', { id, name });
  }

  async unsetActiveHomey() {
    return Settings.unset('activeHomey');
  }

  async selectActiveHomey({
    id,
    name,
    filter = {
      online: true,
      local: true,
    },
  } = {}) {
    const homeys = await this.getHomeys();
    let activeHomey;

    if (typeof id === 'string') {
      activeHomey = _.findWhere(homeys, { _id: id });
    } else if (typeof name === 'string') {
      activeHomey = _.findWhere(homeys, { name });
    } else {
      const answers = await inquirer.prompt([
        {
          type: 'list',
          name: 'homey',
          message: 'Choose an active Homey:',
          choices: homeys
            .filter(homey => {
              if (filter.online && homey.state && homey.state.indexOf('online') !== 0) return false;
              return true;
            })
            .map(homey => {
              return {
                value: {
                  name: homey.name,
                  id: homey._id,
                },
                name: homey.name,
              };
            }),
        },
      ]);

      activeHomey = answers.homey;
    }

    if (!activeHomey) {
      throw new Error('No Homey found');
    }

    const result = await this.setActiveHomey(activeHomey);

    Log(`You have selected \`${activeHomey.name}\` as your active Homey.`);

    return result;
  }

  async unselectActiveHomey() {
    await this.unsetActiveHomey();
    Log('You have unselected your active Homey.');
  }

  async createDelegationToken(opts) {
    await this._initApi();
    return this._api.createDelegationToken(opts);
  }

}

module.exports = AthomApi;
