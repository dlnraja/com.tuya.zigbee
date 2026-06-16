'use strict';

/**
 * TestFramework - v1.0.0
 * Unified test infrastructure for Tuya Zigbee drivers
 *
 * Features:
 * - Mock DP report generation
 * - Capability update verification
 * - Flow card trigger testing
 * - Device simulation
 * - Assertion helpers
 */
class TestFramework {
  constructor() {
    this._mockDevices = new Map();
    this._testResults = [];
    this._currentSuite = null;
  }

  // ════════════════════════════════════════════════════════════════════════════════
  // TEST SUITE MANAGEMENT
  // ════════════════════════════════════════════════════════════════════════════════

  /**
   * Start a new test suite
   * @param {string} name - Suite name
   */
  describe(name) {
    this._currentSuite = {
      name,
      tests: [],
      startTime: Date.now()
    };
    this.log(`\n═══ ${name} ═══`);
  }

  /**
   * Define a test case
   * @param {string} name - Test name
   * @param {Function} fn - Test function
   */
  it(name, fn) {
    if (!this._currentSuite) {
      throw new Error('Tests must be inside a describe() block');
    }

    const test = {
      name,
      fn,
      status: 'pending',
      duration: 0,
      error: null
    };

    this._currentSuite.tests.push(test);
  }

  /**
   * Run all tests in the current suite
   * @returns {Object} Test results
   */
  async run() {
    if (!this._currentSuite) {
      throw new Error('No test suite defined');
    }

    const results = {
      suite: this._currentSuite.name,
      total: this._currentSuite.tests.length,
      passed: 0,
      failed: 0,
      skipped: 0,
      tests: [],
      duration: 0
    };

    for (const test of this._currentSuite.tests) {
      const startTime = Date.now();
      try {
        await test.fn();
        test.status = 'passed';
        results.passed++;
        this.log(`  ✓ ${test.name}`);
      } catch (err) {
        test.status = 'failed';
        test.error = err.message;
        results.failed++;
        this.log(`  ✗ ${test.name}`);
        this.log(`    Error: ${err.message}`);
      }
      test.duration = Date.now() - startTime;
      results.tests.push({
        name: test.name,
        status: test.status,
        duration: test.duration,
        error: test.error
      });
    }

    results.duration = Date.now() - this._currentSuite.startTime;
    this._testResults.push(results);

    this.log(`\n  Results: ${results.passed}/${results.total} passed (${results.duration}ms)`);

    this._currentSuite = null;
    return results;
  }

  // ════════════════════════════════════════════════════════════════════════════════
  // MOCK DP REPORT GENERATION
  // ════════════════════════════════════════════════════════════════════════════════

  /**
   * Create a mock Tuya DP report
   * @param {number} dpId - DataPoint ID
   * @param {number} dpType - DP type (0=raw, 1=bool, 2=value, 3=string, 4=enum, 5=bitmap)
   * @param {any} value - DP value
   * @returns {Object} Mock DP report
   */
  static createMockDPReport(dpId, dpType, value) {
    // Tuya DP report format: [status, dpId, dpType, length(2), value]
    const typeMap = {
      0: 'raw',
      1: 'boolean',
      2: 'value',
      3: 'string',
      4: 'enum',
      5: 'bitmap'
    };

    return {
      dpId,
      dpType,
      dpTypeName: typeMap[dpType] || 'unknown',
      value,
      hex: TestFramework._toHex(value),
      valid: true
    };
  }

  /**
   * Create a mock multi-DP report
   * @param {Object[]} datapoints - Array of { dpId, dpType, value }
   * @returns {Object} Mock multi-DP report
   */
  static createMockMultiDPReport(datapoints) {
    return {
      dps: datapoints.map(dp =>
        TestFramework.createMockDPReport(dp.dpId, dp.dpType, dp.value)
      ),
      valid: true
    };
  }

  /**
   * Create mock boolean DP report
   * @param {number} dpId - DataPoint ID
   * @param {boolean} value - Boolean value
   * @returns {Object} Mock DP report
   */
  static createMockBoolDP(dpId, value) {
    return TestFramework.createMockDPReport(dpId, 1, value);
  }

  /**
   * Create mock value DP report
   * @param {number} dpId - DataPoint ID
   * @param {number} value - Numeric value
   * @returns {Object} Mock DP report
   */
  static createMockValueDP(dpId, value) {
    return TestFramework.createMockDPReport(dpId, 2, value);
  }

