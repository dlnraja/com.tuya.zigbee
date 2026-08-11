'use strict';

/**
 * lib/io — Homey compensation + protocol I/O surface (P102)
 */

const DeviceIOFacade = require('./DeviceIOFacade');
const HomeyCompensationLayer = require('./HomeyCompensationLayer');
const ProtocolFallbackChain = require('./ProtocolFallbackChain');

module.exports = {
  DeviceIOFacade,
  installDeviceIO: DeviceIOFacade.installDeviceIO,
  HomeyCompensationLayer,
  loadProtocolQuirkTable: HomeyCompensationLayer.loadProtocolQuirkTable,
  safeGetFlowCard: HomeyCompensationLayer.safeGetFlowCard,
  installFlowCardStubs: HomeyCompensationLayer.installFlowCardStubs,
  ProtocolFallbackChain,
  DEFAULT_TX_ORDER: ProtocolFallbackChain.DEFAULT_TX_ORDER,
  DEFAULT_RX_ORDER: ProtocolFallbackChain.DEFAULT_RX_ORDER,
  DEFAULT_CHANNELS: DeviceIOFacade.DEFAULT_CHANNELS,
};
