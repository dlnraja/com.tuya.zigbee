import { HomeyAPIV3Cloud, HomeyAPIV3Local } from 'homey-api';

// Intentionally scoped to the managers supported by CLI commands.
const HOMEY_MANAGER_WHITELIST = new Set([
  'alarms',
  'api',
  'apps',
  'arp',
  'backup',
  'ble',
  'videos',
  'clock',
  'cloud',
  'coprocessor',
  'cron',
  'database',
  'dashboards',
  'devices',
  'devkit',
  'discovery',
  'drivers',
  'energy',
  'energydongle',
  'experiments',
  'flow',
  'flowtoken',
  'geolocation',
  'googleAssistant',
  'i18n',
  'icons',
  'images',
  'insights',
  'ledring',
  'logic',
  'matter',
  'mobile',
  'moods',
  'notifications',
  'presence',
  'rf',
  'safety',
  'satellites',
  'security',
  'sessions',
  'system',
  'thread',
  'updates',
  'users',
  'vdevice',
  'weather',
  'webserver',
  'zigbee',
  'zones',
  'zwave',
]);

export const HOMEY_API_AVAILABILITY = {
  LOCAL: 'local',
  CLOUD: 'cloud',
  BOTH: 'both',
};

let cachedHomeyV3LocalSpecification = null;
let cachedHomeyV3CloudSpecification = null;
let cachedMergedHomeyApiSpecification = null;

