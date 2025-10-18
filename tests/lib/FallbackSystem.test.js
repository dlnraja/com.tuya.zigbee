'use strict';

const FallbackSystem = require('../../lib/FallbackSystem');

describe('FallbackSystem', () => {
  let mockDevice;
  let fallbackSystem;

  beforeEach(() => {
    // Create mock device
    mockDevice = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      getSetting: jest.fn(() => 'INFO'),
      zclNode: {
        endpoints: {
          1: {
            clusters: {
              basic: {
                readAttributes: jest.fn()
              },
              onOff: {
                readAttributes: jest.fn()
              }
            },
            read: jest.fn(),
            configureReporting: jest.fn(),
            bind: jest.fn()
          }
        }
      }
    };

    fallbackSystem = new FallbackSystem(mockDevice, {
      maxRetries: 3,
      baseDelay: 100,
      verbosity: 'INFO',
      trackPerformance: true
    });
  });

  describe('Constructor', () => {
    it('should initialize with correct defaults', () => {
      expect(fallbackSystem.device).toBe(mockDevice);
      expect(fallbackSystem.maxRetries).toBe(3);
      expect(fallbackSystem.baseDelay).toBe(100);
      expect(fallbackSystem.verbosity).toBe('INFO');
    });

    it('should initialize stats tracking', () => {
      const stats = fallbackSystem.getStats();
      expect(stats.totalAttempts).toBe(0);
      expect(stats.successfulAttempts).toBe(0);
      expect(stats.failedAttempts).toBe(0);
    });
  });

  describe('executeWithFallback', () => {
    it('should execute first strategy successfully', async () => {
      const strategy1 = jest.fn(async () => 'success');
      const strategy2 = jest.fn(async () => 'fallback');

      const result = await fallbackSystem.executeWithFallback(
        'test-operation',
        [strategy1, strategy2]
      );

      expect(result).toBe('success');
      expect(strategy1).toHaveBeenCalled();
      expect(strategy2).not.toHaveBeenCalled();
    });

    it('should fallback to second strategy if first fails', async () => {
      const strategy1 = jest.fn(async () => {
        throw new Error('Strategy 1 failed');
      });
      const strategy2 = jest.fn(async () => 'fallback-success');

      const result = await fallbackSystem.executeWithFallback(
        'test-operation',
        [strategy1, strategy2]
      );

      expect(result).toBe('fallback-success');
      expect(strategy1).toHaveBeenCalled();
      expect(strategy2).toHaveBeenCalled();
    });

    it('should throw if all strategies fail', async () => {
      const strategy1 = jest.fn(async () => {
        throw new Error('Strategy 1 failed');
      });
      const strategy2 = jest.fn(async () => {
        throw new Error('Strategy 2 failed');
      });

      await expect(
        fallbackSystem.executeWithFallback('test-operation', [strategy1, strategy2])
      ).rejects.toThrow('All strategies failed');
    });

    it('should track statistics', async () => {
      const strategy = jest.fn(async () => 'success');

      await fallbackSystem.executeWithFallback('test-operation', [strategy]);

      const stats = fallbackSystem.getStats();
      expect(stats.totalAttempts).toBe(1);
      expect(stats.successfulAttempts).toBe(1);
    });
  });

  describe('retryWithBackoff', () => {
    it('should retry on failure with exponential backoff', async () => {
      let attemptCount = 0;
      const operation = jest.fn(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Temporary failure');
        }
        return 'success';
      });

      const result = await fallbackSystem.retryWithBackoff(operation, 3, 100);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should throw after max retries', async () => {
      const operation = jest.fn(async () => {
        throw new Error('Persistent failure');
      });

      await expect(
        fallbackSystem.retryWithBackoff(operation, 2, 100)
      ).rejects.toThrow('Persistent failure');

      expect(operation).toHaveBeenCalledTimes(2);
    });
  });

  describe('readAttributeWithFallback', () => {
    it('should read attribute using standard method', async () => {
      mockDevice.zclNode.endpoints[1].clusters.onOff.readAttributes.mockResolvedValue({
        onOff: true
      });

      const result = await fallbackSystem.readAttributeWithFallback('onOff', 'onOff');

      expect(result).toEqual({ onOff: true });
      expect(mockDevice.zclNode.endpoints[1].clusters.onOff.readAttributes).toHaveBeenCalledWith('onOff');
    });

    it('should fallback to direct read on cluster failure', async () => {
      mockDevice.zclNode.endpoints[1].clusters.onOff.readAttributes.mockRejectedValue(
        new Error('Cluster method failed')
      );
      mockDevice.zclNode.endpoints[1].read.mockResolvedValue({
        onOff: true
      });

      const result = await fallbackSystem.readAttributeWithFallback('onOff', 'onOff');

      expect(result).toEqual({ onOff: true });
      expect(mockDevice.zclNode.endpoints[1].read).toHaveBeenCalled();
    });
  });

  describe('configureReportWithFallback', () => {
    it('should configure reporting successfully', async () => {
      mockDevice.zclNode.endpoints[1].configureReporting.mockResolvedValue(undefined);

      await fallbackSystem.configureReportWithFallback({
        cluster: 'onOff',
        attributeName: 'onOff',
        minInterval: 0,
        maxInterval: 300,
        minChange: 1
      });

      expect(mockDevice.zclNode.endpoints[1].configureReporting).toHaveBeenCalled();
    });

    it('should handle configuration failure gracefully', async () => {
      mockDevice.zclNode.endpoints[1].configureReporting.mockRejectedValue(
        new Error('Configuration failed')
      );

      // Should not throw - uses silent fallback
      await fallbackSystem.configureReportWithFallback({
        cluster: 'onOff',
        attributeName: 'onOff'
      });

      expect(mockDevice.warn).toHaveBeenCalled();
    });
  });

  describe('Statistics', () => {
    it('should track average duration', async () => {
      const strategy = jest.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return 'success';
      });

      await fallbackSystem.executeWithFallback('test', [strategy]);

      const stats = fallbackSystem.getStats();
      expect(stats.avgDuration).toBeGreaterThan(0);
    });

    it('should reset statistics', () => {
      fallbackSystem.stats.totalAttempts = 10;
      fallbackSystem.resetStats();

      const stats = fallbackSystem.getStats();
      expect(stats.totalAttempts).toBe(0);
    });
  });

  describe('Logging Levels', () => {
    it('should respect verbosity setting', () => {
      fallbackSystem.verbosity = 'ERROR';
      
      fallbackSystem.log('This is a log');
      fallbackSystem.debug('This is debug');
      fallbackSystem.error('This is error');

      expect(mockDevice.log).not.toHaveBeenCalled();
      expect(mockDevice.debug).not.toHaveBeenCalled();
      expect(mockDevice.error).toHaveBeenCalled();
    });

    it('should log all levels in TRACE mode', () => {
      fallbackSystem.verbosity = 'TRACE';
      
      fallbackSystem.trace('trace');
      fallbackSystem.debug('debug');
      fallbackSystem.log('info');
      fallbackSystem.warn('warn');
      fallbackSystem.error('error');

      expect(mockDevice.log).toHaveBeenCalledTimes(5);
    });
  });
});
