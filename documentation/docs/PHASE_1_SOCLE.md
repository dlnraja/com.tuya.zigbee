# Phase 1 - Reconstruction du socle (21-80)

## Objectif
Mettre en place l'architecture de base de l'application et les composants fondamentaux.

## Structure du socle

### 21-30 : Structure de base

#### 21. Structure des dossiers avancée
```
src/
├── app/                 # Code principal de l'application
│   ├── drivers/         # Pilotes spécifiques
│   ├── lib/             # Bibliothèques partagées
│   │   ├── tuya/        # Logique spécifique à Tuya
│   │   └── zigbee/      # Utilitaires Zigbee
│   └── homey/           # Intégrations Homey
├── assets/             
│   ├── images/         # Images de l'application
│   └── translations/   # Fichiers de traduction
└── test/               # Tests
    ├── unit/           # Tests unitaires
    └── integration/    # Tests d'intégration
```

#### 22. Configuration TypeScript avancée
Mise à jour de `tsconfig.json` :
```json
{
  "compilerOptions": {
    "target": "es2020",
    "module": "commonjs",
    "lib": ["es2020"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "baseUrl": ".",
    "paths": {
      "@app/*": ["src/app/*"],
      "@lib/*": ["src/lib/*"],
      "@test/*": ["test/*"]
    }
  },
  "include": ["src/**/*.ts", "test/**/*.ts"],
  "exclude": ["node_modules", ".homey*", "dist"]
}
```

#### 23. Configuration ESLint avancée
Fichier `.eslintrc.js` :
```javascript
module.exports = {
  root: true,
  env: {
    node: true,
    es2021: true,
    jest: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'prettier'],
  rules: {
    'prettier/prettier': 'error',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    '@typescript-eslint/explicit-module-boundary-types': 'off',
  },
};
```

#### 24. Configuration de base de l'application
Fichier `src/app/app.js` :
```javascript
'use strict';

const { Log } = require('homey');
const Homey = require('homey');

class TuyaZigbeeApp extends Homey.App {
  async onInit() {
    this.log('Initializing Tuya Zigbee app...');
    
    // Initialisation des gestionnaires d'erreur
    process.on('unhandledRejection', (reason, p) => {
      this.error('Unhandled Rejection at:', p, 'reason:', reason);
    });
    
    process.on('uncaughtException', (error) => {
      this.error('Uncaught Exception:', error);
    });
    
    this.log('Tuya Zigbee app has been initialized');
  }
}

module.exports = TuyaZigbeeApp;
```

#### 25. Configuration du driver de base
Création du fichier `src/app/drivers/base/driver.js` :
```javascript
'use strict';

const Homey = require('homey');
const { ZigbeeDevice } = require('homey-zigbeedriver');

class TuyaZigbeeDriver extends Homey.Driver {
  async onInit() {
    this.log('Tuya Zigbee driver initialized');
  }

  async onPairListDevices() {
    return [];
  }

  onPair(session) {
    this.log('Pairing started');
    
    session.setHandler('list_devices', async () => {
      return this.onPairListDevices();
    });
  }
}

module.exports = TuyaZigbeeDriver;
```

#### 26. Configuration du device de base
Création du fichier `src/app/drivers/base/device.js` :
```javascript
'use strict';

const { ZigbeeDevice } = require('homey-zigbeedriver');

class TuyaZigbeeDevice extends ZigbeeDevice {
  async onNodeInit() {
    this.log('Device initialized');
    
    // Enable debugging
    this.enableDebug();
    
    // Print the node's info to the console
    this.printNode();
    
    // Register capabilities from device settings
    await this.registerCapabilities();
  }
  
  async registerCapabilities() {
    // To be implemented by specific device classes
  }
  
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('Settings updated:', changedKeys);
  }
}

module.exports = TuyaZigbeeDevice;
```

