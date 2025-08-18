#!/usr/bin/env node
'use strict';

/**
 * 🔧 Cluster to Capability Mapping - Universal Tuya Zigbee
 * Deterministic mapping from ZCL clusters to Homey capabilities
 */

const CLUSTER_CAP_MAP = {
  // Basic clusters
  'genBasic': {
    'zclVersion': null, // No direct capability mapping
    'applicationVersion': null,
    'stackVersion': null,
    'hardwareVersion': null,
    'manufacturerName': null,
    'modelIdentifier': null,
    'dateCode': null,
    'powerSource': null
  },

  // On/Off cluster
  'genOnOff': {
    'onOff': {
      capability: 'onoff',
      transform: (value) => Boolean(value),
      type: 'boolean'
    },
    'globalSceneControl': null,
    'onTime': null,
    'offWaitTime': null,
    'startUpOnOff': null
  },

  // Level Control cluster
  'genLevelCtrl': {
    'currentLevel': {
      capability: 'dim',
      transform: (value) => Math.round((value / 254) * 100) / 100, // 0-254 → 0-1
      type: 'number',
      range: [0, 1]
    },
    'remainingTime': null,
    'onOffTransitionTime': null,
    'onLevel': null,
    'onTransitionTime': null,
    'offTransitionTime': null,
    'defaultMoveRate': null,
    'startUpCurrentLevel': null
  },

  // Color Control cluster
  'lightingColorCtrl': {
    'currentHue': {
      capability: 'light_hue',
      transform: (value) => Math.round((value / 254) * 360), // 0-254 → 0-360
      type: 'number',
      range: [0, 360]
    },
    'currentSaturation': {
      capability: 'light_saturation',
      transform: (value) => Math.round((value / 254) * 100), // 0-254 → 0-100
      type: 'number',
      range: [0, 100]
    },
    'currentX': {
      capability: 'light_x',
      transform: (value) => value,
      type: 'number',
      range: [0, 65535]
    },
    'currentY': {
      capability: 'light_y',
      transform: (value) => value,
      type: 'number',
      range: [0, 65535]
    },
    'colorTemperature': {
      capability: 'light_temperature',
      transform: (value) => value,
      type: 'number',
      range: [153, 500]
    },
    'colorMode': null,
    'enhancedCurrentHue': null,
    'enhancedColorMode': null,
    'colorLoopActive': null,
    'colorLoopDirection': null,
    'colorLoopTime': null,
    'colorLoopStartEnhancedHue': null,
    'colorLoopStoredEnhancedHue': null,
    'colorCapabilities': null,
    'colorTempPhysicalMin': null,
    'colorTempPhysicalMax': null,
    'coupleColorTempToLevelMin': null,
    'startUpColorTemperature': null
  },

  // Temperature Measurement cluster
  'msTemperatureMeasurement': {
    'measuredValue': {
      capability: 'measure_temperature',
      transform: (value) => Math.round((value / 100) * 10) / 10, // 0.01°C → °C
      type: 'number',
      unit: '°C'
    },
    'minMeasuredValue': null,
    'maxMeasuredValue': null,
    'tolerance': null
  },

  // Humidity Measurement cluster
  'msRelativeHumidity': {
    'measuredValue': {
      capability: 'measure_humidity',
      transform: (value) => Math.round((value / 100) * 10) / 10, // 0.01% → %
      type: 'number',
      unit: '%',
      range: [0, 100]
    },
    'minMeasuredValue': null,
    'maxMeasuredValue': null,
    'tolerance': null
  },

  // Pressure Measurement cluster
  'msPressureMeasurement': {
    'measuredValue': {
      capability: 'measure_pressure',
      transform: (value) => Math.round((value / 10) * 10) / 10, // 0.1 hPa → hPa
      type: 'number',
      unit: 'hPa'
    },
    'minMeasuredValue': null,
    'maxMeasuredValue': null,
    'tolerance': null,
    'scaledValue': null,
    'minScaledValue': null,
    'maxScaledValue': null,
    'scaledTolerance': null,
    'scale': null
  },

  // Illuminance Measurement cluster
  'msIlluminanceMeasurement': {
    'measuredValue': {
      capability: 'measure_illuminance',
      transform: (value) => Math.round((value / 100) * 10) / 10, // 0.01 lux → lux
      type: 'number',
      unit: 'lux'
    },
    'minMeasuredValue': null,
    'maxMeasuredValue': null,
    'tolerance': null,
    'lightSensorType': null
  },

  // Electrical Measurement cluster
  'haElectricalMeasurement': {
    'activePower': {
      capability: 'measure_power',
      transform: (value) => Math.round(value * 10) / 10, // W
      type: 'number',
      unit: 'W'
    },
    'rmsVoltage': {
      capability: 'measure_voltage',
      transform: (value) => Math.round(value * 10) / 10, // V
      type: 'number',
      unit: 'V'
    },
    'rmsCurrent': {
      capability: 'measure_current',
      transform: (value) => Math.round((value / 1000) * 1000) / 1000, // mA → A
      type: 'number',
      unit: 'A'
    },
    'apparentPower': null,
    'powerFactor': null,
    'averageRmsVoltageMeasurementPeriod': null,
    'averageRmsUnderVoltageCounter': null,
    'rmsExtremeUnderVoltagePeriod': null,
    'rmsExtremeOverVoltagePeriod': null,
    'rmsVoltageSagPeriod': null,
    'rmsVoltageSwellPeriod': null,
    'acVoltageMultiplier': null,
    'acVoltageDivisor': null,
    'acCurrentMultiplier': null,
    'acCurrentDivisor': null,
    'acPowerMultiplier': null,
    'acPowerDivisor': null,
    'dcOverloadAlarmsMask': null,
    'dcVoltageOverload': null,
    'dcCurrentOverload': null,
    'acAlarmsMask': null,
    'acVoltageOverload': null,
    'acCurrentOverload': null,
    'acActivePowerOverload': null,
    'acApparentPowerOverload': null,
    'acReactivePowerOverload': null,
    'averageRmsOverVoltageCounter': null,
    'averageRmsUnderVoltageCounter': null,
    'rmsExtremeOverVoltagePeriod': null,
    'rmsVoltageSagPeriod': null,
    'rmsVoltageSwellPeriod': null,
    'lineCurrentPhB': null,
    'activeCurrentPhB': null,
    'reactiveCurrentPhB': null,
    'rmsVoltagePhB': null,
    'rmsVoltageMinPhB': null,
    'rmsVoltageMaxPhB': null,
    'rmsCurrentPhB': null,
    'rmsCurrentMinPhB': null,
    'rmsCurrentMaxPhB': null,
    'activePowerPhB': null,
    'activePowerMinPhB': null,
    'activePowerMaxPhB': null,
    'reactivePowerPhB': null,
    'apparentPowerPhB': null,
    'powerFactorPhB': null,
    'averageRmsVoltageMeasurementPeriodPhB': null,
    'averageRmsOverVoltageCounterPhB': null,
    'averageRmsUnderVoltageCounterPhB': null,
    'rmsExtremeOverVoltagePeriodPhB': null,
    'rmsVoltageSagPeriodPhB': null,
    'rmsVoltageSwellPeriodPhB': null,
    'lineCurrentPhC': null,
    'activeCurrentPhC': null,
    'reactiveCurrentPhC': null,
    'rmsVoltagePhC': null,
    'rmsVoltageMinPhC': null,
    'rmsVoltageMaxPhC': null,
    'rmsCurrentPhC': null,
    'rmsCurrentMinPhC': null,
    'rmsCurrentMaxPhC': null,
    'activePowerPhC': null,
    'activePowerMinPhC': null,
    'activePowerMaxPhC': null,
    'reactivePowerPhC': null,
    'apparentPowerPhC': null,
    'powerFactorPhC': null,
    'averageRmsVoltageMeasurementPeriodPhC': null,
    'averageRmsOverVoltageCounterPhC': null,
    'averageRmsUnderVoltageCounterPhC': null,
    'rmsExtremeOverVoltagePeriodPhC': null,
    'rmsVoltageSagPeriodPhC': null,
    'rmsVoltageSwellPeriodPhC': null
  },

  // Simple Metering cluster
  'seMetering': {
    'currentSummDelivered': {
      capability: 'meter_power',
      transform: (value) => Math.round((value / 3600000) * 1000) / 1000, // Wh → kWh
      type: 'number',
      unit: 'kWh'
    },
    'currentSummReceived': null,
    'currentMaxDemandDelivered': null,
    'currentMaxDemandReceived': null,
    'dftSumm': null,
    'dailyFreezeTime': null,
    'powerFactor': null,
    'readingSnapShotType': null,
    'currentMaxDemandDeliveredTime': null,
    'currentMaxDemandReceivedTime': null,
    'defaultUpdatePeriod': null,
    'fastPollUpdatePeriod': null,
    'currentBlockPeriodConsumptionDelivered': null,
    'dailyConsumptionTarget': null,
    'currentBlock': null,
    'profileIntervalPeriod': null,
    'intervalReadReporting': null,
    'presetReadingTime': null,
    'volumePerReport': null,
    'flowRestriction': null,
    'supplyStatus': null,
    'currentInletEnergyCarrierSummation': null,
    'currentOutletEnergyCarrierSummation': null,
    'inletTemperature': null,
    'outletTemperature': null,
    'controlTemp': null,
    'currentBlock1ConsumptionDelivered': null,
    'currentBlock2ConsumptionDelivered': null,
    'currentBlock3ConsumptionDelivered': null,
    'currentBlock4ConsumptionDelivered': null,
    'currentBlock5ConsumptionDelivered': null,
    'currentBlock6ConsumptionDelivered': null,
    'currentBlock1ConsumptionReceived': null,
    'currentBlock2ConsumptionReceived': null,
    'currentBlock3ConsumptionReceived': null,
    'currentBlock4ConsumptionReceived': null,
    'currentBlock5ConsumptionReceived': null,
    'currentBlock6ConsumptionReceived': null,
    'currentInletEnergyCarrierSummation': null,
    'currentOutletEnergyCarrierSummation': null,
    'inletTemperature': null,
    'outletTemperature': null,
    'controlTemp': null,
    'currentBlock1ConsumptionDelivered': null,
    'currentBlock2ConsumptionDelivered': null,
    'currentBlock3ConsumptionDelivered': null,
    'currentBlock4ConsumptionDelivered': null,
    'currentBlock5ConsumptionDelivered': null,
    'currentBlock6ConsumptionDelivered': null,
    'currentBlock1ConsumptionReceived': null,
    'currentBlock2ConsumptionReceived': null,
    'currentBlock3ConsumptionReceived': null,
    'currentBlock4ConsumptionReceived': null,
    'currentBlock5ConsumptionReceived': null,
    'currentBlock6ConsumptionReceived': null
  },

  // Window Covering cluster
  'closuresWindowCovering': {
    'currentPositionLiftPercentage': {
      capability: 'windowcoverings_state',
      transform: (value) => Math.round((value / 100) * 100), // 0-100 → 0-100
      type: 'number',
      range: [0, 100]
    },
    'currentPositionTiltPercentage': {
      capability: 'windowcoverings_tilt',
      transform: (value) => Math.round((value / 100) * 100), // 0-100 → 0-100
      type: 'number',
      range: [0, 100]
    },
    'installedOpenLimitLift': null,
    'installedClosedLimitLift': null,
    'installedOpenLimitTilt': null,
    'installedClosedLimitTilt': null,
    'velocityLift': null,
    'accelerationTimeLift': null,
    'decelerationTimeLift': null,
    'mode': null,
    'intermediateSetpointsLift': null,
    'intermediateSetpointsTilt': null
  },

  // IAS Zone cluster
  'ssIasZone': {
    'zoneState': {
      capability: 'alarm_contact',
      transform: (value) => value === 1, // 0=not enrolled, 1=enrolled
      type: 'boolean'
    },
    'zoneType': null,
    'zoneStatus': null,
    'iasCieAddress': null,
    'zoneId': null,
    'numberOfZoneSensitivityLevelsSupported': null,
    'currentZoneSensitivityLevel': null
  },

  // Power Configuration cluster
  'genPowerCfg': {
    'batteryVoltage': null,
    'batteryPercentageRemaining': {
      capability: 'measure_battery',
      transform: (value) => Math.round(value / 2), // 0.5% → %
      type: 'number',
      unit: '%',
      range: [0, 100]
    },
    'batteryManufacturer': null,
    'batterySize': null,
    'batteryAHrRating': null,
    'batteryQuantity': null,
    'batteryRatedVoltage': null,
    'batteryAlarmMask': null,
    'batteryVoltageMinThreshold': null,
    'batteryVoltageThreshold1': null,
    'batteryVoltageThreshold2': null,
    'batteryVoltageThreshold3': null,
    'batteryPercentageMinThreshold': null,
    'batteryPercentageThreshold1': null,
    'batteryPercentageThreshold2': null,
    'batteryPercentageThreshold3': null,
    'batteryAlarmState': null,
    'battery2Voltage': null,
    'battery2PercentageRemaining': null,
    'battery2AlarmState': null,
    'battery2Manufacturer': null,
    'battery2Size': null,
    'battery2AHrRating': null,
    'battery2Quantity': null,
    'battery2RatedVoltage': null,
    'battery2AlarmMask': null,
    'battery2VoltageMinThreshold': null,
    'battery2VoltageThreshold1': null,
    'battery2VoltageThreshold2': null,
    'battery2VoltageThreshold3': null,
    'battery2PercentageMinThreshold': null,
    'battery2PercentageThreshold1': null,
    'battery2PercentageThreshold2': null,
    'battery2PercentageThreshold3': null,
    'battery3Voltage': null,
    'battery3PercentageRemaining': null,
    'battery3AlarmState': null,
    'battery3Manufacturer': null,
    'battery3Size': null,
    'battery3AHrRating': null,
    'battery3Quantity': null,
    'battery3RatedVoltage': null,
    'battery3AlarmMask': null,
    'battery3VoltageMinThreshold': null,
    'battery3VoltageThreshold1': null,
    'battery3VoltageThreshold2': null,
    'battery3VoltageThreshold3': null,
    'battery3PercentageMinThreshold': null,
    'battery3PercentageThreshold1': null,
    'battery3PercentageThreshold2': null,
    'battery3PercentageThreshold3': null
  },

  // Thermostat cluster
  'hvacThermostat': {
    'localTemperature': {
      capability: 'measure_temperature_thermostat',
      transform: (value) => Math.round((value / 100) * 10) / 10, // 0.01°C → °C
      type: 'number',
      unit: '°C'
    },
    'outdoorTemperature': null,
    'occupancy': null,
    'absMinHeatSetpointLimit': null,
    'absMaxHeatSetpointLimit': null,
    'absMinCoolSetpointLimit': null,
    'absMaxCoolSetpointLimit': null,
    'piCoolingDemand': null,
    'piHeatingDemand': null,
    'hvacSystemTypeConfiguration': null,
    'localTemperatureCalibration': null,
    'occupiedCoolingSetpoint': {
      capability: 'target_temperature',
      transform: (value) => Math.round((value / 100) * 10) / 10, // 0.01°C → °C
      type: 'number',
      unit: '°C'
    },
    'occupiedHeatingSetpoint': {
      capability: 'target_temperature_heat',
      transform: (value) => Math.round((value / 100) * 10) / 10, // 0.01°C → °C
      type: 'number',
      unit: '°C'
    },
    'unoccupiedCoolingSetpoint': null,
    'unoccupiedHeatingSetpoint': null,
    'minHeatSetpointLimit': null,
    'maxHeatSetpointLimit': null,
    'minCoolSetpointLimit': null,
    'maxCoolSetpointLimit': null,
    'minSetpointDeadBand': null,
    'remoteSensing': null,
    'controlSequenceOfOperation': null,
    'systemMode': null,
    'alarmMask': null,
    'thermostatRunningMode': null,
    'startOfWeek': null,
    'numberOfWeeklyTransitions': null,
    'numberOfDailyTransitions': null,
    'temperatureSetpointHold': null,
    'temperatureSetpointHoldDuration': null,
    'thermostatProgrammingOperationMode': null,
    'weeklySchedule': null,
    'weeklyScheduleTransition': null,
    'weeklyScheduleTransition2': null,
    'weeklyScheduleTransition3': null,
    'weeklyScheduleTransition4': null,
    'weeklyScheduleTransition5': null,
    'weeklyScheduleTransition6': null,
    'weeklyScheduleTransition7': null,
    'weeklyScheduleTransition8': null,
    'weeklyScheduleTransition9': null,
    'weeklyScheduleTransition10': null,
    'weeklyScheduleTransition11': null,
    'weeklyScheduleTransition12': null,
    'weeklyScheduleTransition13': null,
    'weeklyScheduleTransition14': null,
    'weeklyScheduleTransition15': null,
    'weeklyScheduleTransition16': null,
    'weeklyScheduleTransition17': null,
    'weeklyScheduleTransition18': null,
    'weeklyScheduleTransition19': null,
    'weeklyScheduleTransition20': null,
    'weeklyScheduleTransition21': null,
    'weeklyScheduleTransition22': null,
    'weeklyScheduleTransition23': null,
    'weeklyScheduleTransition24': null,
    'weeklyScheduleTransition25': null,
    'weeklyScheduleTransition26': null,
    'weeklyScheduleTransition27': null,
    'weeklyScheduleTransition28': null,
    'weeklyScheduleTransition29': null,
    'weeklyScheduleTransition30': null,
    'weeklyScheduleTransition31': null,
    'weeklyScheduleTransition32': null,
    'weeklyScheduleTransition33': null,
    'weeklyScheduleTransition34': null,
    'weeklyScheduleTransition35': null,
    'weeklyScheduleTransition36': null,
    'weeklyScheduleTransition37': null,
    'weeklyScheduleTransition38': null,
    'weeklyScheduleTransition39': null,
    'weeklyScheduleTransition40': null,
    'weeklyScheduleTransition41': null,
    'weeklyScheduleTransition42': null,
    'weeklyScheduleTransition43': null,
    'weeklyScheduleTransition44': null,
    'weeklyScheduleTransition45': null,
    'weeklyScheduleTransition46': null,
    'weeklyScheduleTransition47': null,
    'weeklyScheduleTransition48': null,
    'weeklyScheduleTransition49': null,
    'weeklyScheduleTransition50': null,
    'weeklyScheduleTransition51': null,
    'weeklyScheduleTransition52': null,
    'weeklyScheduleTransition53': null,
    'weeklyScheduleTransition54': null,
    'weeklyScheduleTransition55': null,
    'weeklyScheduleTransition56': null,
    'weeklyScheduleTransition57': null,
    'weeklyScheduleTransition58': null,
    'weeklyScheduleTransition59': null,
    'weeklyScheduleTransition60': null,
    'weeklyScheduleTransition61': null,
    'weeklyScheduleTransition62': null,
    'weeklyScheduleTransition63': null,
    'weeklyScheduleTransition64': null,
    'weeklyScheduleTransition65': null,
    'weeklyScheduleTransition66': null,
    'weeklyScheduleTransition67': null,
    'weeklyScheduleTransition68': null,
    'weeklyScheduleTransition69': null,
    'weeklyScheduleTransition70': null,
    'weeklyScheduleTransition71': null,
    'weeklyScheduleTransition72': null,
    'weeklyScheduleTransition73': null,
    'weeklyScheduleTransition74': null,
    'weeklyScheduleTransition75': null,
    'weeklyScheduleTransition76': null,
    'weeklyScheduleTransition77': null,
    'weeklyScheduleTransition78': null,
    'weeklyScheduleTransition79': null,
    'weeklyScheduleTransition80': null,
    'weeklyScheduleTransition81': null,
    'weeklyScheduleTransition82': null,
    'weeklyScheduleTransition83': null,
    'weeklyScheduleTransition84': null,
    'weeklyScheduleTransition85': null,
    'weeklyScheduleTransition86': null,
    'weeklyScheduleTransition87': null,
    'weeklyScheduleTransition88': null,
    'weeklyScheduleTransition89': null,
    'weeklyScheduleTransition90': null,
    'weeklyScheduleTransition91': null,
    'weeklyScheduleTransition92': null,
    'weeklyScheduleTransition93': null,
    'weeklyScheduleTransition94': null,
    'weeklyScheduleTransition95': null,
    'weeklyScheduleTransition96': null,
    'weeklyScheduleTransition97': null,
    'weeklyScheduleTransition98': null,
    'weeklyScheduleTransition99': null,
    'weeklyScheduleTransition100': null,
    'weeklyScheduleTransition101': null,
    'weeklyScheduleTransition102': null,
    'weeklyScheduleTransition103': null,
    'weeklyScheduleTransition104': null,
    'weeklyScheduleTransition105': null,
    'weeklyScheduleTransition106': null,
    'weeklyScheduleTransition107': null,
    'weeklyScheduleTransition108': null,
    'weeklyScheduleTransition109': null,
    'weeklyScheduleTransition110': null,
    'weeklyScheduleTransition111': null,
    'weeklyScheduleTransition112': null,
    'weeklyScheduleTransition113': null,
    'weeklyScheduleTransition114': null,
    'weeklyScheduleTransition115': null,
    'weeklyScheduleTransition116': null,
    'weeklyScheduleTransition117': null,
    'weeklyScheduleTransition118': null,
    'weeklyScheduleTransition119': null,
    'weeklyScheduleTransition120': null,
    'weeklyScheduleTransition121': null,
    'weeklyScheduleTransition122': null,
    'weeklyScheduleTransition123': null,
    'weeklyScheduleTransition124': null,
    'weeklyScheduleTransition125': null,
    'weeklyScheduleTransition126': null,
    'weeklyScheduleTransition127': null,
    'weeklyScheduleTransition128': null,
    'weeklyScheduleTransition129': null,
    'weeklyScheduleTransition130': null,
    'weeklyScheduleTransition131': null,
    'weeklyScheduleTransition132': null,
    'weeklyScheduleTransition133': null,
    'weeklyScheduleTransition134': null,
    'weeklyScheduleTransition135': null,
    'weeklyScheduleTransition136': null,
    'weeklyScheduleTransition137': null,
    'weeklyScheduleTransition138': null,
    'weeklyScheduleTransition139': null,
    'weeklyScheduleTransition140': null,
    'weeklyScheduleTransition141': null,
    'weeklyScheduleTransition142': null,
    'weeklyScheduleTransition143': null,
    'weeklyScheduleTransition144': null,
    'weeklyScheduleTransition145': null,
    'weeklyScheduleTransition146': null,
    'weeklyScheduleTransition147': null,
    'weeklyScheduleTransition148': null,
    'weeklyScheduleTransition149': null,
    'weeklyScheduleTransition150': null,
    'weeklyScheduleTransition151': null,
    'weeklyScheduleTransition152': null,
    'weeklyScheduleTransition153': null,
    'weeklyScheduleTransition154': null,
    'weeklyScheduleTransition155': null,
    'weeklyScheduleTransition156': null,
    'weeklyScheduleTransition157': null,
    'weeklyScheduleTransition158': null,
    'weeklyScheduleTransition159': null,
    'weeklyScheduleTransition160': null,
    'weeklyScheduleTransition161': null,
    'weeklyScheduleTransition162': null,
    'weeklyScheduleTransition163': null,
    'weeklyScheduleTransition164': null,
    'weeklyScheduleTransition165': null,
    'weeklyScheduleTransition166': null,
    'weeklyScheduleTransition167': null,
    'weeklyScheduleTransition168': null,
    'weeklyScheduleTransition169': null,
    'weeklyScheduleTransition170': null,
    'weeklyScheduleTransition171': null,
    'weeklyScheduleTransition172': null,
    'weeklyScheduleTransition173': null,
    'weeklyScheduleTransition174': null,
    'weeklyScheduleTransition175': null,
    'weeklyScheduleTransition176': null,
    'weeklyScheduleTransition177': null,
    'weeklyScheduleTransition178': null,
    'weeklyScheduleTransition179': null,
    'weeklyScheduleTransition180': null,
    'weeklyScheduleTransition181': null,
    'weeklyScheduleTransition182': null,
    'weeklyScheduleTransition183': null,
    'weeklyScheduleTransition184': null,
    'weeklyScheduleTransition185': null,
    'weeklyScheduleTransition186': null,
    'weeklyScheduleTransition187': null,
    'weeklyScheduleTransition188': null,
    'weeklyScheduleTransition189': null,
    'weeklyScheduleTransition190': null,
    'weeklyScheduleTransition191': null,
    'weeklyScheduleTransition192': null,
    'weeklyScheduleTransition193': null,
    'weeklyScheduleTransition194': null,
    'weeklyScheduleTransition195': null,
    'weeklyScheduleTransition196': null,
    'weeklyScheduleTransition197': null,
    'weeklyScheduleTransition198': null,
    'weeklyScheduleTransition199': null,
    'weeklyScheduleTransition200': null,
    'weeklyScheduleTransition201': null,
    'weeklyScheduleTransition202': null,
    'weeklyScheduleTransition203': null,
    'weeklyScheduleTransition204': null,
    'weeklyScheduleTransition205': null,
    'weeklyScheduleTransition206': null,
    'weeklyScheduleTransition207': null,
    'weeklyScheduleTransition208': null,
    'weeklyScheduleTransition209': null,
    'weeklyScheduleTransition210': null,
    'weeklyScheduleTransition211': null,
    'weeklyScheduleTransition212': null,
    'weeklyScheduleTransition213': null,
    'weeklyScheduleTransition214': null,
    'weeklyScheduleTransition215': null,
    'weeklyScheduleTransition216': null,
    'weeklyScheduleTransition217': null,
    'weeklyScheduleTransition218': null,
    'weeklyScheduleTransition219': null,
    'weeklyScheduleTransition220': null,
    'weeklyScheduleTransition221': null,
    'weeklyScheduleTransition222': null,
    'weeklyScheduleTransition223': null,
    'weeklyScheduleTransition224': null,
    'weeklyScheduleTransition225': null,
    'weeklyScheduleTransition226': null,
    'weeklyScheduleTransition227': null,
    'weeklyScheduleTransition228': null,
    'weeklyScheduleTransition229': null,
    'weeklyScheduleTransition230': null,
    'weeklyScheduleTransition231': null,
    'weeklyScheduleTransition232': null,
    'weeklyScheduleTransition233': null,
    'weeklyScheduleTransition234': null,
    'weeklyScheduleTransition235': null,
    'weeklyScheduleTransition236': null,
    'weeklyScheduleTransition237': null,
    'weeklyScheduleTransition238': null,
    'weeklyScheduleTransition239': null,
    'weeklyScheduleTransition240': null,
    'weeklyScheduleTransition241': null,
    'weeklyScheduleTransition242': null,
    'weeklyScheduleTransition243': null,
    'weeklyScheduleTransition244': null,
    'weeklyScheduleTransition245': null,
    'weeklyScheduleTransition246': null,
    'weeklyScheduleTransition247': null,
    'weeklyScheduleTransition248': null,
    'weeklyScheduleTransition249': null,
    'weeklyScheduleTransition250': null,
    'weeklyScheduleTransition251': null,
    'weeklyScheduleTransition252': null,
    'weeklyScheduleTransition253': null,
    'weeklyScheduleTransition254': null,
    'weeklyScheduleTransition255': null
  }
};

