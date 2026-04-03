'use strict';

/**
 * Button Device Profiles - v5.8.80
 * Covers: TS0041-TS0046, TS004F, scene switches
 */

const BUTTON_PROFILES = [

  {
    id: 'ts0041_1button',
    productId: 'TS0041',
    deviceType: 'button',
    protocol: 'zcl',
    buttonCount: 1,
    battery: { powered: true, type: 'CR2032' },
    clusters: {
      1: { onOff: { bind: true }, scenes: { bind: true }, groups: { join: [0] } }
    },
    capabilities: ['button.1'],
    pressTypes: ['single', 'double', 'long'],
    quirks: {},
    timing: { debounce: 300 }
  },

  {
    id: 'ts0042_2button',
    productId: 'TS0042',
    deviceType: 'button',
    protocol: 'zcl',
    buttonCount: 2,
    battery: { powered: true, type: 'CR2032' },
    clusters: {
      1: { onOff: { bind: true }, scenes: { bind: true }, groups: { join: [0] } },
      2: { onOff: { bind: true }, scenes: { bind: true }, groups: { join: [0] } }
    },
    capabilities: ['button.1', 'button.2'],
    pressTypes: ['single', 'double', 'long'],
    quirks: {},
    timing: { debounce: 300 }
  },

  {
    id: 'ts0043_3button',
    productId: 'TS0043',
    deviceType: 'button',
    protocol: 'zcl',
    buttonCount: 3,
    battery: { powered: true, type: 'CR2032' },
    clusters: {
      1: { onOff: { bind: true }, scenes: { bind: true }, groups: { join: [0] } },
      2: { onOff: { bind: true }, scenes: { bind: true }, groups: { join: [0] } },
      3: { onOff: { bind: true }, scenes: { bind: true }, groups: { join: [0] } }
    },
    capabilities: ['button.1', 'button.2', 'button.3'],
    pressTypes: ['single', 'double', 'long'],
    quirks: {},
    timing: { debounce: 300 }
  },

  {
    id: 'ts0044_4button',
    productId: 'TS0044',
    deviceType: 'button',
    protocol: 'zcl',
    buttonCount: 4,
    battery: { powered: true, type: 'CR2032' },
    clusters: {
      1: { onOff: { bind: true }, scenes: { bind: true }, groups: { join: [0] } },
      2: { onOff: { bind: true }, scenes: { bind: true }, groups: { join: [0] } },
      3: { onOff: { bind: true }, scenes: { bind: true }, groups: { join: [0] } },
      4: { onOff: { bind: true }, scenes: { bind: true }, groups: { join: [0] } }
    },
    capabilities: ['button.1', 'button.2', 'button.3', 'button.4'],
    pressTypes: ['single', 'double', 'long'],
    quirks: {},
    timing: { debounce: 300 }
  },

  // TS004F scene switch (needs scene mode activation)
  {
    id: 'ts004f_scene',
    productId: 'TS004F',
    deviceType: 'button',
    protocol: 'zcl',
    buttonCount: 1,
    battery: { powered: true, type: 'CR2032' },
    clusters: {
      1: { onOff: { bind: true }, scenes: { bind: true }, groups: { join: [0] } }
    },
    capabilities: ['button.1'],
    pressTypes: ['single', 'double', 'long'],
    quirks: { sceneModeActivation: true, sceneModeAttr: 0x8004, sceneModeCluster: 6, sceneModeValue: 1 },
    timing: { debounce: 300 }
  },

  // TS0046 6-button
  {
    id: 'ts0046_6button',
    productId: 'TS0046',
    deviceType: 'button',
    protocol: 'zcl',
    buttonCount: 6,
    battery: { powered: true, type: 'CR2032' },
    clusters: {
      1: { onOff: { bind: true }, scenes: { bind: true }, groups: { join: [0] } },
      2: { onOff: { bind: true }, scenes: { bind: true }, groups: { join: [0] } },
      3: { onOff: { bind: true }, scenes: { bind: true }, groups: { join: [0] } },
      4: { onOff: { bind: true }, scenes: { bind: true }, groups: { join: [0] } },
      5: { onOff: { bind: true }, scenes: { bind: true }, groups: { join: [0] } },
      6: { onOff: { bind: true }, scenes: { bind: true }, groups: { join: [0] } }
    },
    capabilities: ['button.1', 'button.2', 'button.3', 'button.4', 'button.5', 'button.6'],
    pressTypes: ['single', 'double', 'long'],
    quirks: {},
    timing: { debounce: 300 }
  },

  // TS0601 Tuya DP scene switch
  {
    id: 'ts0601_scene_switch',
    productId: 'TS0601',
    manufacturerName: [
      '_TZE200_dfxkcots', '_TZE200_2hf7x9n3', '_TZE200_3ij3hy7s',
      '_TZE204_dfxkcots'
    ],
    deviceType: 'button',
    protocol: 'tuya_dp',
    buttonCount: 4,
    battery: { powered: true, type: 'CR2032' },
    dpMappings: {
      1: { capability: 'button.1', type: 'enum', pressMap: { 0: 'single', 1: 'double', 2: 'long' } },
      2: { capability: 'button.2', type: 'enum', pressMap: { 0: 'single', 1: 'double', 2: 'long' } },
      3: { capability: 'button.3', type: 'enum', pressMap: { 0: 'single', 1: 'double', 2: 'long' } },
      4: { capability: 'button.4', type: 'enum', pressMap: { 0: 'single', 1: 'double', 2: 'long' } }
    },
    capabilities: ['button.1', 'button.2', 'button.3', 'button.4'],
    pressTypes: ['single', 'double', 'long'],
    quirks: {},
    timing: { debounce: 300 }
  },

  // Default button
  {
    id: 'button_default',
    deviceType: 'button',
    isDefault: true,
    protocol: 'zcl',
    buttonCount: 1,
    battery: { powered: true, type: 'CR2032' },
    clusters: { 1: { onOff: { bind: true }, scenes: { bind: true } } },
    capabilities: ['button.1'],
    pressTypes: ['single', 'double', 'long'],
    quirks: {},
    timing: { debounce: 300 }
  }
];

module.exports = BUTTON_PROFILES;
