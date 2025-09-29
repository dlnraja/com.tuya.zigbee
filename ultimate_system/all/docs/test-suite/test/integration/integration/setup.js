// Configuration pour les tests d'intégration
process.env.NODE_ENV = 'test';

// Mocks globaux
global.__ = (str) => str; // Pour les traductions

// Configuration de base pour Homey
const Homey = require('homey');
const { ManagerSettings } = require('homey');

// Configuration des logs de test
const testLogs = [];
const testErrors = [];

// Redirection des logs pour les tests
beforeEach(() => {
  console.log = (...args) => testLogs.push(args);
  console.error = (...args) => testErrors.push(args);
});

// Utilitaires de test
global.getTestLogs = () => [...testLogs];
global.getTestErrors = () => [...testErrors];
global.clearTestLogs = () => {
  testLogs.length = 0;
  testErrors.length = 0;
};

// Configuration des timeouts
jest.setTimeout(process.env.TEST_TIMEOUT || 30000);

// Configuration des mocks pour les modules natifs
jest.mock('fs-extra', () => ({
  readFile: jest.fn().mockResolvedValue('{}'),
  writeFile: jest.fn().mockResolvedValue(undefined),
  ensureDir: jest.fn().mockResolvedValue(undefined),
  pathExists: jest.fn().mockResolvedValue(true),
  readJson: jest.fn().mockResolvedValue({}),
  writeJson: jest.fn().mockResolvedValue(undefined),
}));

// Configuration pour les tests asynchrones
const originalSetImmediate = global.setImmediate;
const originalSetTimeout = global.setTimeout;

// Configuration des timers pour les tests
beforeAll(() => {
  global.setImmediate = (fn, ...args) => fn(...args);
  global.setTimeout = (fn, delay, ...args) => {
    if (typeof fn === 'function') {
      return originalSetImmediate(fn, ...args);
    }
    return originalSetTimeout(fn, delay, ...args);
  };
});

// Nettoyage après les tests
afterAll(() => {
  global.setImmediate = originalSetImmediate;
  global.setTimeout = originalSetTimeout;
});

// Configuration pour les tests de fichiers
global.createTestFile = (filename, content = '') => {
  const fs = require('fs-extra');
  return fs.writeFile(filename, content);
};

global.readTestFile = async (filename) => {
  const fs = require('fs-extra');
  return fs.readFile(filename, 'utf8');
};

// Configuration pour les tests d'API
const nock = require('nock');

beforeEach(() => {
  nock.cleanAll();
  nock.disableNetConnect();
  nock.enableNetConnect('127.0.0.1');
});

afterEach(() => {
  nock.cleanAll();
  nock.enableNetConnect();
});

// Configuration pour les tests de base de données
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();
});

afterAll(async () => {
  if (mongoServer) {
    await mongoServer.stop();
  }
});

// Configuration pour les tests de composants React
const { configure } = require('enzyme');
const Adapter = require('@wojtekmaj/enzyme-adapter-react-17');

configure({ adapter: new Adapter() });

// Configuration pour les tests Redux
const configureMockStore = require('redux-mock-store').default;
const thunk = require('redux-thunk').default;

const middlewares = [thunk];
const mockStore = configureMockStore(middlewares);

global.createMockStore = (initialState = {}) => {
  return mockStore({
    ...initialState,
  });
};

// Configuration pour les tests de hooks React
const { renderHook } = require('@testing-library/react-hooks');
const React = require('react');

global.renderHook = (callback, options) => {
  const wrapper = ({ children }) => (
    <React.Fragment>{children}</React.Fragment>
  );
  return renderHook(callback, { wrapper, ...options });
};
