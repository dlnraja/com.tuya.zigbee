// Test setup file

// Configure environment variables
process.env.NODE_ENV = 'test';

// Mock Homey environment
if (!global.Homey) {
  global.Homey = {
    __: (key) => key, // i18n mock
    logger: {
      info: console.log,
      error: console.error,
      debug: console.debug,
      log: console.log,
    },
  };
}

// Mock Homey modules
jest.mock('homey');

// Set up chai
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinonChai = require('sinon-chai');

chai.use(chaiAsPromised);
chai.use(sinonChai);

// Set up global test utilities
global.expect = chai.expect;
global.sinon = require('sinon');

// Configure sinon
beforeEach(() => {
  // Create a sandbox for each test
  global.sandbox = sinon.createSandbox();
  
  // Stub console methods
  global.sandbox.stub(console, 'log');
  global.sandbox.stub(console, 'error');
  global.sandbox.stub(console, 'warn');
  global.sandbox.stub(console, 'info');
  global.sandbox.stub(console, 'debug');
});

afterEach(() => {
  // Restore the sandbox
  global.sandbox.restore();
});

// Add a helper for testing async/await
const _setImmediate = setImmediate;
const _clearImmediate = clearImmediate;

global.setImmediate = (callback, ...args) => {
  const start = Date.now();
  return _setImmediate(() => {
    if (Date.now() - start < 15) {
      callback(...args);
    }
  });
};

global.clearImmediate = _clearImmediate;

// Add a helper for testing promises
global.flushPromises = () => new Promise((resolve) => setImmediate(resolve));

// Add a helper for testing timeouts
global.delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Add a helper for testing events
global.emitEvent = (emitter, event, ...args) => {
  emitter.emit(event, ...args);
  return global.flushPromises();
};

// Add a helper for testing async functions
global.testAsync = (fn) => async () => {
  try {
    await fn();
  } catch (error) {
    // Log the error for debugging
    console.error('Test failed:', error);
    throw error;
  }
};

// Add a helper for testing errors
global.expectError = (promise, errorMessage) => {
  return promise
    .then(() => {
      throw new Error('Expected an error to be thrown');
    })
    .catch((error) => {
      if (errorMessage) {
        if (typeof errorMessage === 'string') {
          expect(error.message).to.include(errorMessage);
        } else if (errorMessage instanceof RegExp) {
          expect(error.message).to.match(errorMessage);
        } else if (typeof errorMessage === 'function') {
          errorMessage(error);
        }
      }
    });
};

// Add a helper for testing timers
global.tick = (ms) => {
  const now = Date.now();
  const target = now + ms;
  while (Date.now() < target) {
    // Busy wait
  }
};

// Add a helper for testing with fake timers
global.withFakeTimers = async (fn) => {
  const originalSetTimeout = global.setTimeout;
  const originalClearTimeout = global.clearTimeout;
  const originalSetInterval = global.setInterval;
  const originalClearInterval = global.clearInterval;
  const originalDateNow = Date.now;
  
  let time = Date.now();
  const timers = new Set();
  
  global.setTimeout = (fn, delay, ...args) => {
    const id = Symbol();
    const timer = {
      id,
      fn: () => fn(...args),
      time: time + (delay || 0),
    };
    timers.add(timer);
    return id;
  };
  
  global.clearTimeout = (id) => {
    for (const timer of timers) {
      if (timer.id === id) {
        timers.delete(timer);
        break;
      }
    }
  };
  
  global.setInterval = (fn, interval, ...args) => {
    const id = Symbol();
    const timer = {
      id,
      fn: () => {
        fn(...args);
        timer.time = time + interval;
      },
      time: time + (interval || 0),
      interval,
    };
    timers.add(timer);
    return id;
  };
  
  global.clearInterval = (id) => {
    for (const timer of timers) {
      if (timer.id === id) {
        timers.delete(timer);
        break;
      }
    }
  };
  
  Date.now = () => time;
  
  const advanceTime = (ms) => {
    time += ms;
    const timersToRun = [];
    
    for (const timer of timers) {
      if (timer.time <= time) {
        timersToRun.push(timer);
      }
    }
    
    for (const timer of timersToRun) {
      if (timers.has(timer)) {
        timers.delete(timer);
        timer.fn();
        
        if (timer.interval) {
          timer.time += timer.interval;
          timers.add(timer);
        }
      }
    }
  };
  
  try {
    await fn({ advanceTime });
  } finally {
    global.setTimeout = originalSetTimeout;
    global.clearTimeout = originalClearTimeout;
    global.setInterval = originalSetInterval;
    global.clearInterval = originalClearInterval;
    Date.now = originalDateNow;
  }
};

