'use strict';

/**
 * Forum text → fingerprints + cluster IDs + reliability symptoms.
 * Used by silent scanners. Never posts.
 */

const { parseClusterMentions } = require('../../lib/zigbee/ZclClusterLexicon');

const MFR_RE = /_T[YZ](?:E200|E204|E284|E28[0-9A-Z]*|ZB\d{2}|3000|3002|3210|3218|ST11)[_-][A-Za-z0-9]{6,}/gi;
const PID_RE = /\bTS\d{4}[A-Z]?\b/g;
const ISSUE_RE = /\b(?:crash|timeout|battery|button|dimmer|cover|curtain|blind|thermostat|TRV|scale|divisor|kWh|unavailable|offline|no.?data|not.?work|wrong.?driver|unknown|lux|luminance|SOS|presence|soil|irrigation|flow|burst|bleed|cross.?link|jitter|rejoin|power.?restore|gang|endpoint)\b/gi;

function extractForumSignals(text) {
  const src = String(text || '').replace(/<[^>]+>/g, ' ');
  const mfrs = [...new Set((src.match(MFR_RE) || []).map((m) => m.toUpperCase()))];
  const pids = [...new Set(src.match(PID_RE) || [])];
  const issues = [...new Set((src.match(ISSUE_RE) || []).map((s) => s.toLowerCase()))];
  const clusters = parseClusterMentions(src);
  return { mfrs, pids, issues, clusters };
}

module.exports = {
  extractForumSignals,
  MFR_RE,
  PID_RE,
  ISSUE_RE,
};
