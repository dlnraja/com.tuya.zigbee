'use strict';

/**
 * Features Index - v9.1.0
 *
 * Centralized exports for all feature modules
 */

module.exports = {
  AdvancedMultiConditionFlows: require('./AdvancedMultiConditionFlows'),
  CustomCapabilityTemplates: require('./CustomCapabilityTemplates'),
  StateHistoryTrigger: require('./StateHistoryTrigger'),
  NetworkTopologyTrigger: require('./NetworkTopologyTrigger'),
  DeviceGroupSceneManager: require('./DeviceGroupSceneManager'),
  DeviceMigrationWizard: require('./DeviceMigrationWizard'),
  ConfigurationBackupRestore: require('./ConfigurationBackupRestore'),
  DiagnosticReportExport: require('./DiagnosticReportExport'),
  TuyaCloudSceneSync: require('./TuyaCloudSceneSync'),
  CapabilityExportImport: require('./CapabilityExportImport')
};
