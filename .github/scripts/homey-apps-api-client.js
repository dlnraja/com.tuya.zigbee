'use strict';

const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DEFAULT_TIMEOUT_MS = Number(process.env.HOMEY_API_TIMEOUT_MS || 60000);

function resolveModule(id, extraPaths = []) {
  return require.resolve(id, {
    paths: [
      ...extraPaths,
      ROOT,
      process.cwd(),
    ],
  });
}

function loadModule(candidates) {
  const errors = [];
  for (const candidate of candidates) {
    try {
      return candidate();
    } catch (error) {
      errors.push(error.message);
    }
  }
  throw new Error(errors.join(' | '));
}

function loadAthomApi() {
  return loadModule([
    () => {
      const AthomApi = require(resolveModule('homey/services/AthomApi'));
      if (typeof AthomApi.createDelegationToken !== 'function') {
        throw new Error('homey/services/AthomApi missing createDelegationToken');
      }
      return AthomApi;
    },
    () => {
      const AthomApi = require(resolveModule('homey/lib/AthomApi'));
      if (typeof AthomApi.createDelegationToken !== 'function') {
        throw new Error('homey/lib/AthomApi missing createDelegationToken');
      }
      return AthomApi;
    },
  ]);
}

function loadAthomAppsApi() {
  return loadModule([
    () => require(resolveModule('homey-api/lib/AthomAppsAPI')),
    () => {
      const homeyPackageRoot = path.dirname(resolveModule('homey/package.json'));
      return require(resolveModule('homey-api/lib/AthomAppsAPI', [homeyPackageRoot]));
    },
    () => {
      const { AthomAppsAPI } = require(resolveModule('homey-api'));
      if (!AthomAppsAPI) throw new Error('homey-api missing AthomAppsAPI export');
      return AthomAppsAPI;
    },
    () => {
      const homeyPackageRoot = path.dirname(resolveModule('homey/package.json'));
      const { AthomAppsAPI } = require(resolveModule('homey-api', [homeyPackageRoot]));
      if (!AthomAppsAPI) throw new Error('homey-api missing AthomAppsAPI export');
      return AthomAppsAPI;
    },
    () => {
      const { AthomAppsAPI } = require(resolveModule('athom-api'));
      if (!AthomAppsAPI) throw new Error('athom-api missing AthomAppsAPI export');
      return AthomAppsAPI;
    },
  ]);
}

function normalizeToken(tokenObj) {
  return tokenObj?.token || tokenObj?.access_token || tokenObj;
}

function normalizeBuilds(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.builds)) return response.builds;
  if (Array.isArray(response?.items)) return response.items;
  return [];
}

function sdkModulesAvailable() {
  try {
    loadAthomApi();
    loadAthomAppsApi();
    return true;
  } catch (_e) {
    return false;
  }
}

async function createClient({ log = () => {}, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  // Auto-Publish (run 44937269110) lists and promotes via this helper after npm ci:
  // AthomApi (homey@4.4.1) wraps HOMEY_PAT as AthomCloudAPIToken.access_token,
  // then AthomCloudAPI.createDelegationToken({ audience: 'apps' }) and AthomAppsAPI.
  // Raw Bearer REST to apps-api.athom.com with the PAT or a hand-rolled delegation
  // token returns 401 (runs 44965860182 / 44967442304). The Live job must install
  // the pinned homey CLI so these modules resolve.
  if (!sdkModulesAvailable()) {
    const err = new Error('Homey CLI AthomApi modules are not installed here; install pinned homey@4.4.1 in the job');
    err.code = 'ATHOM_API_MODULE_MISSING';
    throw err;
  }
  const AthomApi = loadAthomApi();
  const AthomAppsAPI = loadAthomAppsApi();
  // _initApi() would otherwise call interactive login() if the PAT is not a
  // logged-in Cloud token. Fail closed in CI instead of hanging on a browser prompt.
  if (typeof AthomApi._createApi === 'function') {
    AthomApi._createApi();
    if (AthomApi._api && typeof AthomApi._api.isLoggedIn === 'function') {
      let loggedIn = false;
      try {
        loggedIn = await AthomApi._api.isLoggedIn();
      } catch (error) {
        const err = new Error('HOMEY_PAT is not accepted as an Athom Cloud login: ' + (error.message || error));
        err.code = 'HOMEY_PAT_NOT_LOGGED_IN';
        throw err;
      }
      if (!loggedIn) {
        const err = new Error('HOMEY_PAT is not accepted as an Athom Cloud login (expired or lacking scope); not starting interactive login');
        err.code = 'HOMEY_PAT_NOT_LOGGED_IN';
        throw err;
      }
    }
  }
  log('  [HomeySDK] Requesting apps delegation token...');
  let token = null;
  try {
    token = normalizeToken(await AthomApi.createDelegationToken({ audience: 'apps' }));
  } catch (error) {
    log(`  [HomeySDK] SDK delegation failed: ${error.message}`);
  }
  if (!token && process.env.HOMEY_REFRESH_TOKEN) {
    // Fallback chain (portal-cartography 2026-08-05): OAuth refresh token →
    // account token → POST api.athom.com/delegation/token?audience=apps.
    // Covers the case where HOMEY_PAT is a publish-only PAT that the SDK
    // delegation rejects.
    try {
      log('  [HomeySDK] Trying HOMEY_REFRESH_TOKEN delegation fallback...');
      const { refreshHomeyToken } = require('../../scripts/ci/homey-token-refresh');
      const accountToken = await refreshHomeyToken();
      if (accountToken) {
        const res = await fetch('https://api.athom.com/delegation/token?audience=apps', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${accountToken}` },
        });
        if (res.ok) {
          // Response is a raw JWT (JSON-encoded string) — strip quotes.
          token = String(await res.text()).trim().replace(/^"|"$/g, '');
          if (token) {log('  [HomeySDK] Delegation token obtained via refresh fallback');}
        }
      }
    } catch (error) {
      log(`  [HomeySDK] Refresh-token delegation fallback failed: ${error.message}`);
    }
  }
  if (!token) throw new Error('HomeySDK delegation token missing');
  log('  [HomeySDK] Delegation token obtained');
  return {
    api: new AthomAppsAPI({ token }),
    token,
    timeoutMs,
  };
}

async function getBuilds(client, appId, { limit = 100 } = {}) {
  const response = await client.api.getBuilds({
    $token: client.token,
    $timeout: client.timeoutMs,
    appId,
    $query: { limit },
  });
  return normalizeBuilds(response);
}

async function updateBuildChannel(client, appId, buildId, channel = 'test') {
  return client.api.updateBuildChannel({
    $token: client.token,
    $timeout: client.timeoutMs,
    appId,
    // Athom SDK validates buildId as a string ("Invalid Parameter Type: buildId. Got: number").
    buildId: String(buildId),
    channel,
  });
}

module.exports = {
  createClient,
  getBuilds,
  updateBuildChannel,
  normalizeBuilds,
  sdkModulesAvailable,
};
