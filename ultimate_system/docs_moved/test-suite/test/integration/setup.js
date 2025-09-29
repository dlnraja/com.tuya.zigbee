// Setup file for Jest tests
import { configure } from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';

// Configure Enzyme
configure({ adapter: new Adapter() });

// Mock global objects
if (typeof window !== 'undefined') {
  global.window.resizeTo = (width, height) => {
    global.window.innerWidth = width || global.window.innerWidth;
    global.window.innerHeight = height || global.window.innerHeight;
    global.window.dispatchEvent(new Event('resize'));
  };
}

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
  removeItem: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
  removeItem: jest.fn(),
};
global.sessionStorage = sessionStorageMock;

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock requestAnimationFrame
global.requestAnimationFrame = (callback) => {
  return setTimeout(callback, 0);
};

global.cancelAnimationFrame = (id) => {
  clearTimeout(id);
};

// Mock Date
const mockDate = new Date('2023-01-01T00:00:00.000Z');
global.Date = jest.fn(() => mockDate);
global.Date.UTC = jest.fn(() => mockDate.valueOf());
global.Date.now = jest.fn(() => mockDate.valueOf());

// Mock console methods
console.error = jest.fn();
console.warn = jest.fn();
console.info = jest.fn();
console.debug = jest.fn();

// Add a test environment setup
beforeEach(() => {
  // Reset all mocks before each test
  jest.clearAllMocks();
  
  // Reset localStorage mock
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.clear.mockClear();
  localStorageMock.removeItem.mockClear();
  
  // Reset sessionStorage mock
  sessionStorageMock.getItem.mockClear();
  sessionStorageMock.setItem.mockClear();
  sessionStorageMock.clear.mockClear();
  sessionStorageMock.removeItem.mockClear();
  
  // Reset console mocks
  console.error.mockClear();
  console.warn.mockClear();
  console.info.mockClear();
  console.debug.mockClear();
});

// Global teardown
afterEach(() => {
  // Cleanup after each test
  jest.restoreAllMocks();
});

// Global test timeout
jest.setTimeout(30000); // 30 seconds

// Mock modules
jest.mock('homey', () => ({
  __esModule: true,
  default: {
    __: (key) => key, // Simple translation mock
  },
}));

// Mock other global objects as needed
global.Homey = {
  __: (key) => key,
  __apps: {},
  __i18n: {},
  __: (key) => key,
  __i18n_default_locale: 'en',
  __i18n_fallbacks: true,
  __i18n_override: {},
  __i18n_options: {},
  __i18n_store: {},
  __i18n_used: {},
  __i18n_warned: {},
  __i18n: {
    __: (key) => key,
  },
  __: (key) => key,
  __i18n_default_locale: 'en',
  __i18n_fallbacks: true,
  __i18n_override: {},
  __i18n_options: {},
  __i18n_store: {},
  __i18n_used: {},
  __i18n_warned: {},
};

// Add any other global mocks or configurations as needed