  /**
   * Create mock enum DP report
   * @param {number} dpId - DataPoint ID
   * @param {number} value - Enum value
   * @returns {Object} Mock DP report
   */
  static createMockEnumDP(dpId, value) {
    return TestFramework.createMockDPReport(dpId, 4, value);
  }

  /**
   * Create mock string DP report
   * @param {number} dpId - DataPoint ID
   * @param {string} value - String value
   * @returns {Object} Mock DP report
   */
  static createMockStringDP(dpId, value) {
    return TestFramework.createMockDPReport(dpId, 3, value);
  }

  // ════════════════════════════════════════════════════════════════════════════════
  // CAPABILITY VERIFICATION
  // ════════════════════════════════════════════════════════════════════════════════

  /**
   * Create a mock device for testing
   * @param {string} deviceId - Device ID
   * @param {Object} options - Device options
   * @returns {Object} Mock device
   */
  static createMockDevice(deviceId, options = {}) {
    const device = {
      _id: deviceId,
      _name: options.name || `Test Device ${deviceId}`,
      _capabilities: options.capabilities || ['onoff'],
      _capabilityValues: {},
      _settings: options.settings || {},
      _store: {},
      _available: true,
      _data: { id: deviceId },

      getData() { return this._data; },
      getName() { return this._name; },
      getCapabilities() { return this._capabilities; },
      getAvailable() { return this._available; },

      getCapabilityValue(cap) {
        return this._capabilityValues[cap];
      },

      setCapabilityValue(cap, value) {
        if (!this._capabilities.includes(cap)) {
          throw new Error(`Capability ${cap} not registered`);
        }
        this._capabilityValues[cap] = value;
        return Promise.resolve();
      },

      getSettings() { return this._settings; },
      setSettings(settings) {
        Object.assign(this._settings, settings);
        return Promise.resolve();
      },

      getStoreValue(key) { return this._store[key]; },
      setStoreValue(key, value) {
        this._store[key] = value;
        return Promise.resolve();
      },

      setAvailable(available) { this._available = available; },
      setUnavailable(reason) { this._available = false; },

      log(...args) { /* Silent in tests */ },
      error(...args) { /* Silent in tests */ }
    };

    return device;
  }

  /**
   * Create an assertion helper for capabilities
   * @param {Object} device - Mock device
   * @returns {Object} Assertion helpers
   */
  static assert(device) {
    return {
      /**
       * Assert capability has expected value
       * @param {string} capability - Capability name
       * @param {any} expected - Expected value
       */
      capabilityEquals(capability, expected) {
        const actual = device.getCapabilityValue(capability);
        if (actual !== expected) {
          throw new Error(
            `Expected ${capability} to be ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
          );
        }
      },

      /**
       * Assert capability is defined
       * @param {string} capability - Capability name
       */
      capabilityExists(capability) {
        const caps = device.getCapabilities();
        if (!caps.includes(capability)) {
          throw new Error(`Capability ${capability} not found in device capabilities`);
        }
      },

      /**
       * Assert device is available
       */
      deviceAvailable() {
        if (!device.getAvailable()) {
          throw new Error('Device is not available');
        }
      },

      /**
       * Assert device is unavailable
       */
      deviceUnavailable() {
        if (device.getAvailable()) {
          throw new Error('Device is available but expected unavailable');
        }
      },

      /**
       * Assert setting has expected value
       * @param {string} key - Setting key
       * @param {any} expected - Expected value
       */
      settingEquals(key, expected) {
        const settings = device.getSettings();
        const actual = settings[key];
        if (actual !== expected) {
          throw new Error(
            `Expected setting ${key} to be ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
          );
        }
      }
    };
  }

  // ════════════════════════════════════════════════════════════════════════════════
  // FLOW CARD TESTING
  // ════════════════════════════════════════════════════════════════════════════════

  /**
   * Create a mock flow card
   * @param {string} cardId - Flow card ID
   * @param {Object} options - Card options
   * @returns {Object} Mock flow card
   */
  static createMockFlowCard(cardId, options = {}) {
    const card = {
      _id: cardId,
      _registered: false,
      _runListener: null,
      _args: options.args || {},

      registerRunListener(listener) {
        this._runListener = listener;
        this._registered = true;
        return Promise.resolve();
      },

      async run(args, state) {
        if (!this._runListener) {
          throw new Error('No run listener registered');
        }
        return this._runListener(args || this._args, state || {});
      },

      isRegistered() { return this._registered; }
    };

    return card;
  }

