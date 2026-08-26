'use strict';
const ZclBatteryMonitor = require('../../lib/battery/ZclBatteryMonitor');

const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');
const { Cluster, CLUSTER } = require('zigbee-clusters');
const { sendTuyaMagicPacket } = require('../../lib/zigbee/TuyaMagicPacket');
const { safeSetTimeout } = require('../../lib/utils/safe-timers');

/**
 * Neo NAS-TH02B2 / `_TZ3000_qaaysllp` + TS0201
 * Sources: ZHA #862 · Abysim Medium (3 layers + UNSUPPORTED_ATTRIBUTE) · Z2M LCZ030
 *
 * WHY: Interview only advertises EP1 (lux + battery + 0xE002). Temp/humidity
 *      report on undeclared EP2 AFTER Tuya magic packet (Basic 0xFFFE).
 * HOW: Virtual EP2 listeners + magic on init/announce + delayed re-enchant.
 * Contre quoi: lux-only tiles; EP2 configureReporting/read → UNSUPPORTED (0x86).
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
        // Abysim replacement EP2: temp + humidity only (no Basic)
        endpointTwo = new Endpoint(zclNode, {
          endpointId: 2,
          inputClusters: [
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
    // WHY P2264/P2265: Basic 0xFFFE read wakes EP2 reports (Abysim / Z2M configureMagicPacket)
    try {
      const ok = await sendTuyaMagicPacket(this, zclNode, 1, { force: true });
      this.log(`[QAAYS] Tuya magic packet ${ok ? 'OK' : 'skipped/unavailable'}`);
      return ok;
    } catch (err) {
      this.log('[QAAYS] Magic packet deferred:', err.message);
      return false;
    }
  }

  _scheduleMagicRetries(zclNode) {
    // Sleepy Neo may miss first handshake; Abysim: first report ~1–2 min after enchant
    for (const delayMs of [2500, 30000]) {
      safeSetTimeout(this, () => {
        this._sendQaaysMagicPacket(zclNode).catch(() => {});
      }, delayMs);
    }
  }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    ZclBatteryMonitor.attach(this, zclNode);
    this._zclNode = zclNode;
    const endpointTwo = this._ensureMeasurementEndpoint(zclNode);
    const endpointOne = zclNode?.endpoints?.[1];

    if (!endpointOne) {
      this.log('[QAAYS] Endpoint 1 unavailable — illuminance/battery bindings skipped');
    }

    await this._sendQaaysMagicPacket(zclNode);
    this._scheduleMagicRetries(zclNode);

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

      // WHY: Abysim — EP2 direct read/configureReporting returns UNSUPPORTED_ATTRIBUTE (0x86).
      // Rely on unsolicited reports after magic packet (same as Z2M / custom ZHA quirk).
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
    if (this._zclNode) {
      await this._sendQaaysMagicPacket(this._zclNode);
      this._scheduleMagicRetries(this._zclNode);
    }
  }

  onTemperatureMeasuredAttributeReport(measuredValue) {
    const raw = Number(measuredValue);
    if (!Number.isFinite(raw)) { return; }
    const temperatureOffset = Number(this.getSetting('temperature_offset')) || 0;
    // ZCL TemperatureMeasurement is always centi-degrees (/100) — Abysim: 2640 → 26.40°C
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
    // ZCL RelativeHumidity is always /100 — Abysim: 4100 → 41.00%
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