export function camelToKebab(input) {
  return String(input)
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

function getManagerCliName(manager) {
  return camelToKebab(manager.idCamelCase);
}

function getHomeyV3LocalSpecification() {
  if (cachedHomeyV3LocalSpecification) return cachedHomeyV3LocalSpecification;

  const api = new HomeyAPIV3Local({
    properties: {
      id: 'homey-cli-spec',
      softwareVersion: '0.0.0',
    },
    strategy: [],
    baseUrl: 'http://127.0.0.1',
    token: null,
  });

  cachedHomeyV3LocalSpecification = api.getSpecification();

  return cachedHomeyV3LocalSpecification;
}

function getHomeyV3CloudSpecification() {
  if (cachedHomeyV3CloudSpecification) return cachedHomeyV3CloudSpecification;

  const api = new HomeyAPIV3Cloud({
    id: 'homey-cli-spec',
    version: '0.0.0',
    baseUrl: 'https://homey-cli.invalid',
    token: null,
  });

  cachedHomeyV3CloudSpecification = api.getSpecification();

  return cachedHomeyV3CloudSpecification;
}

function getManagerIdentifier(managerName, manager) {
  return manager?.idCamelCase || manager?.id || managerName;
}

function getAvailability({ hasLocal, hasCloud }) {
  if (hasLocal && hasCloud) return HOMEY_API_AVAILABILITY.BOTH;
  if (hasLocal) return HOMEY_API_AVAILABILITY.LOCAL;
  return HOMEY_API_AVAILABILITY.CLOUD;
}

function buildIndexedEntries(entries) {
  const indexedEntries = new Map();

  entries.forEach(([managerName, manager]) => {
    indexedEntries.set(getManagerIdentifier(managerName, manager), {
      managerName,
      manager,
    });
  });

  return indexedEntries;
}

function mergeManagerOperations(localManager = null, cloudManager = null) {
  const localOperations = localManager?.operations || {};
  const cloudOperations = cloudManager?.operations || {};
  const operationIds = new Set([...Object.keys(cloudOperations), ...Object.keys(localOperations)]);
  const mergedOperations = {};

  operationIds.forEach((operationId) => {
    const localOperation = localOperations[operationId];
    const cloudOperation = cloudOperations[operationId];

    mergedOperations[operationId] = {
      ...(cloudOperation || {}),
      ...(localOperation || {}),
      availability: getAvailability({
        hasLocal: Boolean(localOperation),
        hasCloud: Boolean(cloudOperation),
      }),
    };
  });

  return mergedOperations;
}

function mergeManagerEntries(localEntry = null, cloudEntry = null) {
  const localManager = localEntry?.manager || null;
  const cloudManager = cloudEntry?.manager || null;
  const baseManager = localManager || cloudManager;

  return [
    localEntry?.managerName || cloudEntry?.managerName,
    {
      ...(cloudManager || {}),
      ...(localManager || {}),
      availability: getAvailability({
        hasLocal: Boolean(localManager),
        hasCloud: Boolean(cloudManager),
      }),
      id: baseManager?.id,
      idCamelCase: baseManager?.idCamelCase,
      operations: mergeManagerOperations(localManager, cloudManager),
    },
  ];
}

export function mergeHomeyApiSpecifications(localSpecification, cloudSpecification) {
  const localManagers = buildIndexedEntries(Object.entries(localSpecification?.managers || {}));
  const cloudManagers = buildIndexedEntries(Object.entries(cloudSpecification?.managers || {}));
  const managerIdentifiers = new Set([...cloudManagers.keys(), ...localManagers.keys()]);
  const mergedManagers = {};

  managerIdentifiers.forEach((managerIdentifier) => {
    const [managerName, manager] = mergeManagerEntries(
      localManagers.get(managerIdentifier),
      cloudManagers.get(managerIdentifier),
    );

    mergedManagers[managerName] = manager;
  });

  return {
    ...(cloudSpecification || {}),
    ...(localSpecification || {}),
    managers: mergedManagers,
  };
}

export function isAvailabilitySupportedByPlatform(availability, platform) {
  return (
    availability === HOMEY_API_AVAILABILITY.BOTH ||
    availability === platform ||
    typeof availability === 'undefined'
  );
}

export function formatAvailabilityLabel(availability) {
  switch (availability) {
    case HOMEY_API_AVAILABILITY.LOCAL:
      return 'local';
    case HOMEY_API_AVAILABILITY.CLOUD:
      return 'cloud';
    case HOMEY_API_AVAILABILITY.BOTH:
    default:
      return 'both';
  }
}

export function getHomeyApiSpecification() {
  if (cachedMergedHomeyApiSpecification) return cachedMergedHomeyApiSpecification;

  cachedMergedHomeyApiSpecification = mergeHomeyApiSpecifications(
    getHomeyV3LocalSpecification(),
    getHomeyV3CloudSpecification(),
  );

  return cachedMergedHomeyApiSpecification;
}

function createHomeyManagerDefinition([managerName, manager]) {
  const operations = Object.entries(manager.operations || {})
    .filter(([, operation]) => operation.private !== true)
    .map(([operationId, operation]) => {
      return {
        id: operationId,
        cliName: camelToKebab(operationId),
        method: String(operation.method || 'get').toUpperCase(),
        path: operation.path || '/',
        parameters: operation.parameters || {},
        availability: operation.availability || HOMEY_API_AVAILABILITY.BOTH,
      };
    });

  const defaultOperation = operations[0] || null;

  return {
    managerName,
    managerId: manager.id,
    managerIdCamelCase: manager.idCamelCase,
    managerCliName: getManagerCliName(manager),
    availability: manager.availability || HOMEY_API_AVAILABILITY.BOTH,
    operations,
    defaultOperationId: defaultOperation ? defaultOperation.id : null,
  };
}

export function getHomeyManagerDefinitions() {
  const specification = getHomeyApiSpecification();

  return Object.entries(specification.managers || {})
    .filter(([, manager]) => HOMEY_MANAGER_WHITELIST.has(manager.idCamelCase))
    .sort(([, leftManager], [, rightManager]) => {
      return String(leftManager.idCamelCase).localeCompare(String(rightManager.idCamelCase));
    })
    .map((managerEntry) => createHomeyManagerDefinition(managerEntry));
}

export function getHomeyManagerDefinition(managerReference) {
  return (
    getHomeyManagerDefinitions().find(
      (managerDefinition) =>
        managerDefinition.managerIdCamelCase === managerReference ||
        managerDefinition.managerCliName === managerReference,
    ) || null
  );
}

export default {
  camelToKebab,
  formatAvailabilityLabel,
  getHomeyApiSpecification,
  getHomeyManagerDefinitions,
  getHomeyManagerDefinition,
  isAvailabilitySupportedByPlatform,
  mergeHomeyApiSpecifications,
};
