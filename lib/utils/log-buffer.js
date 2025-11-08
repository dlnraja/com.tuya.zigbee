// lib/utils/log-buffer.js
const LOG_KEY = 'tuya_debug_log_buffer_v1';
const MAX_ENTRIES = 500;

// Get homey instance from global context
function getHomeyInstance() {
  try {
    // Try to get from global Homey app instance
    if (global.Homey && global.Homey.app) {
      return global.Homey.app.homey;
    }
    // Fallback: require and get app
    const Homey = require('homey');
    if (Homey.app && Homey.app.homey) {
      return Homey.app.homey;
    }
    return null;
  } catch (e) {
    return null;
  }
}

async function pushLog(entry) {
  try {
    const homey = getHomeyInstance();
    if (!homey || !homey.settings) {
      console.error('[LOG-BUFFER] No homey instance available');
      return;
    }
    
    const current = (await homey.settings.get(LOG_KEY)) || [];
    current.push({ ts: new Date().toISOString(), entry });
    if (current.length > MAX_ENTRIES) current.splice(0, current.length - MAX_ENTRIES);
    await homey.settings.set(LOG_KEY, current);
  } catch (e) {
    // should never crash the app
    console.error('pushLog failed', e);
  }
}

async function readLogs() {
  try {
    const homey = getHomeyInstance();
    if (!homey || !homey.settings) return [];
    return (await homey.settings.get(LOG_KEY)) || [];
  } catch (e) {
    return [];
  }
}

async function clearLogs() {
  try {
    const homey = getHomeyInstance();
    if (!homey || !homey.settings) return;
    await homey.settings.set(LOG_KEY, []);
  } catch (e) {
    console.error('clearLogs failed', e);
  }
}

module.exports = { pushLog, readLogs, clearLogs, LOG_KEY };
