// lib/multichannel/index.js — v1.0 (P37.8)
'use strict';
// Multi-channel architecture exports

module.exports = {
  // Channel adapters
  ...require('./ChannelAdapters'),
  // Coordinators
  MultiChannelManager: require('./MultiChannelManager').MultiChannelManager,
  ParallelDetector: require('./ParallelDetector').ParallelDetector,
  TransmissionManager: require('./TransmissionManager').TransmissionManager,
  ReceptionManager: require('./ReceptionManager').ReceptionManager,
};
