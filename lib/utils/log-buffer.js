// lib/utils/log-buffer.js
const LOG_KEY = 'tuya_debug_log_buffer_v1';
const MAX_ENTRIES = 500;

async function pushLog(entry) {
  try {
    const Homey = require('homey');
    const current = (await Homey.ManagerSettings.get(LOG_KEY)) || [];
    current.push({ ts: new Date().toISOString(), entry });
    if (current.length > MAX_ENTRIES) current.splice(0, current.length - MAX_ENTRIES);
    await Homey.ManagerSettings.set(LOG_KEY, current);
  } catch (e) {
    // should never crash the app
    console.error('pushLog failed', e);
  }
}

async function readLogs() {
  try {
    const Homey = require('homey');
    return (await Homey.ManagerSettings.get(LOG_KEY)) || [];
  } catch (e) {
    return [];
  }
}

async function clearLogs() {
  try {
    const Homey = require('homey');
    await Homey.ManagerSettings.set(LOG_KEY, []);
  } catch (e) {
    console.error('clearLogs failed', e);
  }
}

module.exports = { pushLog, readLogs, clearLogs, LOG_KEY };
