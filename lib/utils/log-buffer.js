// lib/utils/log-buffer.js
const LOG_KEY = 'tuya_debug_log_buffer_v1';
const MAX_ENTRIES = 500;
// WHY(P2960): zigbee-retry pushes here on every retry; entries were unbounded (whole error objects /
// frames) and the full array is re-serialised on each push. Cap each entry and the total payload.
const MAX_ENTRY_CHARS = 500;
const MAX_TOTAL_CHARS = 96 * 1024;

function _boundEntry(entry) {
  if (typeof entry === 'string') {return entry.length > MAX_ENTRY_CHARS ? entry.slice(0, MAX_ENTRY_CHARS) : entry;}
  let j;
  try { j = JSON.stringify(entry); } catch (_e) { return '[unserialisable]'; }
  if (j === undefined) {return null;}
  return j.length <= MAX_ENTRY_CHARS ? entry : { truncated: true, preview: j.slice(0, MAX_ENTRY_CHARS) };
}

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
// console.error('[LOG-BUFFER] No homey instance available');
      return;
    }
    
    let current = await homey.settings.get(LOG_KEY) || [];
    if (!Array.isArray(current)) {current = [];}
    current.push({ ts: new Date().toISOString(), entry: _boundEntry(entry) });
    if (current.length > MAX_ENTRIES) {current.splice(0, current.length - MAX_ENTRIES);}
    let size = 0;
    try { size = JSON.stringify(current).length; } catch (_e) { current = current.slice(-10); }
    while (size > MAX_TOTAL_CHARS && current.length > 10) {
      current.splice(0, Math.max(1, Math.floor(current.length / 4)));
      try { size = JSON.stringify(current).length; } catch (_e) { break; }
    }
    await homey.settings.set(LOG_KEY, current);
  } catch (e) {
    // should never crash the app
// console.error('pushLog failed', e);
  }
}

async function readLogs() {
  try {
    const homey = getHomeyInstance();
    if (!homey || !homey.settings) {return [];}
    return await homey.settings.get(LOG_KEY) || [];
  } catch (e) {
    return [];
  }
}

async function clearLogs() {
  try {
    const homey = getHomeyInstance();
    if (!homey || !homey.settings) {return;}
    await homey.settings.set(LOG_KEY, []);
  } catch (e) {
// console.error('clearLogs failed', e);
  }
}

module.exports = { pushLog, readLogs, clearLogs, LOG_KEY, LOG_LIMITS: { MAX_ENTRIES, MAX_ENTRY_CHARS, MAX_TOTAL_CHARS }, _boundEntry };
