'use strict';

const os = require('os');
const path = require('path');

/** Directory prepare-publish writes. Diagnostic mode must not fall back to the ordinary temp dir. */
function stagingDir(env = process.env) {
  if (String(env.PUBLISH_DIAGNOSTIC_CATALOGUE || '') === '1') {
    return path.resolve(env.PUBLISH_DIAGNOSTIC_DIR || path.join(os.tmpdir(), 'homey-diag-catalogue'));
  }
  return path.join(os.tmpdir(), 'homey-publish-temp');
}

/** Directory later steps must read. HOMEY_PUBLISH_DIR wins after prepare-publish exports it. */
function preparedDir(env = process.env) {
  if (env.HOMEY_PUBLISH_DIR) return path.resolve(env.HOMEY_PUBLISH_DIR);
  return stagingDir(env);
}

function isPreparedPublishPath(dir, env = process.env) {
  const normalized = path.resolve(String(dir || '')).replace(/[/\\]+$/, '');
  if (path.resolve(preparedDir(env)) === normalized) return true;
  return /(?:homey-publish-temp|homey-diag-catalogue)$/i.test(normalized);
}

module.exports = { stagingDir, preparedDir, isPreparedPublishPath };
