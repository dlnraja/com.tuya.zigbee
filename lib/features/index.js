'use strict';

/**
 * Features Index - v9.1.0
 *
 * Centralized exports for all feature modules
 */

module.exports = {
  // Existing features
  AdvancedMultiConditionFlows: require('./AdvancedMultiConditionFlows'),
  CustomCapabilityTemplates: require('./CustomCapabilityTemplates'),
  StateHistoryTrigger: require('./StateHistoryTrigger'),
  NetworkTopologyTrigger: require('./NetworkTopologyTrigger'),
  DeviceGroupSceneManager: require('./DeviceGroupSceneManager'),
  DeviceMigrationWizard: require('./DeviceMigrationWizard'),
  ConfigurationBackupRestore: require('./ConfigurationBackupRestore'),
  DiagnosticReportExport: require('./DiagnosticReportExport'),
  TuyaCloudSceneSync: require('./TuyaCloudSceneSync'),
  CapabilityExportImport: require('./CapabilityExportImport'),

  // v9.1.0: Smart Features (Phase 1)
  SolarElevation: require('./SolarElevation'),
  TransitionEngine: require('./TransitionEngine'),
  EnergyHistoryStore: require('./EnergyHistoryStore'),
  TariffCalculator: require('./TariffCalculator'),
  ScheduleManager: require('./ScheduleManager'),
  ConditionEngine: require('./ConditionEngine'),
  PredictiveHealthEngine: require('./PredictiveHealthEngine'),
  NetworkTopologyCollector: require('./NetworkTopologyCollector')
};
