'use strict';

/**
 * P3374 / t1015u / t1016u - Flow recovery constants.
 * Credit: Flow Converter by late4marshmellow (app.l4m.flowconverter),
 * forum https://community.homey.app/t/154906 and
 * https://github.com/late4marshmellow/app.l4m.flowconverter
 * (also thanks Martijn Poppen's API Playground, as credited there).
 *
 * This Zigbee/Wi-Fi device app must NOT request homey:manager:api.
 * Athom: that permission is for Tools apps whose main purpose is the Web API
 * (https://apps.developer.homey.app/the-basics/app/permissions). Store review
 * can reject a device app that adds it. Writes stay off unless an explicit
 * kill-switch is lifted AND the user confirms a preview.
 */

const FLOW_CONVERTER = {
  name: 'Flow Converter',
  author: 'late4marshmellow',
  appId: 'app.l4m.flowconverter',
  forum: 'https://community.homey.app/t/154906',
  github: 'https://github.com/late4marshmellow/app.l4m.flowconverter',
  store: 'https://homey.app/a/app.l4m.flowconverter',
  note: 'Optional third-party app, never a dependency of this app.',
};

/** Writes are off by default. Set both the env and the setting to enable. */
function writesEnabled(settings) {
  if (process.env.FLOW_REMAP_WRITES === '0') {return false;}
  if (process.env.FLOW_REMAP_WRITES !== '1') {return false;}
  if (!settings || settings.flow_remap_writes_enabled !== true) {return false;}
  return true;
}

const CONFIRM_TOKEN = 'APPLY';
const BACKUP_MAX = 5;

module.exports = { FLOW_CONVERTER, writesEnabled, CONFIRM_TOKEN, BACKUP_MAX };
