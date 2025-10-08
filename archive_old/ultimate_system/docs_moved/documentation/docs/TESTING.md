# Testing Tuya Zigbee Drivers

This document provides comprehensive information about testing the Tuya Zigbee drivers for Homey.

## Table of Contents
- [Testing Framework](#testing-framework)
- [Running Tests](#running-tests)
- [Test Structure](#test-structure)
- [Writing Tests](#writing-tests)
- [Test Coverage](#test-coverage)
- [Continuous Integration](#continuous-integration)
- [Best Practices](#best-practices)

## Testing Framework

We use the following testing tools:
- **Mocha**: Test framework for running unit and integration tests
- **Chai**: Assertion library (with chai-as-promised for async assertions)
- **Sinon**: For spies, stubs, and mocks
- **NYC**: For code coverage reporting
- **Mocha Multi-Reporters**: For generating multiple test reports

## Running Tests

### Install Dependencies
```bash
npm install
```

### Run All Tests
```bash
npm test
```

### Run Unit Tests Only
```bash
npm run test:unit
```

### Run Integration Tests
```bash
npm run test:integration
```

### Run End-to-End Tests
```bash
npm run test:e2e
```

### Run Tests with Coverage
```bash
npm run test:coverage
```

### Run Specific Test File
```bash
npx mocha path/to/test/file.test.js
```

### Watch Mode
```bash
npm run test:watch
```

## Test Structure

```
test/
├── config/                    # Test configuration files
│   └── mocha-multi-reporters.json
├── e2e/                      # End-to-end tests
├── fixtures/                  # Test fixtures
├── integration/               # Integration tests
│   └── drivers/               # Driver integration tests
│       └── sensors-TS0601_motion.integration.js
├── unit/                      # Unit tests
│   └── drivers/               # Driver unit tests
│       └── sensors-TS0601_motion.test.js
└── test-helper.js             # Test utilities and mocks
```

## Writing Tests

### Unit Tests

Unit tests should focus on testing individual functions or methods in isolation. Mock all external dependencies.

Example:
```javascript
const { expect } = require('chai');
const sinon = require('sinon');
const { mockHomey, HomeyDevice } = require('../test-helper');
const Driver = require('../../drivers/sensors-TS0601_motion/device');

describe('TS0601 Motion Sensor - Unit', () => {
  let device;
  
  beforeEach(() => {
    // Create a test device instance
    device = new HomeyDevice({
      id: 'test-device',
      name: 'Test Motion Sensor',
      settings: {
        motion_reset: 60,
        temperature_offset: 0,
      },
      capabilities: ['alarm_motion', 'measure_temperature']
    });
    
    // Initialize the driver with the test device
    driver = new Driver();
    driver.homey = mockHomey;
  });
  
  afterEach(() => {
    sinon.restore();
  });
  
  it('should initialize with default values', async () => {
    await driver.onInit();
    expect(device.getCapabilityValue('alarm_motion')).to.be.false;
  });
  
  // More test cases...
});
```

### Integration Tests

Integration tests should test the interaction between components without mocking internal behavior.

Example:
```javascript
const { expect } = require('chai');
const { ZCL } = require('zigbee-clusters');
const { mockHomey, HomeyDevice } = require('../test-helper');
const Driver = require('../../drivers/sensors-TS0601_motion/device');

describe('TS0601 Motion Sensor - Integration', function() {
  this.timeout(10000); // Increase timeout for integration tests
  
  let device;
  let zclNode;
  
  before(async () => {
    // Set up real ZCL node for testing
    zclNode = new ZCL.Node({
      manufacturerID: 0x1002, // Tuya manufacturer ID
      networkAddress: 0x1234,
    });
    
    // Add endpoints and clusters
    await zclNode.addEndpoint(1, {
      inputClusters: [
        ZCL.ClusterId.genBasic,
        ZCL.ClusterId.ssIasZone,
      ],
    });
  });
  
  // Test cases...
});
```

### Best Practices

1. **Test Organization**:
   - Group related tests with `describe` blocks
   - Use clear, descriptive test names
   - Keep tests focused and test one thing per test case

2. **Test Data**:
   - Use factory functions to create test data
   - Keep test data close to the tests that use it
   - Use meaningful values in test data

3. **Assertions**:
   - Prefer specific assertions over general ones
   - Test both happy path and error cases
   - Verify the behavior, not the implementation

4. **Mocks and Stubs**:
   - Mock external dependencies
   - Use stubs for controlling function behavior
   - Verify important interactions with spies

## Test Coverage

We aim for high test coverage to ensure code quality. The coverage report is generated when running tests with coverage:

```bash
npm run test:coverage
```

This will generate coverage reports in multiple formats in the `coverage/` directory.

## Continuous Integration

Tests are automatically run on every push and pull request using GitHub Actions. The CI pipeline includes:

1. Linting and type checking
2. Unit tests
3. Integration tests
4. Code coverage reporting
5. Build and package validation

## Best Practices

### Writing Testable Code

1. **Single Responsibility**: Each function should do one thing
2. **Dependency Injection**: Pass dependencies as parameters
3. **Pure Functions**: Favor pure functions when possible
4. **Avoid Side Effects**: Isolate side effects

### Test Maintenance

1. **Keep Tests Fast**: Avoid slow operations in tests
2. **Isolate Tests**: Tests should not depend on each other
3. **Clean Up**: Reset state between tests
4. **Update Tests**: Keep tests in sync with code changes

### Debugging Tests

To debug tests, you can use:

```bash
# Run specific test with debug output
DEBUG=* npx mocha test/unit/drivers/sensors-TS0601_motion.test.js

# Debug with Node.js inspector
node --inspect-brk node_modules/.bin/_mocha test/unit/drivers/sensors-TS0601_motion.test.js
```

Then open Chrome and navigate to `chrome://inspect` to debug.
