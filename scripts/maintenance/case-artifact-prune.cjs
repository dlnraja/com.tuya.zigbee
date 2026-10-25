'use strict';
// WHY(P3041, 25/10/2026 Paris): OPT-IN (config/publish-caps.json caps.pruneArtifactCaseForms = 1, default 0).
// Removes from the compacted payload the unsourced all-lower/all-upper case twins (definition in
// scripts/lib/case-form-sources.cjs), INCLUDING twins pinned by the P3024b baseline. Every removed form
// keeps a sourced or canonical form of the same manufacturer on the SAME driver with the SAME productIds,
// so the couple stays pairable for every device that sends a sourced or canonical string; only strings no
// source has ever seen leave. Because this changes the P3024b "0 lost exact string" rule into "0 lost
// case-equivalent couple", it stays off until the owner says yes. Adds nothing, never touches productId.
const { splitArtifactForms } = require('../lib/case-form-sources.cjs');

const arr = (v) => (Array.isArray(v) ? v : []);

function pruneManifest(manifest, sourced) {
  const report = { removedForms: 0, removedCombos: 0, perDriver: {}, removed: [], orphaned: [] };
  for (const d of manifest.drivers || []) {
    const z = d && d.zigbee;
    if (!z || !Array.isArray(z.manufacturerName)) continue;
    const pids = arr(z.productId);
    const { kept, artifacts } = splitArtifactForms(z.manufacturerName, sourced);
    if (!artifacts.length) continue;
    const keptKeys = new Set(kept.map((v) => String(v).trim().toLowerCase()));
    for (const f of artifacts) {
      // Invariant: a case-equivalent form stays on this driver (else it is not an artifact).
      if (!keptKeys.has(String(f).trim().toLowerCase())) report.orphaned.push(`${f}@${d.id}`);
      report.removed.push({ driverId: d.id, form: f, productIds: pids.length });
    }
    z.manufacturerName = kept;
    report.removedForms += artifacts.length;
    report.removedCombos += artifacts.length * pids.length;
    report.perDriver[d.id] = artifacts.length;
  }
  return report;
}

module.exports = { pruneManifest };
