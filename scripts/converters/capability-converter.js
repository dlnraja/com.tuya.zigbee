/**
 * Capability Converter - Zigbee2MQTT/ZHA → Homey
 */
const CAPABILITY_MAP = {
  'state': 'onoff',
  'brightness': 'dim',
  'temperature': 'measure_temperature',
  'humidity': 'measure_humidity',
  'illuminance': 'measure_luminance',
  'battery': 'measure_battery',
  'occupancy': 'alarm_motion',
  'contact': 'alarm_contact',
  'power': 'measure_power',
  'energy': 'meter_power',
};

function convertCapability(z2mCapability) {
  return CAPABILITY_MAP[z2mCapability] || null;
}

module.exports = { CAPABILITY_MAP, convertCapability };