#### 27. Configuration du fichier app.json avancé
Mise à jour du fichier `src/app.json` :
```json
{
  "id": "com.tuya.zigbee",
  "sdk": 3,
  "name": {
    "en": "Tuya Zigbee",
    "fr": "Tuya Zigbee"
  },
  "version": "1.0.0",
  "compatibility": ">=5.0.0",
  "author": {
    "name": "DLN Raja",
    "email": "contact@example.com"
  },
  "category": [
    "appliances"
  ],
  "permissions": [
    "homey:wireless:zigbee",
    "homey:app:com.tuya"
  ],
  "images": {
    "large": "/assets/images/large.png",
    "small": "/assets/images/small.png"
  },
  "platforms": [
    "local"
  ],
  "dependencies": {
    "homey-zigbeedriver": "^1.7.0",
    "homey-meshdriver": "^1.3.0"
  },
  "drivers": [
    {
      "id": "tuya_switch",
      "name": {
        "en": "Tuya Switch",
        "fr": "Interrupteur Tuya"
      },
      "class": "switch",
      "capabilities": ["onoff"],
      "images": {
        "large": "/drivers/tuya_switch/assets/images/large.png",
        "small": "/drivers/tuya_switch/assets/images/small.png"
      }
    }
  ]
}
```

#### 28. Fichier README.md technique
Création du fichier `DEVELOPER.md` :
```markdown
# Guide du développeur

## Structure du projet

### Architecture
- `src/app/` - Code principal de l'application
  - `drivers/` - Pilotes spécifiques
  - `lib/` - Bibliothèques partagées
  - `homey/` - Intégrations Homey

### Conventions de code
- TypeScript pour tout nouveau code
- Documentation JSDoc pour les méthodes publiques
- Tests unitaires pour toute nouvelle fonctionnalité

## Développement

### Configuration initiale
```bash
# Installer les dépendances
npm install

# Lancer en mode développement
npm start
```

### Tests
```bash
# Lancer les tests unitaires
npm test:unit

# Lancer les tests d'intégration
npm test:integration

# Lancer tous les tests
npm test
```

### Soumettre des modifications
1. Créer une nouvelle branche pour votre fonctionnalité
2. Faire des commits atomiques avec des messages descriptifs
3. Pousser votre branche et créer une Pull Request
```

#### 29. Configuration des tests
Création du fichier `test/setup.js` :
```javascript
// Configuration globale des tests
process.env.NODE_ENV = 'test';

// Extend Jest with custom matchers
require('jest-extended');

// Setup global test timeout
jest.setTimeout(30000);
```

#### 30. Exemple de test unitaire
Création du fichier `test/unit/app.test.js` :
```javascript
'use strict';

const { test } = require('@jest/globals');
const TuyaZigbeeApp = require('../../src/app/app');

let app;

describe('TuyaZigbeeApp', () => {
  beforeEach(() => {
    app = new TuyaZigbeeApp();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should initialize without errors', () => {
    expect(() => app.onInit()).not.toThrow();
  });
});
```

## 31-40 : Implémentation des utilitaires de base

### 31. Utilitaire de journalisation
Création du fichier `src/app/lib/logger.js` :
```javascript
'use strict';

const { Log } = require('homey');

class Logger {
  constructor(prefix = 'TuyaZigbee') {
    this.prefix = `[${prefix}]`;
    this.logger = new Log(prefix);
  }

  info(message, ...args) {
    this.logger.info(this._formatMessage(message), ...args);
  }

  error(message, ...args) {
    this.logger.error(this._formatMessage(message), ...args);
  }

  debug(message, ...args) {
    this.logger.debug(this._formatMessage(message), ...args);
  }

  warn(message, ...args) {
    this.logger.warn(this._formatMessage(message), ...args);
  }

  _formatMessage(message) {
    return `${this.prefix} ${message}`;
  }
}

module.exports = Logger;
```

### 32. Gestionnaire d'erreurs
Création du fichier `src/app/lib/error-handler.js` :
```javascript
'use strict';

const Logger = require('./logger');

class ErrorHandler {
  constructor() {
    this.logger = new Logger('ErrorHandler');
    this.initialize();
  }

  initialize() {
    process.on('unhandledRejection', (reason, promise) => {
      this.handleError('Unhandled Rejection at:', promise, 'reason:', reason);
    });

    process.on('uncaughtException', (error) => {
      this.handleError('Uncaught Exception:', error);
    });
  }

  handleError(...args) {
    this.logger.error(...args);
    // TODO: Implement error reporting service integration
  }

  static createError(name, message, statusCode = 500) {
    const error = new Error(message);
    error.name = name;
    error.statusCode = statusCode;
    return error;
  }
}

module.exports = new ErrorHandler();
```

