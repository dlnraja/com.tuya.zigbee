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

async function createClient({ log = () => {}, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const AthomApi = loadAthomApi();
  const AthomAppsAPI = loadAthomAppsApi();
  log('  [HomeySDK] Requesting apps delegation token...');
  const token = normalizeToken(await AthomApi.createDelegationToken({ audience: 'apps' }));
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
    buildId,
    channel,
  });
}

module.exports = {
  createClient,
  getBuilds,
  updateBuildChannel,
  normalizeBuilds,
};
