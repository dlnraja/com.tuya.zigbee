'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { Cluster, CLUSTER } = require('zigbee-clusters');

class LcdTempHumidLuxSensor extends ZigBeeDevice {

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
    const setter = typeof this.safeSetCapabilityValue === 'function'
      ? this.safeSetCapabilityValue.bind(this)
      : this.setCapabilityValue.bind(this);
    try {
      await setter(capabilityId, value);
    } catch (err) {
      this.error(err);
    }
  }

  async onNodeInit({ zclNode }) {
    this._zclNode = zclNode;
    const endpointTwo = this._ensureMeasurementEndpoint(zclNode);
    const endpointOne = zclNode?.endpoints?.[1];

    if (!endpointOne) {
      throw new Error('QAAYS sensor endpoint 1 is unavailable');
    }

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
    }

    const temperatureCluster = endpointTwo?.clusters?.[CLUSTER.TEMPERATURE_MEASUREMENT.NAME];
    const humidityCluster = endpointTwo?.clusters?.[CLUSTER.RELATIVE_HUMIDITY_MEASUREMENT.NAME];
    const illuminanceCluster = endpointOne.clusters?.[CLUSTER.ILLUMINANCE_MEASUREMENT.NAME];
    const powerCluster = endpointOne.clusters?.[CLUSTER.POWER_CONFIGURATION.NAME];

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

  onTemperatureMeasuredAttributeReport(measuredValue) {
    const raw = Number(measuredValue);
    if (!Number.isFinite(raw)) { return; }
    const temperatureOffset = Number(this.getSetting('temperature_offset')) || 0;
    const parsedValue = this.getSetting('temperature_decimals') === '2'
      ? Math.round(raw) / 100
      : Math.round(raw / 10) / 10;
    this.log('measure_temperature | temperatureMeasurement:', parsedValue, '+ offset', temperatureOffset);
    this._setCapabilityIfPresent('measure_temperature', parsedValue + temperatureOffset);
  }

  onRelativeHumidityMeasuredAttributeReport(measuredValue) {
    const raw = Number(measuredValue);
    if (!Number.isFinite(raw)) { return; }
    const humidityOffset = Number(this.getSetting('humidity_offset')) || 0;
    const parsedValue = this.getSetting('humidity_decimals') === '2'
      ? Math.round(raw) / 100
      : Math.round(raw / 10) / 10;
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
    const batteryPercentage = Math.max(0, Math.min(100, Math.round(raw / 2)));
    const batteryThreshold = Number(this.getSetting('batteryThreshold')) || 20;
    this.log('measure_battery | powerConfiguration:', batteryPercentage);
    this._setCapabilityIfPresent('measure_battery', batteryPercentage);

    if (this.hasCapability('alarm_battery')) {
      const setter = typeof this.safeSetCapabilityValue === 'function'
        ? this.safeSetCapabilityValue.bind(this)
        : this.setCapabilityValue.bind(this);
      setter('alarm_battery', batteryPercentage < batteryThreshold).catch((err) => this.error(err));
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
    super.onDeleted();
  }

}

module.exports = LcdTempHumidLuxSensor;


/* "ids": {
    "modelId": "TS0201",
    "manufacturerName": "_TZ3000_qaaysllp"
  },
  "endpoints": {
    "endpointDescriptors": [
      {
        "endpointId": 1,
        "applicationProfileId": 260,
        "applicationDeviceId": 262,
        "applicationDeviceVersion": 0,
        "_reserved1": 1,
        "inputClusters": [
          0,
          1,
          1024,
          57346
        ],
        "outputClusters": [
          25,
          10
        ]
      }
    ],
    "endpoints": {
      "1": {
        "clusters": {
          "basic": {
            "attributes": [
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 0,
                "name": "zclVersion",
                "value": 3
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 1,
                "name": "appVersion",
                "value": 68
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 2,
                "name": "stackVersion",
                "value": 0
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 3,
                "name": "hwVersion",
                "value": 1
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 4,
                "name": "manufacturerName",
                "value": "_TZ3000_qaaysllp"
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 5,
                "name": "modelId",
                "value": "TS0201"
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 6,
                "name": "dateCode",
                "value": ""
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 7,
                "name": "powerSource",
                "value": "battery"
              },
              {
                "acl": [
                  "readable",
                  "writable",
                  "reportable"
                ],
                "id": 65502
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65533,
                "name": "clusterRevision",
                "value": 2
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65534,
                "name": "attributeReportingStatus",
                "value": "PENDING"
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65504
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65505
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65506
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65507
              }
            ],
            "commandsGenerated": "UNSUP_GENERAL_COMMAND",
            "commandsReceived": "UNSUP_GENERAL_COMMAND"
          },
          "powerConfiguration": {
            "attributes": [
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 0
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 32,
                "name": "batteryVoltage",
                "value": 30
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 33,
                "name": "batteryPercentageRemaining",
                "value": 200
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65533,
                "name": "clusterRevision",
                "value": 1
              }
            ],
            "commandsGenerated": "UNSUP_GENERAL_COMMAND",
            "commandsReceived": "UNSUP_GENERAL_COMMAND"
          },
          "illuminanceMeasurement": {
            "attributes": [
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 0,
                "name": "measuredValue",
                "value": 26032
              },
              {
                "acl": [
                  "readable",
                  "writable",
                  "reportable"
                ],
                "id": 61441
              },
              {
                "acl": [
                  "readable",
                  "writable",
                  "reportable"
                ],
                "id": 43521
              },
              {
                "acl": [
                  "readable",
                  "writable",
                  "reportable"
                ],
                "id": 43522
              },
              {
                "acl": [
                  "readable",
                  "writable",
                  "reportable"
                ],
                "id": 43523
              }
            ],
            "commandsGenerated": "UNSUP_GENERAL_COMMAND",
            "commandsReceived": "UNSUP_GENERAL_COMMAND"
          }
        },
        "bindings": {
          "ota": {
            "attributes": [],
            "commandsGenerated": "UNSUP_GENERAL_COMMAND",
            "commandsReceived": "UNSUP_GENERAL_COMMAND"
          },
          "time": {
            "attributes": [],
            "commandsGenerated": "UNSUP_GENERAL_COMMAND",
            "commandsReceived": "UNSUP_GENERAL_COMMAND"
          }
        }
      }
    }
  } */