### 33. Utilitaire de configuration
Création du fichier `src/app/lib/config.js` :
```javascript
'use strict';

const Logger = require('./logger');

class Config {
  constructor() {
    this.logger = new Logger('Config');
    this.config = {};
  }

  load() {
    try {
      // Load from environment variables
      this.config = {
        env: process.env.NODE_ENV || 'development',
        debug: process.env.DEBUG === 'true',
        logLevel: process.env.LOG_LEVEL || 'info',
        homeySettings: {
          // Default Homey settings
          pollingInterval: parseInt(process.env.POLLING_INTERVAL, 10) || 30000,
          maxRetries: parseInt(process.env.MAX_RETRIES, 10) || 3,
        },
      };

      this.logger.info('Configuration loaded');
      return this.config;
    } catch (error) {
      this.logger.error('Failed to load configuration:', error);
      throw error;
    }
  }

  get(key, defaultValue = null) {
    return key.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : defaultValue), this.config);
  }
}

module.exports = new Config();
```

### 34. Utilitaire de validation
Création du fichier `src/app/lib/validator.js` :
```javascript
'use strict';

class Validator {
  static isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  static isNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
  }

  static isNumber(value) {
    return typeof value === 'number' && !Number.isNaN(value);
  }

  static isPositiveNumber(value) {
    return this.isNumber(value) && value >= 0;
  }

  static isFunction(value) {
    return typeof value === 'function';
  }

  static validate(schema, data) {
    const errors = [];
    
    for (const [key, validator] of Object.entries(schema)) {
      if (!validator(data[key])) {
        errors.push(`Invalid value for '${key}'`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

module.exports = Validator;
```

### 35. Utilitaire de promesse
Création du fichier `src/app/lib/promise-utils.js` :
```javascript
'use strict';

class PromiseUtils {
  static delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static timeout(promise, ms, error = new Error('Promise timeout')) {
    return Promise.race([
      promise,
      new Promise((_, reject) => 
        setTimeout(() => reject(error), ms)
      )
    ]);
  }

  static retry(fn, { retries = 3, delay = 1000 } = {}) {
    return fn().catch(err => {
      if (retries <= 1) throw err;
      return this.delay(delay).then(() => 
        this.retry(fn, { retries: retries - 1, delay })
      );
    });
  }
}

module.exports = PromiseUtils;
```

### 36. Utilitaire de chaînes de caractères
Création du fichier `src/app/lib/string-utils.js` :
```javascript
'use strict';

class StringUtils {
  static toCamelCase(str) {
    return str.replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''));
  }

  static toSnakeCase(str) {
    return str
      .replace(/([A-Z])/g, '_$1')
      .replace(/^_/, '')
      .toLowerCase();
  }

  static capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  static format(template, ...args) {
    return template.replace(/{([0-9]+)}/g, (match, index) => 
      typeof args[index] !== 'undefined' ? args[index] : match
    );
  }
}

module.exports = StringUtils;
```

### 37. Tests pour les utilitaires
Création du fichier `test/unit/lib/validator.test.js` :
```javascript
'use strict';

const Validator = require('../../../src/app/lib/validator');

describe('Validator', () => {
  describe('isObject', () => {
    test('should return true for objects', () => {
      expect(Validator.isObject({})).toBe(true);
      expect(Validator.isObject({ key: 'value' })).toBe(true);
    });

    test('should return false for non-objects', () => {
      expect(Validator.isObject(null)).toBe(false);
      expect(Validator.isObject([])).toBe(false);
      expect(Validator.isObject('string')).toBe(false);
      expect(Validator.isObject(123)).toBe(false);
    });
  });

  describe('validate', () => {
    test('should validate object against schema', () => {
      const schema = {
        name: value => typeof value === 'string' && value.length > 0,
        age: value => Number.isInteger(value) && value >= 0
      };

      const validData = { name: 'John', age: 30 };
      const invalidData = { name: '', age: -5 };

      expect(Validator.validate(schema, validData).isValid).toBe(true);
      expect(Validator.validate(schema, invalidData).isValid).toBe(false);
    });
  });
});
```

### 38. Mise à jour de la configuration de test
Mise à jour du fichier `jest.config.js` :
```javascript
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/test/unit/**/*.test.js'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/app/**/*.js',
    '!**/node_modules/**',
    '!**/test/**',
    '!**/__mocks__/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  setupFilesAfterEnv: ['<rootDir>/test/setup.js']
};
```

