'use strict';

const { OAuth2Client } = require('homey-oauth2app');

class SmartThingsOAuth2Client extends OAuth2Client {

  static API_URL = 'https://api.smartthings.com/v1';
  static TOKEN_URL = 'https://api.smartthings.com/oauth/token';
  static AUTHORIZATION_URL = 'https://api.smartthings.com/oauth/authorize';
  static SCOPES = ['r:locations:*', 'r:devices:*', 'x:devices:*'];

  /*
   * By default, homey-oauth2app looks for env.json. 
   * Since this is a Universal App and SmartThings has strict user limits,
   * we allow users to provide their own client ID and Secret via Homey App Settings.
   */
  get _clientId() {
    return this.homey.settings.get('smartthings_client_id') || this.homey.env.SMARTTHINGS_CLIENT_ID;
  }

  get _clientSecret() {
    return this.homey.settings.get('smartthings_client_secret') || this.homey.env.SMARTTHINGS_CLIENT_SECRET;
  }

  async getDevices() {
    const res = await this.get({ path: '/devices' });
    return res.items || [];
  }

  async getDeviceStatus(deviceId) {
    return this.get({ path: `/devices/${deviceId}/status` });
  }

  async executeCommand(deviceId, capability, command, args = []) {
    const payload = {
      commands: [
        {
          component: 'main',
          capability: capability,
          command: command,
          arguments: args
        }
      ]
    };
    return this.post({ path: `/devices/${deviceId}/commands`, json: payload });
  }
}

module.exports = SmartThingsOAuth2Client;
