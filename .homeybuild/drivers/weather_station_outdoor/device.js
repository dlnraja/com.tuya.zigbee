'use strict';
const { HybridSensorBase } = require('../../lib/devices/HybridSensorBase');

class WeatherStationOutdoorDevice extends HybridSensorBase {
  get mainsPowered() { return false; }
  get sensorCapabilities() { return ['measure_temperature', 'measure_humidity', 'measure_battery']; }
  async onNodeInit({ zclNode }) {
    // --- Attribute Reporting Configuration (auto-generated) ---
    try {
      await this.configureAttributeReporting([
        {
          cluster: 'msTemperatureMeasurement',
          attributeName: 'measuredValue',
          minInterval: 30,
          maxInterval: 600,
          minChange: 50,
        },
        {
          cluster: 'msRelativeHumidity',
          attributeName: 'measuredValue',
          minInterval: 30,
          maxInterval: 600,
          minChange: 100,
        },
        {
          cluster: 'msPressureMeasurement',
          attributeName: 'measuredValue',
          minInterval: 60,
          maxInterval: 600,
          minChange: 1,
        },
        {
          cluster: 'msIlluminanceMeasurement',
          attributeName: 'measuredValue',
          minInterval: 30,
          maxInterval: 600,
          minChange: 50,
        },
        {
          cluster: 'genPowerCfg',
          attributeName: 'batteryPercentageRemaining',
          minInterval: 3600,
          maxInterval: 43200,
          minChange: 2,
        }
      ]);
      this.log('Attribute reporting configured successfully');
    } catch (err) {
      this.log('Attribute reporting config failed (device may not support it):', err.message);
    }

    await super.onNodeInit({ zclNode });
    this._registerCapabilityListeners(); // rule-12a injected
    this.log('[WEATHER] ✅ Weather Station Outdoor v5.8.31 Ready');
  }

  /**
   * v5.8.31: Override setCapabilityValue to fire flow trigger cards
   * Fixes: 4 trigger cards defined in compose but never fired
   */
  async setCapabilityValue(capability, value) {
    const prev = this.getCapabilityValue(capability);
    await super.setCapabilityValue(capability, value);
    if (prev === value) return;

    try {
      switch (capability) {
      case 'measure_temperature':
        this._getFlowCard('weather_station_outdoor_outdoor_temperature_changed')?.trigger(this, { temperature: value }, {}).catch(() => {})
        break;
      case 'measure_humidity':
        this._getFlowCard('weather_station_outdoor_outdoor_humidity_changed')?.trigger(this, { humidity: value }, {}).catch(() => {})
        break;
      case 'measure_pressure': {
        this._getFlowCard('weather_station_outdoor_pressure_changed')?.trigger(this, { pressure: value }, {}).catch(() => {})
        // Track pressure trend for condition cards
        if (prev != null && typeof prev === 'number') {
          const trend = value > prev ? 'rising' : value < prev ? 'falling' : 'stable';
          this.setStoreValue('pressure_trend', trend).catch(() => {});
        }
        break;
      }
      case 'measure_battery':
        if (value <= 15 && (prev === undefined || prev === null || prev > 15)) {
          this._getFlowCard('weather_station_outdoor_battery_low')?
        }
        break;
      }
    } catch (e) { /* flow card may not exist */ }
  }


  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}
module.exports = WeatherStationOutdoorDevice;

