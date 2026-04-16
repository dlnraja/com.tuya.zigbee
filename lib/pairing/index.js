'use strict';

/**
 * Pairing Module - Universal Pairing System
 */

module.exports = {
  UniversalPairingManager: require('./UniversalPairingManager'),
  TwoPhaseEnrichment: require('./TwoPhaseEnrichment'),
  TuyaTimeSyncEngine: require('./TuyaTimeSyncEngine'),
  EventDeduplicator: require('./EventDeduplicator'),
  DynamicEndpointDiscovery: require('./DynamicEndpointDiscovery'),
  AntiFallbackGeneric: require('./AntiFallbackGeneric'),
  PermissiveMatchingEngine: require('./PermissiveMatchingEngine'),
  EnrichmentScheduler: require('./EnrichmentScheduler'),
};
