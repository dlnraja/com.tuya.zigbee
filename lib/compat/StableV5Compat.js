'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// StableV5Compat.js — Module de compatibilité stable-v5 → master
// ═══════════════════════════════════════════════════════════════════════════
//
// CONTEXTE — l'évolution du projet en 4 ères :
//
//   v5.11.x (stable-v5) : Architecture "fat classes" — HybridDriverSystem,
//     UniversalIasDevice, SonoffZclDevice, ButtonRemoteManager. UN driver
//     générique adaptatif par catégorie. Riche mais monolithique.
//
//   v7.x : Migration SDK3. Les classes fat éclatent en mixins (PhysicalButton,
//     VirtualButton, MultiGang). Plus modulaire mais perte de certaines logiques.
//
//   v8.x (Phoenix) : Unification batterie (UnifiedBatteryHandler), SmartDivisor,
//     Fleetwood Gateway. 246 fixes de timers nus. Mais consolidation aggressive.
//
//   v9.x (Sovereign) : 429 drivers dédiés. Le commit TITAN V5 GOD-MODE
//     (53234799d) supprime 20 fichiers lib/ uniques à stable-v5, croyant
//     que les mixins remplaçaient tout. En réalité, plusieurs fallbacks
//     intelligents ont été perdus.
//
// CE MODULE reporte les fallbacks les plus précieux de stable-v5 qui n'ont
// PAS d'équivalent exact dans master, en mode non-invasif (optionnel).
// Il ne remplace RIEN dans master — il ajoute des capacités complémentaires.
// ═══════════════════════════════════════════════════════════════════════════

const EventDeduplicationLayer = require('../filter/EventDeduplicationLayer');

/**
 * Registre des modules stable-v5 portés, avec leur statut et raison d'être.
 */
const STABLE_V5_MODULES = {
  EventDeduplicationLayer: {
    status: 'PORTED',
    path: '../filter/EventDeduplicationLayer.js',
    reason: "Règle d'or '1 action physique = 1 event Homey'. stable-v5 empêchait "
      + 'les doublons ZCL+DP sur les TS0601 hybrides. master n avait que la '
      + 'déduplication par-gang, pas par (device, capability, valeur).',
  },
  ButtonRemoteManager: {
    status: 'SUPERSEDED',
    reason: "Gérait les boutons stateless (TS0041-44) via COMMANDS pas ATTRIBUTES. "
      + "Remplacé dans master par PhysicalButtonMixin._setupGangPhysicalDetection "
      + "+ LegacyButtonDetectionMixin. La logique est équivalente mais distribuée.",
  },
  HybridDriverSystem: {
    status: 'SUPERSEDED',
    reason: "Système auto-adaptatif (1 driver pour toutes variantes). Remplacé par "
      + "429 drivers dédiés + PermissiveMatchingEngine. Le pattern adaptatif survit "
      + "via DynamicCapabilityManager (pruning post-pairing 5 min).",
  },
  UniversalIasDevice: {
    status: 'PARTIAL',
    reason: "Base class IAS universelle (smoke/CO/water/motion/siren). master a "
      + "des drivers IAS dédiés mais perd l'enrollment CIE universel et le mapping "
      + "IAS_ZONE_TYPES→capabilities centralisé. À réintégrer si devices HEIMAN.",
  },
  HeimanIasDevice: {
    status: 'PARTIAL',
    reason: "Spécialisation HEIMAN (HS1SA, HS2WD-E). master gère ces devices via "
      + "drivers dédiés mais sans la logique riche IAS WD (siren/strobe patterns).",
  },
  SonoffZclDevice: {
    status: 'SUPERSEDED',
    reason: "Base SONOFF/eWeLink ZCL. master a SonoffEwelinkMixin + SonoffEnergyMixin "
      + "+ SonoffSensorMixin qui couvrent les mêmes clusters de façon modulaire.",
  },
  DiagnosticManager: {
    status: 'SUPERSEDED',
    reason: "Remplacé par DiagnosticAPI + DiagnosticEngine + SystemLogsCollector "
      + "+ DiagnosticLogger (plus granulaire).",
  },
  ManufacturerDatabase: {
    status: 'SUPERSEDED',
    reason: "Remplacé par driver-mapping-database.json (656KB) + DeviceFingerprintDB "
      + "+ ManufacturerVariationManager (format JSON, plus maintenable).",
  },
  NewDevices2025: {
    status: 'MERGED',
    reason: "Liste statique de devices 2025. Ses fingerprints ont été mergés dans "
      + "les driver.compose.json correspondants (vérifié : 4040 FPs présents).",
  },
  DynamicDriverMatcher: {
    status: 'SUPERSEDED',
    reason: "Remplacé par PermissiveMatchingEngine + TwoPhaseEnrichment.",
  },
  tuyaDpEngine: {
    status: 'SUPERSEDED',
    reason: "Moteur DP modulaire (converters onoff/power/temp). Remplacé par "
      + "TuyaEF00Manager + TuyaDPParser + AdaptiveDataParser + EnrichedDPMappings.",
  },
};

/**
 * Factory qui crée une instance EventDeduplicationLayer partagée (singleton).
 * À injecter dans app.js ou dans un device qui en a besoin.
 *
 * @param {Object} homey - Instance Homey
 * @param {Object} [options] - Options EventDeduplicationLayer
 * @returns {EventDeduplicationLayer}
 */
let _dedupInstance = null;
function getEventDeduplicationLayer(homey, options = {}) {
  if (!_dedupInstance || _dedupInstance._destroyed) {
    _dedupInstance = new EventDeduplicationLayer({ homey, ...options });
  }
  return _dedupInstance;
}

/**
 * Rapport de compatibilité stable-v5 — utile pour diagnostics.
 * @returns {Object} État de chaque module stable-v5
 */
function getCompatReport() {
  const report = {};
  for (const [name, info] of Object.entries(STABLE_V5_MODULES)) {
    report[name] = {
      status: info.status,
      reason: info.reason,
      ...(info.path ? { path: info.path } : {}),
    };
  }
  if (_dedupInstance) {
    report.EventDeduplicationLayer.active = true;
    report.EventDeduplicationLayer.stats = _dedupInstance.getStats();
  }
  return report;
}

module.exports = {
  STABLE_V5_MODULES,
  getEventDeduplicationLayer,
  getCompatReport,
  EventDeduplicationLayer,
};
