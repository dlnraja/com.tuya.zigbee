'use strict';

/**
 * Device Profile Registry - Index
 * v5.8.80 - Centralizes ALL device profiles and exports registry singleton
 */

const { DeviceProfileRegistry, registry } = require('./DeviceProfileRegistry');
const switchProfiles = require('./profiles/switches');
const coverProfiles = require('./profiles/covers');
const sensorProfiles = require('./profiles/sensors');
const buttonProfiles = require('./profiles/buttons');
const thermostatProfiles = require('./profiles/thermostats');
const plugProfiles = require('./profiles/plugs');
const lightProfiles = require('./profiles/lights');

// Register all static profiles
registry.registerAll(switchProfiles);
registry.registerAll(coverProfiles);
registry.registerAll(sensorProfiles);
registry.registerAll(buttonProfiles);
registry.registerAll(thermostatProfiles);
registry.registerAll(plugProfiles);
registry.registerAll(lightProfiles);

module.exports = { DeviceProfileRegistry, registry };