class ClusterCapabilityMapper {
  constructor() {
    this.mappings = CLUSTER_CAP_MAP;
  }

  /**
   * Get capability mapping for a cluster attribute
   */
  getCapabilityMapping(clusterName, attributeName) {
    const cluster = this.mappings[clusterName];
    if (!cluster) return null;
    
    return cluster[attributeName] || null;
  }

  /**
   * Get all capabilities for a cluster
   */
  getClusterCapabilities(clusterName) {
    const cluster = this.mappings[clusterName];
    if (!cluster) return [];
    
    const capabilities = [];
    for (const [attribute, mapping] of Object.entries(cluster)) {
      if (mapping && mapping.capability) {
        capabilities.push({
          attribute,
          capability: mapping.capability,
          transform: mapping.transform,
          type: mapping.type,
          range: mapping.range,
          unit: mapping.unit
        });
      }
    }
    
    return capabilities;
  }

  /**
   * Transform attribute value to capability value
   */
  transformValue(clusterName, attributeName, value) {
    const mapping = this.getCapabilityMapping(clusterName, attributeName);
    if (!mapping || !mapping.transform) return value;
    
    try {
      return mapping.transform(value);
    } catch (error) {
      console.error(`Transform error for ${clusterName}.${attributeName}:`, error);
      return value;
    }
  }

  /**
   * Get all supported capabilities
   */
  getAllCapabilities() {
    const capabilities = new Set();
    
    for (const cluster of Object.values(this.mappings)) {
      for (const mapping of Object.values(cluster)) {
        if (mapping && mapping.capability) {
          capabilities.add(mapping.capability);
        }
      }
    }
    
    return Array.from(capabilities);
  }

  /**
   * Validate capability value
   */
  validateCapabilityValue(capabilityName, value) {
    for (const cluster of Object.values(this.mappings)) {
      for (const mapping of Object.values(cluster)) {
        if (mapping && mapping.capability === capabilityName) {
          if (mapping.type === 'boolean') {
            return typeof value === 'boolean';
          }
          
          if (mapping.type === 'number') {
            if (typeof value !== 'number') return false;
            
            if (mapping.range) {
              const [min, max] = mapping.range;
              return value >= min && value <= max;
            }
            
            return true;
          }
          
          if (mapping.type === 'string') {
            return typeof value === 'string';
          }
        }
      }
    }
    
    return false;
  }
}

module.exports = new ClusterCapabilityMapper();
