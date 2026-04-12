import { createRequire } from 'node:module';

import { APIErrorHomeyOffline, HomeyAPI, HomeyAPIV3Local } from 'homey-api';

import AthomApi from '../../services/AthomApi.js';
import { DEFAULT_TIMEOUT } from './ApiCommandConstants.mjs';

const require = createRequire(import.meta.url);
const HomeyApiUtil = require('homey-api/lib/Util');

function normalizeAddress(address) {
  return String(address).replace(/\/+$/, '');
}

function parseAddress(address) {
  try {
    return new URL(address);
  } catch {
    throw new Error('Invalid address. Please provide an absolute URL, e.g. http://192.168.1.100.');
  }
}

export function getRequestTimeout(rawTimeout) {
  // Keep this guard for non-yargs callers that may not pass a timeout.
  if (typeof rawTimeout === 'undefined') {
    return DEFAULT_TIMEOUT;
  }

  const timeout = Number(rawTimeout);

  if (!Number.isFinite(timeout) || timeout <= 0) {
    throw new Error('Invalid timeout. Please provide a positive number in milliseconds.');
  }

  return timeout;
}

function validateAuthFlags({ token, address, homeyId }) {
  if (token && address && homeyId) {
    throw new Error(
      'Invalid option usage: --address and --homey-id cannot be used together with --token.',
    );
  }

  if (token && !address && !homeyId) {
    throw new Error('Missing required option: --address or --homey-id (required with --token).');
  }

  if (!token && address) {
    throw new Error('Invalid option usage: --address can only be used together with --token.');
  }
}

function createTokenHomeyApi({ token, address, homeyId = 'token-homey' }) {
  const normalizedAddress = normalizeAddress(address);
  const parsedAddress = parseAddress(normalizedAddress);
  const properties = {
    id: homeyId,
    softwareVersion: '0.0.0',
  };

  if (parsedAddress.protocol === 'https:') {
    properties.localUrlSecure = normalizedAddress;
  } else {
    properties.localUrl = normalizedAddress;
  }

  return new HomeyAPIV3Local({
    properties,
    strategy: [],
    baseUrl: normalizedAddress,
    token,
  });
}

function applyResolvedHomeyMetadata(homeyApi, homey) {
  if (homey.usb) {
    // Keep USB override behavior in sync with existing AthomApi implementation.
    homeyApi.__baseUrlPromise = Promise.resolve(`http://${homey.usb}:80`);
  }

  homeyApi.model = homey.model;
  return homeyApi;
}

export function getPreferredAuthenticateStrategy(homey) {
  if (homey.platform === HomeyAPI.PLATFORMS.CLOUD) {
    return [HomeyAPI.DISCOVERY_STRATEGIES.CLOUD];
  }

  return [
    HomeyAPI.DISCOVERY_STRATEGIES.LOCAL_SECURE,
    HomeyAPI.DISCOVERY_STRATEGIES.LOCAL,
    HomeyAPI.DISCOVERY_STRATEGIES.REMOTE_FORWARDED,
    HomeyAPI.DISCOVERY_STRATEGIES.CLOUD,
  ];
}

function getDiagnoseStrategyOrder(homey) {
  const preferredStrategies = getPreferredAuthenticateStrategy(homey);

  if (homey.platform === HomeyAPI.PLATFORMS.CLOUD) {
    return preferredStrategies;
  }

  return [...preferredStrategies, HomeyAPI.DISCOVERY_STRATEGIES.MDNS];
}

function getStrategyTarget(homey, strategyId) {
  switch (strategyId) {
    case HomeyAPI.DISCOVERY_STRATEGIES.LOCAL_SECURE:
      return homey.localUrlSecure || null;
    case HomeyAPI.DISCOVERY_STRATEGIES.LOCAL:
      return homey.localUrl || null;
    case HomeyAPI.DISCOVERY_STRATEGIES.REMOTE_FORWARDED:
      return homey.remoteUrlForwarded || null;
    case HomeyAPI.DISCOVERY_STRATEGIES.CLOUD:
      return homey.remoteUrl || null;
    case HomeyAPI.DISCOVERY_STRATEGIES.MDNS:
      return homey.id ? `http://homey-${homey.id}.local` : null;
    default:
      return null;
  }
}

export async function resolveRequestedHomey(homeyId) {
  if (typeof homeyId === 'string' && homeyId.length > 0) {
    return AthomApi.getHomey(homeyId);
  }

  const activeHomey = await AthomApi.getSelectedHomey();

  if (!activeHomey) {
    throw new Error('No active Homey selected. Run `homey select` to choose one.');
  }

  return AthomApi.getHomey(activeHomey.id);
}

function normalizeOfflineError(homey) {
  return new Error(
    `${homey.name} (${homey.id}) seems to be offline. Are you sure you're in the same local network?`,
  );
}

async function authenticateHomey(homey, strategy = getPreferredAuthenticateStrategy(homey)) {
  try {
    const homeyApi = await homey.authenticate({
      strategy,
    });
    return applyResolvedHomeyMetadata(homeyApi, homey);
  } catch (err) {
    if (err instanceof APIErrorHomeyOffline) {
      throw normalizeOfflineError(homey);
    }

    throw err;
  }
}

function normalizeDiagnosticError(err, homey) {
  if (err instanceof APIErrorHomeyOffline) {
    return normalizeOfflineError(homey).message;
  }

  return err?.message ?? String(err);
}

