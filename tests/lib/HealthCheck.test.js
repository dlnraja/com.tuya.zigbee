'use strict';

const HealthCheck = require('../../lib/HealthCheck');

describe('HealthCheck', () => {
  let mockDevice;
  let healthCheck;

  beforeEach(() => {
    // Create mock device
    mockDevice = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      hasCapability: jest.fn(() => false),
      getCapabilityValue: jest.fn(() => null),
      getCapabilities: jest.fn(() => ['onoff', 'dim']),
      getCapabilityOptions: jest.fn(() => ({})),
      zclNode: {
        available: true,
        lastSeen: Date.now() - 1000,
        endpoints: {
          1: {
            LQI: 200,
            RSSI: -50,
            clusters: {
              basic: {
                readAttributes: jest.fn().mockResolvedValue({ manufacturerName: 'Test' })
              },
              powerConfiguration: {
                readAttributes: jest.fn().mockResolvedValue({ batteryVoltage: 30 })
              }
            }
          }
        }
      }
    };

    healthCheck = new HealthCheck(mockDevice);
  });

  describe('Constructor', () => {
    it('should initialize with empty history', () => {
      expect(healthCheck.device).toBe(mockDevice);
      expect(healthCheck.history).toEqual([]);
      expect(healthCheck.maxHistorySize).toBe(50);
    });
  });

  describe('check()', () => {
    it('should perform complete health check', async () => {
      const report = await healthCheck.check();

      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('overall');
      expect(report).toHaveProperty('scores');
      expect(report).toHaveProperty('details');
      expect(report).toHaveProperty('issues');
      expect(report).toHaveProperty('recommendations');
    });

    it('should add report to history', async () => {
      await healthCheck.check();
      expect(healthCheck.history.length).toBe(1);
    });

    it('should limit history size', async () => {
      healthCheck.maxHistorySize = 3;

      for (let i = 0; i < 5; i++) {
        await healthCheck.check();
      }

      expect(healthCheck.history.length).toBe(3);
    });
  });

  describe('checkConnectivity()', () => {
    it('should detect available node', async () => {
      const result = await healthCheck.checkConnectivity();

      expect(result.node_available).toBe(true);
      expect(result.node_online).toBe(true);
      expect(result.endpoint_available).toBe(true);
      expect(result.communication_working).toBe(true);
    });

    it('should detect unavailable node', async () => {
      mockDevice.zclNode = null;

      const result = await healthCheck.checkConnectivity();

      expect(result.node_available).toBe(false);
      expect(result.node_online).toBe(false);
    });

    it('should handle communication errors', async () => {
      mockDevice.zclNode.endpoints[1].clusters.basic.readAttributes.mockRejectedValue(
        new Error('Communication failed')
      );

      const result = await healthCheck.checkConnectivity();

      expect(result.communication_working).toBe(false);
      expect(result.communication_error).toBeDefined();
    });
  });

  describe('checkPower()', () => {
    it('should detect AC-powered device', async () => {
      mockDevice.hasCapability.mockReturnValue(false);

      const result = await healthCheck.checkPower();

      expect(result.has_battery).toBe(false);
      expect(result.power_source).toBe('mains');
      expect(result.battery_healthy).toBe(true);
    });

    it('should check battery level', async () => {
      mockDevice.hasCapability.mockReturnValue(true);
      mockDevice.getCapabilityValue.mockReturnValue(50);

      const result = await healthCheck.checkPower();

      expect(result.has_battery).toBe(true);
      expect(result.battery_level).toBe(50);
      expect(result.battery_healthy).toBe(true);
      expect(result.power_source).toBe('battery');
    });

    it('should detect low battery', async () => {
      mockDevice.hasCapability.mockReturnValue(true);
      mockDevice.getCapabilityValue.mockReturnValue(5);

      const result = await healthCheck.checkPower();

      expect(result.battery_level).toBe(5);
      expect(result.battery_healthy).toBe(false);
    });

    it('should read battery voltage if available', async () => {
      mockDevice.hasCapability.mockReturnValue(true);
      mockDevice.getCapabilityValue.mockReturnValue(50);

      const result = await healthCheck.checkPower();

      expect(result.battery_voltage).toBe(3.0); // 30 decivolts = 3.0 volts
    });
  });

  describe('checkFunctionality()', () => {
    it('should check all capabilities', async () => {
      mockDevice.getCapabilities.mockReturnValue(['onoff', 'dim', 'measure_temperature']);
      mockDevice.getCapabilityValue
        .mockReturnValueOnce(true)  // onoff
        .mockReturnValueOnce(0.5)   // dim
        .mockReturnValueOnce(null); // measure_temperature

      const result = await healthCheck.checkFunctionality();

      expect(result.capabilities_total).toBe(3);
      expect(result.capabilities_working).toBe(2);
      expect(result.responding).toBe(true);
    });

    it('should detect non-responding device', async () => {
      mockDevice.getCapabilities.mockReturnValue(['onoff', 'dim']);
      mockDevice.getCapabilityValue.mockReturnValue(null);

      const result = await healthCheck.checkFunctionality();

      expect(result.capabilities_working).toBe(0);
      expect(result.responding).toBe(false);
    });
  });

  describe('checkNetwork()', () => {
    it('should check network quality', async () => {
      const result = await healthCheck.checkNetwork();

      expect(result.lqi).toBe(200);
      expect(result.rssi).toBe(-50);
      expect(result.signal_quality).toBe('excellent');
    });

    it('should categorize signal quality correctly', async () => {
      const testCases = [
        { lqi: 250, expected: 'excellent' },
        { lqi: 180, expected: 'good' },
        { lqi: 120, expected: 'fair' },
        { lqi: 50, expected: 'poor' }
      ];

      for (const testCase of testCases) {
        mockDevice.zclNode.endpoints[1].LQI = testCase.lqi;
        const result = await healthCheck.checkNetwork();
        expect(result.signal_quality).toBe(testCase.expected);
      }
    });
  });

  describe('Scoring', () => {
    it('should score connectivity correctly', () => {
      const data = {
        node_available: true,
        node_online: true,
        endpoint_available: true,
        communication_working: true,
        last_seen_ago: 1000
      };

      const score = healthCheck.scoreConnectivity(data);
      expect(score).toBe(100);
    });

    it('should penalize old last_seen', () => {
      const data = {
        node_available: true,
        node_online: true,
        endpoint_available: true,
        communication_working: true,
        last_seen_ago: 25 * 60 * 60 * 1000 // 25 hours
      };

      const score = healthCheck.scoreConnectivity(data);
      expect(score).toBeLessThan(100);
    });

    it('should score power correctly', () => {
      expect(healthCheck.scorePower({ has_battery: false })).toBe(100);
      expect(healthCheck.scorePower({ has_battery: true, battery_level: 80 })).toBe(100);
      expect(healthCheck.scorePower({ has_battery: true, battery_level: 30 })).toBe(75);
      expect(healthCheck.scorePower({ has_battery: true, battery_level: 5 })).toBe(20);
    });

    it('should score functionality correctly', () => {
      const data = {
        capabilities_total: 4,
        capabilities_working: 4,
        responding: true,
        last_update: Date.now() - 1000
      };

      const score = healthCheck.scoreFunctionality(data);
      expect(score).toBeGreaterThanOrEqual(100);
    });

    it('should score network correctly', () => {
      expect(healthCheck.scoreNetwork({ lqi: 255, network_stable: true })).toBeGreaterThanOrEqual(100);
      expect(healthCheck.scoreNetwork({ lqi: 128, network_stable: false })).toBeCloseTo(50, 0);
      expect(healthCheck.scoreNetwork({ lqi: null })).toBe(50);
    });
  });

  describe('Overall Status', () => {
    it('should determine overall status', () => {
      expect(healthCheck.getOverallStatus(90)).toBe('excellent');
      expect(healthCheck.getOverallStatus(70)).toBe('good');
      expect(healthCheck.getOverallStatus(50)).toBe('fair');
      expect(healthCheck.getOverallStatus(30)).toBe('poor');
      expect(healthCheck.getOverallStatus(10)).toBe('critical');
    });
  });

  describe('analyzeReport()', () => {
    it('should detect critical battery', async () => {
      mockDevice.hasCapability.mockReturnValue(true);
      mockDevice.getCapabilityValue.mockReturnValue(5);

      const report = await healthCheck.check();

      const criticalIssue = report.issues.find(
        i => i.category === 'power' && i.severity === 'critical'
      );
      expect(criticalIssue).toBeDefined();
    });

    it('should detect poor signal quality', async () => {
      mockDevice.zclNode.endpoints[1].LQI = 50;

      const report = await healthCheck.check();

      const networkIssue = report.issues.find(
        i => i.category === 'network' && i.severity === 'medium'
      );
      expect(networkIssue).toBeDefined();
    });

    it('should provide recommendations', async () => {
      mockDevice.zclNode.endpoints[1].LQI = 50;

      const report = await healthCheck.check();

      expect(report.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('getTrend()', () => {
    it('should detect improving trend', async () => {
      // Simulate improving scores
      for (let i = 0; i < 5; i++) {
        mockDevice.zclNode.endpoints[1].LQI = 100 + (i * 20);
        await healthCheck.check();
      }

      const trend = healthCheck.getTrend();
      expect(trend.trend).toBe('improving');
    });

    it('should detect declining trend', async () => {
      // Simulate declining scores
      for (let i = 0; i < 5; i++) {
        mockDevice.zclNode.endpoints[1].LQI = 200 - (i * 20);
        await healthCheck.check();
      }

      const trend = healthCheck.getTrend();
      expect(trend.trend).toBe('declining');
    });

    it('should detect stable trend', async () => {
      // Simulate stable scores
      for (let i = 0; i < 5; i++) {
        mockDevice.zclNode.endpoints[1].LQI = 200;
        await healthCheck.check();
      }

      const trend = healthCheck.getTrend();
      expect(trend.trend).toBe('stable');
    });

    it('should return unknown for insufficient data', () => {
      const trend = healthCheck.getTrend();
      expect(trend.trend).toBe('unknown');
    });
  });

  describe('History Management', () => {
    it('should get history', async () => {
      await healthCheck.check();
      await healthCheck.check();

      const history = healthCheck.getHistory();
      expect(history.length).toBe(2);
    });

    it('should clear history', async () => {
      await healthCheck.check();
      healthCheck.clearHistory();

      expect(healthCheck.history.length).toBe(0);
    });
  });
});
