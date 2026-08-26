'use strict';
const ZclBatteryMonitor = require('../../lib/battery/ZclBatteryMonitor');

const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');
const { Cluster, CLUSTER } = require('zigbee-clusters');
const { sendTuyaMagicPacket } = require('../../lib/zigbee/TuyaMagicPacket');

/**
 * Neo NAS-TH02B / `_TZ3000_qaaysllp` + TS0201 (ZHA #862 / Z2M)
 *
 * WHY: Interview only advertises EP1 (lux + battery + 0xE002). Temp/humidity
 *      report on undeclared EP2 (0x0402 / 0x0405) AFTER Tuya magic packet.
 * HOW: Virtual EP2 cluster listeners + genBasic 0xFFFE handshake (configureMagicPacket).
 * Contre quoi: lux-only tiles with dead temp/humidity.
 */
class LcdTempHumidLuxSensor extends TuyaZigbeeDevice {

  _ensureMeasurementEndpoint(zclNode) {
    const endpoints = zclNode?.endpoints;
    const endpointOne = endpoints?.[1];
    if (!endpoints || !endpointOne) {
      this.log('[QAAYS] Cannot create virtual endpoint 2: endpoint 1 is unavailable');
      return null;
    }

    let endpointTwo = endpoints[2];
    if (!endpointTwo) {
      const Endpoint = endpointOne.constructor;
      if (typeof Endpoint !== 'function') {
        this.log('[QAAYS] Cannot create virtual endpoint 2: endpoint constructor is unavailable');
        return null;
      }

      try {
        endpointTwo = new Endpoint(zclNode, {
          endpointId: 2,
          inputClusters: [
            CLUSTER.BASIC.ID,
            CLUSTER.TEMPERATURE_MEASUREMENT.ID,
            CLUSTER.RELATIVE_HUMIDITY_MEASUREMENT.ID,
          ],
          outputClusters: [],
        });
        endpoints[2] = endpointTwo;
        this.log('[QAAYS] Created virtual endpoint 2 for temperature and humidity reports');
      } catch (err) {
        this.log('[QAAYS] Failed to create virtual endpoint 2:', err.message);
        return null;
      }
    }

    // Repair partially described endpoint 2 instances without replacing them.
    endpointTwo.clusters ??= {};
    for (const clusterId of [
      CLUSTER.TEMPERATURE_MEASUREMENT.ID,
      CLUSTER.RELATIVE_HUMIDITY_MEASUREMENT.ID,
    ]) {
      const ClusterClass = Cluster.getCluster(clusterId);
      if (ClusterClass && !endpointTwo.clusters?.[ClusterClass.NAME]) {
        endpointTwo.clusters[ClusterClass.NAME] = new ClusterClass(endpointTwo);
      }
    }

    return endpointTwo;
  }

  _bindAttribute(cluster, eventName, handler) {
    if (!cluster || typeof cluster.on !== 'function') { return false; }
    const listener = handler.bind(this);
    cluster.on(eventName, listener);
    this._attributeBindings ??= [];
    this._attributeBindings.push({ cluster, eventName, listener });
    return true;
  }

  async _setCapabilityIfPresent(capabilityId, value) {
    if (!this.hasCapability(capabilityId) || !Number.isFinite(value)) { return; }
    try {
      await this.safeSetCapabilityValue(capabilityId, value);
    } catch (err) {
      this.error(err);
    }
  }

  async _sendQaaysMagicPacket(zclNode) {
    // WHY P2264: without Basic 0xFFFE read, EP2 never starts reporting (ZHA Medium / Z2M)
    try {
      const ok = await sendTuyaMagicPacket(this, zclNode, 1, { force: true });
      this.log(`[QAAYS] Tuya magic packet ${ok ? 'OK' : 'skipped/unavailable'}`);
      return ok;
    } catch (err) {
      this.log('[QAAYS] Magic packet deferred:', err.message);
      return false;
    }
  }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    ZclBatteryMonitor.attach(this, zclNode);
    this._zclNode = zclNode;
    const endpointTwo = this._ensureMeasurementEndpoint(zclNode);
    const endpointOne = zclNode?.endpoints?.[1];

    if (!endpointOne) {
      // Ne pas bloquer onNodeInit : sans endpoint 1, seules la luminosité et la
      // batterie sont indisponibles ; température/humidité restent tentées sur
      // l'endpoint de mesure. Un throw ici tuait l'init (risque zigbee-generic).
      this.log('[QAAYS] Endpoint 1 unavailable — illuminance/battery bindings skipped');
    }

    // Magic packet BEFORE reporting config so EP2 wakes (ZHA #862 lesson)
    await this._sendQaaysMagicPacket(zclNode);

    if (this.isFirstInit()) {
      await this.configureAttributeReporting([
        {
          endpointId: 1,
          cluster: CLUSTER.POWER_CONFIGURATION,
          attributeName: 'batteryPercentageRemaining',
          minInterval: 60,
          maxInterval: 21600,
          minChange: 1,
        },
      ]).catch((err) => this.log('[QAAYS] Battery reporting configuration unavailable:', err.message));

      // Soft: EP2 may reject configureReporting until firmware is enchanted
      await this.configureAttributeReporting([
        {
          endpointId: 2,
          cluster: CLUSTER.TEMPERATURE_MEASUREMENT,
          attributeName: 'measuredValue',
          minInterval: 30,
          maxInterval: 3600,
          minChange: 10,
        },
        {
          endpointId: 2,
          cluster: CLUSTER.RELATIVE_HUMIDITY_MEASUREMENT,
          attributeName: 'measuredValue',
          minInterval: 30,
          maxInterval: 3600,
          minChange: 100,
        },
      ]).catch((err) => this.log('[QAAYS] EP2 reporting config soft-fail:', err.message));
    }