// Add a helper for testing with mocks
global.withMocks = (mocks, fn) => {
  const original = {};
  
  for (const [key, value] of Object.entries(mocks)) {
    const [object, property] = key.split('.');
    
    if (object === 'global') {
      original[property] = global[property];
      global[property] = value;
    } else if (object === 'process') {
      original[`process.${property}`] = process[property];
      process[property] = value;
    } else {
      const parts = key.split('.');
      let obj = global;
      
      for (let i = 0; i < parts.length - 1; i++) {
        obj = obj[parts[i]];
      }
      
      const prop = parts[parts.length - 1];
      original[key] = obj[prop];
      obj[prop] = value;
    }
  }
  
  try {
    return fn();
  } finally {
    for (const [key, value] of Object.entries(original)) {
      const [object, property] = key.split('.');
      
      if (object === 'global') {
        global[property] = value;
      } else if (object === 'process') {
        process[property] = value;
      } else {
        const parts = key.split('.');
        let obj = global;
        
        for (let i = 0; i < parts.length - 1; i++) {
          obj = obj[parts[i]];
        }
        
        const prop = parts[parts.length - 1];
        obj[prop] = value;
      }
    }
  }
};

// Add a helper for testing with spies
global.withSpies = (spies, fn) => {
  const original = {};
  
  for (const key of spies) {
    const [object, property] = key.split('.');
    
    if (object === 'global') {
      original[property] = global[property];
      global[property] = sinon.spy(global[property]);
    } else if (object === 'process') {
      original[`process.${property}`] = process[property];
      process[property] = sinon.spy(process[property]);
    } else {
      const parts = key.split('.');
      let obj = global;
      
      for (let i = 0; i < parts.length - 1; i++) {
        obj = obj[parts[i]];
      }
      
      const prop = parts[parts.length - 1];
      original[key] = obj[prop];
      obj[prop] = sinon.spy(obj[prop]);
    }
  }
  
  try {
    return fn();
  } finally {
    for (const [key, value] of Object.entries(original)) {
      const [object, property] = key.split('.');
      
      if (object === 'global') {
        global[property] = value;
      } else if (object === 'process') {
        process[property] = value;
      } else {
        const parts = key.split('.');
        let obj = global;
        
        for (let i = 0; i < parts.length - 1; i++) {
          obj = obj[parts[i]];
        }
        
        const prop = parts[parts.length - 1];
        obj[prop] = value;
      }
    }
  }
};

// Add a helper for testing with stubs
global.withStubs = (stubs, fn) => {
  const original = {};
  
  for (const [key, value] of Object.entries(stubs)) {
    const [object, property] = key.split('.');
    
    if (object === 'global') {
      original[property] = global[property];
      global[property] = typeof value === 'function' ? value() : value;
    } else if (object === 'process') {
      original[`process.${property}`] = process[property];
      process[property] = typeof value === 'function' ? value() : value;
    } else {
      const parts = key.split('.');
      let obj = global;
      
      for (let i = 0; i < parts.length - 1; i++) {
        obj = obj[parts[i]];
      }
      
      const prop = parts[parts.length - 1];
      original[key] = obj[prop];
      obj[prop] = typeof value === 'function' ? value() : value;
    }
  }
  
  try {
    return fn();
  } finally {
    for (const [key, value] of Object.entries(original)) {
      const [object, property] = key.split('.');
      
      if (object === 'global') {
        global[property] = value;
      } else if (object === 'process') {
        process[property] = value;
      } else {
        const parts = key.split('.');
        let obj = global;
        
        for (let i = 0; i < parts.length - 1; i++) {
          obj = obj[parts[i]];
        }
        
        const prop = parts[parts.length - 1];
        obj[prop] = value;
      }
    }
  }
};
