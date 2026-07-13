'use strict';

module.exports = {
  PerformanceOptimizer: require('./PerformanceOptimizer'),
  AutoDiscoveryPollingOptimizer: require('./AutoDiscoveryPollingOptimizer'),
  FragmentBufferMemoryLimiter: require('./FragmentBufferMemoryLimiter'),
  TuyaDPCompression: require('./TuyaDPCompression'),
  SmartClusterEngineThrottling: require('./SmartClusterEngineThrottling'),
  DiagnosticLoggerRotation: require('./DiagnosticLoggerRotation'),
  StartupTimeProfiler: require('./StartupTimeProfiler'),
  MemoryLeakDetector: require('./MemoryLeakDetector')
};
