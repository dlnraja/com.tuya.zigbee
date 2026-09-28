'use strict';

const { debug, Cluster } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
const TuyaSpecificClusterDevice = require("../../lib/TuyaSpecificClusterDevice");
const { getDataValue } = require('../../lib/TuyaHelpers');
const { V2_RADAR_SENSOR_DATA_POINTS } = require('../../lib/TuyaDataPoints');

Cluster.addCluster(TuyaSpecificCluster);

class radarSensor2 extends TuyaSpecificClusterDevice {

  _shouldPublishDistance(intervalSeconds) {
    const intervalMs = Math.max(1, Number(intervalSeconds) || 10) * 1000;
    const now = Date.now();
    if (this._lastDistancePublishedAt && now - this._lastDistancePublishedAt < intervalMs) {return false;}
    this._lastDistancePublishedAt = now;
    return true;
  }

  async onNodeInit({ zclNode }) {
    this.printNode();
/*     debug(true);
    this.enableDebug(); */

    // Initialize the flow card for target distance changes
    this.targetDistanceTrigger = this.homey.flow.getDeviceTriggerCard('radar_sensor_2_target_distance_changed');

    // Read and log device attributes
    await this._readDeviceAttributes(zclNode);

    // Attach event listeners for Tuya-specific reports (manual state changes)
    if (!this.hasListenersAttached) {
      zclNode.endpoints[1].clusters.tuya.on('reporting', async (value) => {
        try {
          this.log('Received reporting:', value);
          await this.processDatapoint(value);
        } catch (err) {
          this.error('Error processing datapoint:', err);
        }
      });

      zclNode.endpoints[1].clusters.tuya.on('response', async (value) => {
        try {
          this.log('Received response:', value);
          await this.processDatapoint(value);
        } catch (err) {
          this.error('Error processing datapoint:', err);
        }
      });

      this.hasListenersAttached = true;
    }
  }

  async _readDeviceAttributes(zclNode) {
    try {
      await zclNode.endpoints[1].clusters.basic.readAttributes(['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'attributeReportingStatus']);
    } catch (err) {
      this.error('Error when reading device attributes:', err);
    }
  }

  // Process DP reports and update Homey accordingly
  async processDatapoint(data) {
    const dp = data.dp;
    const parsedValue = getDataValue(data);
    const dataType = data.datatype;
    this.log(`Processing DP ${dp}, Data Type: ${dataType}, Parsed Value:`, parsedValue);

    switch (dp) {
      case V2_RADAR_SENSOR_DATA_POINTS.presenceState:
        this.log('Received presence state:', parsedValue);
        await this.safeSetCapabilityValue('alarm_motion', parsedValue === true || parsedValue === 1).catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));
        break;

      case V2_RADAR_SENSOR_DATA_POINTS.radarSensitivity:
        this.log('Received radar sensitivity:', parsedValue);
        if (typeof parsedValue === 'number' && this.getSetting('radar_sensitivity') !== parsedValue) {
          this.setSettings({ radar_sensitivity: parsedValue }).catch(() => {});
        }
        break;

      case V2_RADAR_SENSOR_DATA_POINTS.minimumRange: {
        const minVal = Math.round((parsedValue / 100) * 10) / 10;
        this.log('Received minimum range:', minVal);
        if (this.getSetting('minimum_range') !== minVal) {
          this.setSettings({ minimum_range: minVal }).catch(() => {});
        }
        break;
      }

      case V2_RADAR_SENSOR_DATA_POINTS.maximumRange: {
        const maxVal = Math.round((parsedValue / 100) * 10) / 10;
        this.log('Received maximum range:', maxVal);
        if (this.getSetting('maximum_range') !== maxVal) {
          this.setSettings({ maximum_range: maxVal }).catch(() => {});
        }
        break;
      }

      case V2_RADAR_SENSOR_DATA_POINTS.detectionDelay: {
        const delayVal = Math.round((parsedValue / 10) * 10) / 10;
        this.log('Received detection delay:', delayVal);
        if (this.getSetting('detection_delay') !== delayVal) {
          this.setSettings({ detection_delay: delayVal }).catch(() => {});
        }
        break;
      }

      case V2_RADAR_SENSOR_DATA_POINTS.fadingTime: {
        const fadeVal = Math.round((parsedValue / 10) * 10) / 10;
        this.log('Received fading time:', fadeVal);
        if (this.getSetting('fading_time') !== fadeVal) {
          this.setSettings({ fading_time: fadeVal }).catch(() => {});
        }
        break;
      }

      case V2_RADAR_SENSOR_DATA_POINTS.illuminanceLux:
        this.log('Received illuminance value:', parsedValue);
        this.onIlluminanceMeasuredAttributeReport(parsedValue);
        break;

      case V2_RADAR_SENSOR_DATA_POINTS.targetDistance:
        const distanceUpdateInterval = this.getSetting('distance_update_interval') ?? 10;
        if (this._shouldPublishDistance(distanceUpdateInterval)) {
          this.safeSetCapabilityValue('target_distance', parsedValue / 100).catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} })); // converting to meters
          // Trigger the custom flow card for target distance change
          await this.targetDistanceTrigger.trigger(this, { target_distance: parsedValue / 100 }).catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));
        }
        break;

      default:
        this.log('Unhandled DP:', dp, 'with value:', parsedValue);
    }
  }

  async onSettings({ newSettings, changedKeys }) {
    try {
      if (changedKeys.includes('radar_sensitivity')) {
        await this.writeData32(V2_RADAR_SENSOR_DATA_POINTS.radarSensitivity, newSettings['radar_sensitivity']);
      }
      if (changedKeys.includes('minimum_range')) {
        await this.writeData32(V2_RADAR_SENSOR_DATA_POINTS.minimumRange, Math.round(newSettings['minimum_range'] * 100)); // convert to centimeters
      }
      if (changedKeys.includes('maximum_range')) {
        await this.writeData32(V2_RADAR_SENSOR_DATA_POINTS.maximumRange, Math.round(newSettings['maximum_range'] * 100)); // convert to centimeters
      }
      if (changedKeys.includes('detection_delay')) {
        await this.writeData32(V2_RADAR_SENSOR_DATA_POINTS.detectionDelay, Math.round(newSettings['detection_delay'] * 10)); // tenths of second
      }
      if (changedKeys.includes('fading_time')) {
        await this.writeData32(V2_RADAR_SENSOR_DATA_POINTS.fadingTime, Math.round(newSettings['fading_time'] * 10)); // tenths of second
      }
    } catch (error) {
      this.error('Error in onSettings:', error);
    }
  }

  onIlluminanceMeasuredAttributeReport(measuredValue) {
    this.log('measure_luminance | Luminance - measuredValue (lux):', measuredValue);
    this.safeSetCapabilityValue('measure_luminance', measuredValue).catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));
  }

  onDeleted() {
    super.onDeleted();
    this.log('Radar sensor removed');
  }
}

module.exports = radarSensor2;
