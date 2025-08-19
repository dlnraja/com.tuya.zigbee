#!/usr/bin/env node
'use strict';

'use strict';

const CAPABILITIES = {
    onoff: { type: 'boolean', title: 'On/Off', getable: true, setable: true },
    dim: { type: 'number', title: 'Dim', getable: true, setable: true, min: 0, max: 1, step: 0.01 },
    light_hue: { type: 'number', title: 'Hue', getable: true, setable: true, min: 0, max: 360, step: 1 },
    light_saturation: { type: 'number', title: 'Saturation', getable: true, setable: true, min: 0, max: 1, step: 0.01 },
    light_temperature: { type: 'number', title: 'Temperature', getable: true, setable: true, min: 0, max: 1, step: 0.01 },
    measure_temperature: { type: 'number', title: 'Temperature', getable: true, setable: false, unit: '°C' },
    measure_humidity: { type: 'number', title: 'Humidity', getable: true, setable: false, unit: '%' },
    alarm_motion: { type: 'boolean', title: 'Motion', getable: true, setable: false },
    alarm_contact: { type: 'boolean', title: 'Contact', getable: true, setable: false },
    measure_power: { type: 'number', title: 'Power', getable: true, setable: false, unit: 'W' },
    measure_current: { type: 'number', title: 'Current', getable: true, setable: false, unit: 'A' },
    measure_voltage: { type: 'number', title: 'Voltage', getable: true, setable: false, unit: 'V' }
};

const CLUSTERS = {
    genBasic: { name: 'Basic', clusterId: 0x0000 },
    genIdentify: { name: 'Identify', clusterId: 0x0003 },
    genOnOff: { name: 'On/Off', clusterId: 0x0006 },
    genLevelCtrl: { name: 'Level Control', clusterId: 0x0008 },
    lightingColorCtrl: { name: 'Color Control', clusterId: 0x0300 },
    msTemperatureMeasurement: { name: 'Temperature Measurement', clusterId: 0x0402 },
    msRelativeHumidity: { name: 'Relative Humidity', clusterId: 0x0405 },
    msOccupancySensing: { name: 'Occupancy Sensing', clusterId: 0x0406 },
    genPowerCfg: { name: 'Power Configuration', clusterId: 0x0001 }
};

module.exports = { CAPABILITIES, CLUSTERS };