'use strict';

/**
 * LocalSelfImproveCatalog (P2542)
 * WHY: Homey Pro has no cloud AI — document/wire local compensators for agents & soft boot notes.
 * Contre quoi: bots inventing remote AI “self-heal” paths inside the app bundle.
 *
 * This module is intentionally tiny and side-effect free.
 */

const LOCAL_STACKS = Object.freeze([
  { id: 'boot_budget', path: 'lib/performance/BootBudget.js', role: 'heap / defer heavy init' },
  { id: 'gap_compensator', path: 'lib/resilience/HomeyGapCompensator.js', role: 'soft Homey SDK gaps' },
  { id: 'protocol_fallback', path: 'lib/io/ProtocolFallbackChain.js', role: 'EF00/ZCL/raw RX-TX order' },
  { id: 'protocol_rxtx', path: 'lib/layers/ProtocolRxTxChain.js', role: 'complementary protocol paths' },
  { id: 'raw_cluster', path: 'lib/clusters/RawClusterFallback.js', role: 'listen CO2/VOC/PM without map-only' },
  { id: 'smart_divisor', path: 'lib/managers/SmartDivisorManager.js', role: 'anti double-division' },
  { id: 'local_first', path: 'lib/LocalFirstEngine.js', role: 'offline diagnose / predict' },
  { id: 'capability_ux', path: 'lib/utils/HomeyCapabilityUx.js', role: 'capability UX charter' },
  { id: 'complementary_merge', path: 'lib/enrichment/ComplementaryMerge.js', role: 'CI enrich union-only (not Homey bundle)' },
]);

function listLocalStacks() {
  return LOCAL_STACKS.slice();
}

function assertNoRemoteAiPolicy() {
  return {
    AI_FORCE_LOCAL: true,
    AI_ALLOW_REMOTE: false,
    cloudAiInHomeyRuntime: false,
    forumPost: false,
  };
}

module.exports = {
  LOCAL_STACKS,
  listLocalStacks,
  assertNoRemoteAiPolicy,
};