### 39. Scripts NPM supplémentaires
Mise à jour de `package.json` :
```json
{
  "scripts": {
    "test:unit": "jest --testMatch='**/test/unit/**/*.test.js'",
    "test:integration": "jest --testMatch='**/test/integration/**/*.test.js'",
    "test:coverage": "jest --coverage",
    "test:watch": "jest --watch",
    "lint:fix": "eslint --fix 'src/**/*.js' 'test/**/*.js'"
  }
}
```

### 40. Documentation des utilitaires
Mise à jour du fichier `DEVELOPER.md` :
```markdown
## Utilitaires

### Logger
Pour une journalisation cohérente à travers l'application :
```javascript
const Logger = require('./lib/logger');
const logger = new Logger('MyComponent');

logger.info('Information message');
logger.error('Error message', error);
```

### Gestion des erreurs
Gestion centralisée des erreurs :
```javascript
const errorHandler = require('./lib/error-handler');

try {
  // Code potentiellement dangereux
} catch (error) {
  errorHandler.handleError('Failed to process data', error);
}
```

### Validation de données
```javascript
const Validator = require('./lib/validator');

const schema = {
  username: Validator.isNonEmptyString,
  age: Validator.isPositiveNumber
};

const result = Validator.validate(schema, { username: 'test', age: 25 });
if (!result.isValid) {
  console.error('Validation failed:', result.errors);
}
```
```

## 41-50 : Gestion des appareils et des capacités

### 41. Gestionnaire d'appareils
Création du fichier `src/app/lib/device-manager.js` :
```javascript
'use strict';

const Logger = require('./logger');
const Validator = require('./validator');

class DeviceManager {
  constructor() {
    this.logger = new Logger('DeviceManager');
    this.devices = new Map();
  }

  registerDevice(device) {
    if (!device || !device.id) {
      throw new Error('Invalid device object');
    }
    
    if (this.devices.has(device.id)) {
      this.logger.warn(`Device ${device.id} already registered`);
      return false;
    }
    
    this.devices.set(device.id, device);
    this.logger.info(`Device registered: ${device.id}`);
    return true;
  }

  unregisterDevice(deviceId) {
    if (!this.devices.has(deviceId)) {
      this.logger.warn(`Device ${deviceId} not found`);
      return false;
    }
    
    this.devices.delete(deviceId);
    this.logger.info(`Device unregistered: ${deviceId}`);
    return true;
  }

  getDevice(deviceId) {
    return this.devices.get(deviceId);
  }

  getAllDevices() {
    return Array.from(this.devices.values());
  }

  getDevicesByType(type) {
    return this.getAllDevices().filter(device => device.type === type);
  }
}

module.exports = new DeviceManager();
```

