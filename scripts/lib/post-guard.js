'use strict';
/**
 * Guard against autonomous posting (forum, GitHub comments, email replies, chat).
 * Constitution: agents never post on their own. A script that posts must call
 * assertPostAllowed(channel) first; it throws unless the run was explicitly approved
 * (ALLOW_AUTO_POST=true set by a human-dispatched workflow input).
 */
function isPostAllowed(env = process.env) {
  return String(env.ALLOW_AUTO_POST || '').toLowerCase() === 'true';
}

function assertPostAllowed(channel, env = process.env) {
  if (!isPostAllowed(env)) {
    const err = new Error(`[post-guard] posting to ${channel} blocked: set ALLOW_AUTO_POST=true from a human-approved dispatch`);
    err.code = 'POST_BLOCKED';
    throw err;
  }
  return true;
}

module.exports = { isPostAllowed, assertPostAllowed };