  /**
   * Create a mock flow card container (simulates Homey.flow)
   * @returns {Object} Mock flow container
   */
  static createMockFlowContainer() {
    const cards = new Map();

    return {
      getActionCard(id) {
        if (!cards.has(id)) {
          cards.set(id, TestFramework.createMockFlowCard(id));
        }
        return cards.get(id);
      },

      getConditionCard(id) {
        if (!cards.has(id)) {
          cards.set(id, TestFramework.createMockFlowCard(id));
        }
        return cards.get(id);
      },

      getTriggerCard(id) {
        if (!cards.has(id)) {
          cards.set(id, TestFramework.createMockFlowCard(id));
        }
        return cards.get(id);
      },

      getCard(id) {
        return cards.get(id);
      },

      getAllCards() {
        return [...cards.values()];
      }
    };
  }

  // ════════════════════════════════════════════════════════════════════════════════
  // DP MAPPING TESTS
  // ════════════════════════════════════════════════════════════════════════════════

  /**
   * Test a DP mapping configuration
   * @param {Object} dpConfig - DP configuration
   * @param {any} inputValue - Input value from device
   * @param {any} expectedOutput - Expected capability value
   * @returns {Object} Test result
   */
  static testDPMapping(dpConfig, inputValue, expectedOutput) {
    const result = {
      dpId: dpConfig.dpId,
      capability: dpConfig.capability,
      inputValue,
      expectedOutput,
      actualOutput: null,
      passed: false,
      error: null
    };

    try {
      // Apply transformations
      let output = inputValue;

      // Scale
      if (dpConfig.scale && dpConfig.scale !== 1) {
        output = output / dpConfig.scale;
      }

      // Offset
      if (dpConfig.offset) {
        output = output + dpConfig.offset;
      }

      // Invert
      if (dpConfig.invert) {
        output = !output;
      }

      // Value map
      if (dpConfig.valueMap) {
        output = dpConfig.valueMap[output] ?? output;
      }

      // Range clamp
      if (dpConfig.min !== undefined && output < dpConfig.min) {
        output = dpConfig.min;
      }
      if (dpConfig.max !== undefined && output > dpConfig.max) {
        output = dpConfig.max;
      }

      result.actualOutput = output;
      result.passed = output === expectedOutput;
    } catch (err) {
      result.error = err.message;
    }

    return result;
  }

  // ════════════════════════════════════════════════════════════════════════════════
  // UTILITY METHODS
  // ════════════════════════════════════════════════════════════════════════════════

  /**
   * Convert value to hex string
   * @private
   */
  static _toHex(value) {
    if (typeof value === 'number') {
      return value.toString(16).padStart(2, '0');
    }
    if (typeof value === 'boolean') {
      return value ? '01' : '00';
    }
    if (typeof value === 'string') {
      return Buffer.from(value).toString('hex');
    }
    if (Buffer.isBuffer(value)) {
      return value.toString('hex');
    }
    return '00';
  }

  /**
   * Get all test results
   * @returns {Object[]} Array of test results
   */
  getResults() {
    return this._testResults;
  }

  /**
   * Clear test results
   */
  clearResults() {
    this._testResults = [];
  }

  /**
   * Generate test report
   * @returns {string} Formatted test report
   */
  generateReport() {
    let report = '\n═══════════════════════════════════════════════\n';
    report += 'TEST REPORT\n';
    report += '═══════════════════════════════════════════════\n\n';

    let totalPassed = 0;
    let totalFailed = 0;
    let totalDuration = 0;

    for (const suite of this._testResults) {
      report += `Suite: ${suite.suite}\n`;
      report += `  Passed: ${suite.passed}/${suite.total}\n`;
      report += `  Duration: ${suite.duration}ms\n\n`;

      totalPassed += suite.passed;
      totalFailed += suite.failed;
      totalDuration += suite.duration;

      for (const test of suite.tests) {
        const icon = test.status === 'passed' ? '✓' : '✗';
        report += `  ${icon} ${test.name} (${test.duration}ms)\n`;
        if (test.error) {
          report += `    Error: ${test.error}\n`;
        }
      }
      report += '\n';
    }

    report += '═══════════════════════════════════════════════\n';
    report += `Total: ${totalPassed + totalFailed} tests, ${totalPassed} passed, ${totalFailed} failed\n`;
    report += `Duration: ${totalDuration}ms\n`;
    report += '═══════════════════════════════════════════════\n';

    return report;
  }

  log(...args) {
    console.log(...args);
  }
}

module.exports = TestFramework;