### 42. Gestionnaire de capacités
Création du fichier `src/app/lib/capability-manager.js` :
```javascript
'use strict';

const Logger = require('./logger');

class CapabilityManager {
  constructor() {
    this.logger = new Logger('CapabilityManager');
    this.capabilities = new Map();
  }

  registerCapability(capability) {
    if (!capability || !capability.id) {
      throw new Error('Invalid capability object');
    }
    
    if (this.capabilities.has(capability.id)) {
      this.logger.warn(`Capability ${capability.id} already registered`);
      return false;
    }
    
    this.capabilities.set(capability.id, capability);
    this.logger.info(`Capability registered: ${capability.id}`);
    return true;
  }

  getCapability(capabilityId) {
    return this.capabilities.get(capabilityId);
  }

  getCapabilities() {
    return Array.from(this.capabilities.values());
  }

  async executeCapability(deviceId, capabilityId, value) {
    const capability = this.getCapability(capabilityId);
    if (!capability || !capability.execute) {
      throw new Error(`Capability ${capabilityId} not found or not executable`);
    }
    
    try {
      await capability.execute(deviceId, value);
      this.logger.info(`Executed ${capabilityId} for device ${deviceId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to execute ${capabilityId}:`, error);
      throw error;
    }
  }
}

module.exports = new CapabilityManager();
```

### 43. Classe de base pour les appareils Tuya
Création du fichier `src/app/devices/tuya-base-device.js` :
```javascript
'use strict';

const { ZigbeeDevice } = require('homey-zigbeedriver');
const Logger = require('../lib/logger');
const deviceManager = require('../lib/device-manager');

class TuyaBaseDevice extends ZigbeeDevice {
  async onNodeInit() {
    this.logger = new Logger(`Device:${this.getData().id}`);
    this.logger.info('Initializing Tuya device');
    
    try {
      await super.onNodeInit();
      await this.initializeDevice();
      await this.registerCapabilities();
      
      deviceManager.registerDevice({
        id: this.getData().id,
        name: this.getName(),
        type: this.getType(),
        capabilities: this.getCapabilities(),
        device: this
      });
      
      this.logger.info('Device initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize device:', error);
      throw error;
    }
  }
  
  getType() {
    return this.constructor.name;
  }
  
  async initializeDevice() {
    // To be implemented by specific device classes
  }
  
  async registerCapabilities() {
    // To be implemented by specific device classes
  }
  
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.logger.info('Settings updated:', changedKeys);
    // Handle settings changes
  }
  
  async onDeleted() {
    this.logger.info('Device deleted');
    deviceManager.unregisterDevice(this.getData().id);
    await super.onDeleted();
  }
}

module.exports = TuyaBaseDevice;
```

### 44. Implémentation d'un interrupteur de base
Création du fichier `src/app/devices/tuya-switch.js` :
```javascript
'use strict';

const TuyaBaseDevice = require('./tuya-base-device');

class TuyaSwitch extends TuyaBaseDevice {
  async registerCapabilities() {
    this.registerCapability('onoff', 'onOff', {
      get: 'onOff',
      set: 'setOnOff',
      report: 'onOff',
      reportParser: value => value === 1
    });
    
    this.registerCapability('measure_power', 'electricalMeasurement', {
      get: 'activePower',
      report: 'activePower',
      reportParser: value => value / 10 // Convert to W
    });
  }
}

module.exports = TuyaSwitch;
```

### 45. Configuration du driver d'interrupteur
Création du fichier `src/app/drivers/tuya-switch/driver.js` :
```javascript
'use strict';

const Homey = require('homey');
const TuyaSwitch = require('../../devices/tuya-switch');

class TuyaSwitchDriver extends Homey.Driver {
  async onInit() {
    this.log('Tuya Switch driver has been initialized');
  }

  async onPairListDevices() {
    // This would typically scan for devices, but for now return a test device
    return [
      {
        name: 'Tuya Switch',
        data: {
          id: 'tuya-switch-1',
          type: 'switch'
        },
        store: {
          // Any device-specific store data
        }
      }
    ];
  }
}

module.exports = TuyaSwitchDriver;
```

### 46. Fichier de configuration du driver
Création du fichier `src/app/drivers/tuya-switch/driver.compose.json` :
```json
{
  "id": "tuya-switch",
  "name": {
    "en": "Tuya Switch",
    "fr": "Interrupteur Tuya"
  },
  "class": "socket",
  "capabilities": [
    "onoff",
    "measure_power"
  ],
  "images": {
    "large": "/drivers/tuya-switch/assets/images/large.png",
    "small": "/drivers/tuya-switch/assets/images/small.png"
  },
  "pair": [
    {
      "id": "list_devices",
      "template": "list_devices",
      "navigation": {
        "next": "add_devices"
      }
    },
    {
      "id": "add_devices",
      "template": "add_devices"
    }
  ]
}
```

### 47. Gestionnaire d'événements
Création du fichier `src/app/lib/event-manager.js` :
```javascript
'use strict';

const EventEmitter = require('events');
const Logger = require('./logger');

class EventManager extends EventEmitter {
  constructor() {
    super();
    this.logger = new Logger('EventManager');
    this.setMaxListeners(100); // Increase max listeners
  }

  emit(event, ...args) {
    this.logger.debug(`Event emitted: ${event}`, { args });
    return super.emit(event, ...args);
  }
  
  on(event, listener) {
    this.logger.debug(`New listener for event: ${event}`);
    return super.on(event, listener);
  }
  
  once(event, listener) {
    this.logger.debug(`New one-time listener for event: ${event}`);
    return super.once(event, listener);
  }
}

module.exports = new EventManager();
```

### 48. Gestionnaire de scènes
Création du fichier `src/app/lib/scene-manager.js` :
```javascript
'use strict';

const Logger = require('./logger');
const deviceManager = require('./device-manager');

class SceneManager {
  constructor() {
    this.logger = new Logger('SceneManager');
    this.scenes = new Map();
  }

  createScene(sceneData) {
    const scene = {
      id: `scene_${Date.now()}`,
      name: sceneData.name || 'New Scene',
      devices: [],
      ...sceneData
    };
    
    this.scenes.set(scene.id, scene);
    this.logger.info(`Created scene: ${scene.id}`);
    return scene;
  }

  async executeScene(sceneId) {
    const scene = this.scenes.get(sceneId);
    if (!scene) {
      throw new Error(`Scene ${sceneId} not found`);
    }
    
    this.logger.info(`Executing scene: ${scene.name}`);
    
    // Execute all device actions in parallel
    const actions = scene.devices.map(deviceAction => 
      this._executeDeviceAction(deviceAction)
    );
    
    await Promise.all(actions);
    this.logger.info(`Scene ${scene.name} executed successfully`);
  }
  
  async _executeDeviceAction({ deviceId, capability, value }) {
    const device = deviceManager.getDevice(deviceId);
    if (!device) {
      this.logger.warn(`Device ${deviceId} not found`);
      return;
    }
    
    try {
      await device.setCapabilityValue(capability, value);
      this.logger.debug(`Set ${capability} to ${value} for device ${deviceId}`);
    } catch (error) {
      this.logger.error(`Failed to execute action for device ${deviceId}:`, error);
      throw error;
    }
  }
}

module.exports = new SceneManager();
```

### 49. Tests pour les gestionnaires
Création du fichier `test/unit/lib/device-manager.test.js` :
```javascript
'use strict';

const DeviceManager = require('../../../src/app/lib/device-manager');

describe('DeviceManager', () => {
  let deviceManager;
  
  beforeEach(() => {
    deviceManager = new (require('../../../src/app/lib/device-manager'))();
  });
  
  afterEach(() => {
    // Clean up after each test
    deviceManager = null;
  });
  
  test('should register a new device', () => {
    const device = { id: 'test-device-1', name: 'Test Device' };
    const result = deviceManager.registerDevice(device);
    
    expect(result).toBe(true);
    expect(deviceManager.getDevice('test-device-1')).toEqual(device);
  });
  
  test('should not register duplicate device', () => {
    const device = { id: 'test-device-1', name: 'Test Device' };
    deviceManager.registerDevice(device);
    
    const result = deviceManager.registerDevice(device);
    expect(result).toBe(false);
  });
  
  test('should unregister a device', () => {
    const device = { id: 'test-device-1', name: 'Test Device' };
    deviceManager.registerDevice(device);
    
    const result = deviceManager.unregisterDevice('test-device-1');
    expect(result).toBe(true);
    expect(deviceManager.getDevice('test-device-1')).toBeUndefined();
  });
});
```

### 50. Documentation des capacités
Mise à jour du fichier `DEVELOPER.md` :
```markdown
## Gestion des appareils et capacités

### Enregistrement d'un nouvel appareil
```javascript
const deviceManager = require('./lib/device-manager');

// Enregistrer un nouvel appareil
const device = {
  id: 'unique-device-id',
  name: 'Mon appareil',
  type: 'switch',
  capabilities: ['onoff', 'measure_power']
};

deviceManager.registerDevice(device);
```

### Gestion des capacités
```javascript
const capabilityManager = require('./lib/capability-manager');

// Exécuter une capacité
await capabilityManager.executeCapability('device-123', 'onoff', true);

// Obtenir toutes les capacités disponibles
const capabilities = capabilityManager.getCapabilities();
```

### Création d'une scène
```javascript
const sceneManager = require('./lib/scene-manager');

// Créer une nouvelle scène
const scene = sceneManager.createScene({
  name: 'Scène du soir',
  devices: [
    { deviceId: 'device-1', capability: 'onoff', value: true },
    { deviceId: 'device-2', capability: 'dim', value: 50 }
  ]
});

// Exécuter la scène
await sceneManager.executeScene(scene.id);
```
```

## Prochaines étapes
- [ ] 51-60 : Suite de la gestion des appareils
- [ ] 61-80 : Tests et validation du socle
