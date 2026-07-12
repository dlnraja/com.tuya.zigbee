'use strict';

const PROTECTED_UPSTREAM = 'johanbendz/com.tuya.zigbee';
const OWN_REPO = 'dlnraja/com.tuya.zigbee';
// Own-repository close/reopen transitions remain manual. Verified PR merges on
// dlnraja stay available; every merge on the protected upstream is still denied.
const FORBIDDEN_STATE_ACTIONS = new Set(['close', 'reopen']);

function normalizeRepo(value = '') {
  const cleaned = String(value).trim().toLowerCase()
    .replace(/^https?:\/\/(?:api\.)?github\.com\//, '')
    .replace(/^repos\//, '')
    .replace(/^\/+/, '');
  const parts = cleaned.split(/[\/?#]/).filter(Boolean);
  return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : cleaned;
}

function repoFromTarget(target = '') {
  const match = String(target).match(/(?:api\.github\.com\/)?repos\/([^/]+)\/([^/?#]+)/i);
  return match ? normalizeRepo(`${match[1]}/${match[2]}`) : normalizeRepo(target);
}

function isProtectedUpstream(repoOrTarget) {
  return repoFromTarget(repoOrTarget) === PROTECTED_UPSTREAM;
}

function inferAction(target = '', method = 'POST', body = null) {
  const path = String(target).toLowerCase();
  const verb = String(method).toUpperCase();
  if (/\/merge(?:\?|$)/.test(path)) return 'merge';
  if (/\/reviews?(?:\?|$)/.test(path)) return 'review';
  if (/\/labels?(?:\?|$)/.test(path)) return 'label';
  if (/\/comments?(?:\?|$)/.test(path)) return verb === 'DELETE' ? 'delete-comment' : 'comment';
  if (body && typeof body === 'object' && body.state === 'closed') return 'close';
  if (body && typeof body === 'object' && body.state === 'open') return 'reopen';
  return verb === 'GET' || verb === 'HEAD' ? 'read' : 'write';
}

function mutationAllowed(repoOrTarget, action = 'write') {
  const repo = repoFromTarget(repoOrTarget);
  if (isProtectedUpstream(repo)) return false;
  if (process.env.READ_ONLY_SHADOW === 'true' && repo !== OWN_REPO) return false;
  if (FORBIDDEN_STATE_ACTIONS.has(String(action).toLowerCase())) return false;
  return true;
}

function apiMutationAllowed(target, method = 'POST', body = null) {
  const action = inferAction(target, method, body);
  return mutationAllowed(target, action);
}

function shadowSkip(target, method = 'POST', body = null, log = console.log) {
  const repo = repoFromTarget(target);
  const action = inferAction(target, method, body);
  if (apiMutationAllowed(target, method, body)) return false;
  log(`[SHADOW] Blocked ${action} mutation on ${repo || target}; read/scan remains enabled.`);
  return true;
}

module.exports = {
  PROTECTED_UPSTREAM,
  OWN_REPO,
  normalizeRepo,
  repoFromTarget,
  isProtectedUpstream,
  inferAction,
  mutationAllowed,
  apiMutationAllowed,
  shadowSkip,
};