function getTokenModeAddressForHomey(homey) {
  if (homey.usb) {
    return `http://${homey.usb}:80`;
  }

  if (homey.localUrlSecure) {
    return homey.localUrlSecure;
  }

  if (homey.localUrl) {
    return homey.localUrl;
  }

  const homeyLabel = homey.name ? `${homey.name} (${homey.id})` : homey.id;
  throw new Error(`${homeyLabel} does not expose a usable local address for token mode.`);
}

async function createTokenHomeyApiForHomey({ token, homeyId }) {
  const homey = await AthomApi.getHomey(homeyId);
  const homeyApi = createTokenHomeyApi({
    token,
    address: getTokenModeAddressForHomey(homey),
    homeyId: homey.id,
  });

  return applyResolvedHomeyMetadata(homeyApi, homey);
}

export async function createHomeyApiClient({ token, address, homeyId }) {
  validateAuthFlags({ token, address, homeyId });

  if (token && address) {
    return createTokenHomeyApi({ token, address });
  }

  if (token && homeyId) {
    return createTokenHomeyApiForHomey({ token, homeyId });
  }

  const homey = await resolveRequestedHomey(homeyId);
  return authenticateHomey(homey);
}

export async function diagnoseHomeyStrategies({ homeyId } = {}) {
  const homey = await resolveRequestedHomey(homeyId);
  const preferredStrategyIds = getPreferredAuthenticateStrategy(homey);
  const attemptedStrategyIds = getDiagnoseStrategyOrder(homey);
  const results = [];

  for (const strategyId of attemptedStrategyIds) {
    const startedAt = Date.now();
    const configuredTarget = getStrategyTarget(homey, strategyId);
    let api = null;

    if (strategyId === HomeyAPI.DISCOVERY_STRATEGIES.REMOTE_FORWARDED && !configuredTarget) {
      results.push({
        strategyId,
        available: false,
        status: 'not-configured',
        durationMs: 0,
        error: 'Not configured for this Homey',
      });
      continue;
    }

    try {
      api = await homey.authenticate({
        strategy: [strategyId],
      });

      results.push({
        strategyId,
        available: true,
        status: 'available',
        durationMs: Date.now() - startedAt,
        resolvedStrategyId: api?.strategyId ?? api?.__strategyId ?? strategyId,
        baseUrl: await api?.baseUrl,
      });
    } catch (err) {
      results.push({
        strategyId,
        available: false,
        status: 'failed',
        durationMs: Date.now() - startedAt,
        error: normalizeDiagnosticError(err, homey),
      });
    } finally {
      await disposeHomeyApiClient(api);
    }
  }

  const availableStrategyIds = results
    .filter((result) => result.available)
    .map((result) => result.strategyId);
  const selectedResult =
    results.find(
      (result) => result.available && preferredStrategyIds.includes(result.strategyId),
    ) ??
    results.find((result) => result.available) ??
    null;

  return {
    target: {
      id: homey.id,
      name: homey.name,
      platform: homey.platform,
      model: homey.model ?? null,
      usb: homey.usb ?? null,
    },
    preferredStrategyIds,
    attemptedStrategyIds,
    availableStrategyIds,
    selectedStrategyId: selectedResult?.strategyId ?? null,
    selectedBaseUrl: selectedResult?.baseUrl ?? null,
    results,
  };
}

export async function disposeHomeyApiClient(api) {
  if (!api || typeof api !== 'object') {
    return;
  }

  for (const manager of Object.values(api.__managers || {})) {
    if (typeof manager?.destroy === 'function') {
      manager.destroy();
    }
  }

  for (const [key, value] of Object.entries(api.__refreshMap || {})) {
    if (key.endsWith('timeout')) {
      clearTimeout(value);
      delete api.__refreshMap[key];
    }
  }

  if (typeof api.disconnect === 'function') {
    await api.disconnect().catch(() => {});
  }

  if (typeof api.destroy === 'function') {
    api.destroy();
  }
}

export async function callHomeyApi({ api, callOptions, captureMetadata = false }) {
  if (!captureMetadata) {
    const startedAt = Date.now();
    const result = await api.call(callOptions);

    return {
      result,
      durationMs: Date.now() - startedAt,
      request: null,
      response: null,
    };
  }

  const originalFetch = HomeyApiUtil.fetch;
  const metadata = {
    request: null,
    response: null,
  };
  const startedAt = Date.now();

  HomeyApiUtil.fetch = async (url, options, timeoutDuration, timeoutMessage) => {
    metadata.request = {
      url,
      method: options?.method,
      headers: options?.headers || {},
      timeoutDuration,
    };

    const response = await originalFetch.call(
      HomeyApiUtil,
      url,
      options,
      timeoutDuration,
      timeoutMessage,
    );

    metadata.response = {
      url: response.url || url,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      contentType: response.headers.get('content-type'),
    };

    return response;
  };

  try {
    const result = await api.call(callOptions);

    return {
      result,
      durationMs: Date.now() - startedAt,
      request: metadata.request,
      response: metadata.response,
    };
  } finally {
    HomeyApiUtil.fetch = originalFetch;
  }
}

export default {
  callHomeyApi,
  createHomeyApiClient,
  diagnoseHomeyStrategies,
  disposeHomeyApiClient,
  getPreferredAuthenticateStrategy,
  getRequestTimeout,
  resolveRequestedHomey,
};