    const temperatureCluster = endpointTwo?.clusters?.[CLUSTER.TEMPERATURE_MEASUREMENT.NAME];
    const humidityCluster = endpointTwo?.clusters?.[CLUSTER.RELATIVE_HUMIDITY_MEASUREMENT.NAME];
    const illuminanceCluster = endpointOne?.clusters?.[CLUSTER.ILLUMINANCE_MEASUREMENT.NAME];
    const powerCluster = endpointOne?.clusters?.[CLUSTER.POWER_CONFIGURATION.NAME];

    this._bindAttribute(
      temperatureCluster,
      'attr.measuredValue',
      this.onTemperatureMeasuredAttributeReport,
    );
    this._bindAttribute(
      humidityCluster,
      'attr.measuredValue',
      this.onRelativeHumidityMeasuredAttributeReport,
    );
    this._bindAttribute(
      illuminanceCluster,
      'attr.measuredValue',
      this.onIlluminanceMeasuredAttributeReport,
    );
    this._bindAttribute(
      powerCluster,
      'attr.batteryPercentageRemaining',
      this.handleBatteryPercentageReport,
    );

    if (!temperatureCluster || !humidityCluster) {
      this.log('[QAAYS] Temperature or humidity cluster is unavailable on endpoint 2');
    }
  }

  async onEndDeviceAnnounce() {
    if (typeof super.onEndDeviceAnnounce === 'function') {
      await super.onEndDeviceAnnounce();
    }
    // Re-enchant after sleep/power-cut so EP2 resumes (ZHA #862 / Z2M)
    if (this._zclNode) {
      await this._sendQaaysMagicPacket(this._zclNode);
    }
  }

  onTemperatureMeasuredAttributeReport(measuredValue) {
    const raw = Number(measuredValue);
    if (!Number.isFinite(raw)) { return; }
    const temperatureOffset = Number(this.getSetting('temperature_offset')) || 0;
    // ZCL TemperatureMeasurement is always centi-degrees (/100)
    const parsedValue = this.getSetting('temperature_decimals') === '2'
      ? Math.round((raw / 100) * 100) / 100
      : Math.round((raw / 100) * 10) / 10;
    this.log('measure_temperature | temperatureMeasurement:', parsedValue, '+ offset', temperatureOffset);
    this._setCapabilityIfPresent('measure_temperature', parsedValue + temperatureOffset);
  }

  onRelativeHumidityMeasuredAttributeReport(measuredValue) {
    const raw = Number(measuredValue);
    if (!Number.isFinite(raw)) { return; }
    const humidityOffset = Number(this.getSetting('humidity_offset')) || 0;
    // ZCL RelativeHumidity is always /100
    const parsedValue = this.getSetting('humidity_decimals') === '2'
      ? Math.round((raw / 100) * 100) / 100
      : Math.round((raw / 100) * 10) / 10;
    this.log('measure_humidity | relativeHumidity:', parsedValue, '+ offset', humidityOffset);
    this._setCapabilityIfPresent('measure_humidity', parsedValue + humidityOffset);
  }

  onIlluminanceMeasuredAttributeReport(measuredValue) {
    const raw = Number(measuredValue);
    if (!Number.isFinite(raw) || raw === 0xFFFF) { return; }
    const parsedValue = raw === 0 ? 0 : 10 ** ((raw - 1) / 10000);
    this.log('measure_luminance | illuminanceMeasurement:', parsedValue);
    this._setCapabilityIfPresent('measure_luminance', parsedValue);
  }

  handleBatteryPercentageReport(batteryPercentageRemaining) {
    if (batteryPercentageRemaining === null || batteryPercentageRemaining === undefined) { return; }
    const raw = Number(batteryPercentageRemaining);
    if (!Number.isFinite(raw) || raw < 0 || raw === 0xFF) { return; }
    const UnifiedBatteryHandler = require('../../lib/battery/UnifiedBatteryHandler');
    const batteryPercentage = UnifiedBatteryHandler.normalizeZigbeeValue(raw, {
      manufacturer: (this.getSetting && this.getSetting('zb_manufacturer_name')) || '',
      batteryType: 'AAA',
    });
    if (batteryPercentage == null) { return; }
    const batteryThreshold = Number(this.getSetting('batteryThreshold')) || 20;
    this.log('measure_battery | powerConfiguration:', batteryPercentage);
    this._setCapabilityIfPresent('measure_battery', batteryPercentage);

    if (this.hasCapability('alarm_battery')) {
      this.safeSetCapabilityValue('alarm_battery', batteryPercentage < batteryThreshold)
        .catch((err) => this.error(err));
    }
  }

  onDeleted() {
    for (const { cluster, eventName, listener } of this._attributeBindings || []) {
      if (typeof cluster.removeListener === 'function') {
        cluster.removeListener(eventName, listener);
      }
    }
    this._attributeBindings = [];
    this.log('LCD temperature, humidity and luminance sensor removed');
    if (typeof super.onDeleted === 'function') super.onDeleted();
  }

}

module.exports = LcdTempHumidLuxSensor;
