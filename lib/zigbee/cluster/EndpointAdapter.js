'use strict';

/**
 * EndpointAdapter — compare what the driver expects (driver.compose zigbee
 * endpoints) with what the device really exposes (node descriptor from the
 * interview) and produce an ADDITIVE adaptation plan: extra endpoints/
 * clusters to listen on, and expected ones that are missing (reported, never
 * removed). Same spirit as ZHA quirk "replacement" signatures, but never
 * destructive: native pairing data stays the base.
 */

function _norm(list) {
  return (list || []).map(c => Number(c)).filter(n => Number.isFinite(n));
}

function diff(driverEndpoints = {}, nodeDescriptor = {}) {
  const actual = {};
  for (const e of nodeDescriptor.endpoints || []) {
    const id = Number(e.endpointId !== undefined ? e.endpointId : e.id);
    actual[id] = { in: _norm(e.inputClusters), out: _norm(e.outputClusters) };
  }
  const plan = { addListen: [], addBind: [], missing: [], extraEndpoints: [] };
  for (const [idS, exp] of Object.entries(driverEndpoints)) {
    const id = Number(idS); const a = actual[id];
    if (!a) { plan.missing.push({ ep: id, all: true }); continue; }
    for (const c of _norm(exp.clusters)) if (!a.in.includes(c)) plan.missing.push({ ep: id, cluster: c });
  }
  for (const [idS, a] of Object.entries(actual)) {
    const id = Number(idS); const exp = driverEndpoints[id] || driverEndpoints[idS];
    if (id === 242) continue; // green power proxy
    if (!exp) plan.extraEndpoints.push(id);
    const expIn = exp ? _norm(exp.clusters) : [];
    const expBind = exp ? _norm(exp.bindings) : [];
    for (const c of a.in) if (!expIn.includes(c)) plan.addListen.push({ ep: id, cluster: c });
    for (const c of a.out) if (!expBind.includes(c)) plan.addBind.push({ ep: id, cluster: c });
  }
  return plan;
}

module.exports = { diff };
