const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../lib/devices/UnifiedSensorBase.js');
let content = fs.readFileSync(filePath, 'utf8');

const cleanZCLMode = `  async _setupZCLMode(zclNode) {
    this.log('[ZCL]  Setting up ZCL mode...');
    const endpoint = zclNode?.endpoints?.[1];
    if (!endpoint) return;

    const clusters = endpoint.clusters || {};
    const customHandlers = this.clusterHandlers || {};

    // Temperature (0x0402)
    if (!customHandlers.temperatureMeasurement && !customHandlers.msTemperatureMeasurement) {
      await this._setupZCLCluster(clusters,
        ['temperatureMeasurement', 'msTemperatureMeasurement'],
        'measure_temperature',
        (value) => Math.round(safeMultiply(safeDivide(safeParse(value, 100, 10)), 10))
      );
    }

    // Humidity (0x0405)
    if (!customHandlers.relativeHumidity && !customHandlers.msRelativeHumidity) {
      await this._setupZCLCluster(clusters,
        ['relativeHumidity', 'msRelativeHumidity'],
        'measure_humidity',
        (value) => Math.round(safeParse(value))
      );
    }

    // Battery (0x0001)
    if (!customHandlers.powerConfiguration && !customHandlers.genPowerCfg) {
      await this._setupZCLCluster(clusters,
        ['powerConfiguration', 'genPowerCfg'],
        'measure_battery',
        (value) => Math.min(100, Math.round(safeParse(value))),
        'batteryPercentageRemaining'
      );
    }

    // Illuminance (0x0400)
    if (!customHandlers.illuminanceMeasurement && !customHandlers.msIlluminanceMeasurement) {
      await this._setupZCLCluster(clusters,
        ['illuminanceMeasurement', 'msIlluminanceMeasurement'],
        'measure_luminance',
        (value) => Math.round(Math.pow(10, safeDivide(value - 1, 10000)))
      );
    }

    // Occupancy / Motion (0x0406)
    if (!customHandlers.occupancySensing && !customHandlers.msOccupancySensing) {
      await this._setupZCLCluster(clusters,
        ['occupancySensing', 'msOccupancySensing'],
        'alarm_motion',
        (value) => {
          let occupied = value > 0;
          const invertSetting = this.getSetting?.('invert_presence');
          if (invertSetting) occupied = !occupied;
          return occupied;
        },
        'occupancy'
      );
    }

    await this._setupIASZone(clusters);

    try {
      setupUniversalZCLListeners(this, zclNode, this.clusterHandlers || {});
    } catch (e) { }
  }
`;

const startMarker = 'async _setupZCLMode(zclNode) {';
const endMarker = 'async _setupZCLCluster(clusters, clusterNames, capability, transform, attribute = \'measuredValue\') {';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
    const head = content.substring(0, startIndex);
    const tail = content.substring(endIndex);
    fs.writeFileSync(filePath, head + cleanZCLMode + tail);
    console.log('Successfully repaired _setupZCLMode');
} else {
    console.error('Could not find markers');
}
