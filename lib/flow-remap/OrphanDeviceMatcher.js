'use strict';

/**
 * Detect likely re-pair / driver-move pairs among this app's devices.
 * Match on IEEE first, then exact mfr+pid. Never invent identifiers.
 */

function norm(s) {
  return String(s || '').trim().toLowerCase();
}

function ieeeOf(device) {
  const data = device && (device.data || device);
  const raw = data.ieeeAddress || data.ieee || data.ieeeAddr
    || data.deviceIeeeAddress || device.ieeeAddress || device.ieee || '';
  return norm(raw);
}

function coupleOf(device) {
  const data = device && (device.data || device);
  const mfr = norm(device.manufacturerName || data.manufacturerName || data.manufacturer || '');
  const pid = String(device.productId || data.productId || data.modelId || '').trim().toUpperCase();
  if (!mfr || !pid) {return '';}
  return `${mfr}|${pid}`;
}

/**
 * @param {Array<object>} devices {id,name,driverId,available,ieeeAddress,manufacturerName,productId,className,capabilities}
 * @returns {Array<{reason:string, ieee?:string, couple?:string, older:object, newer:object}>}
 */
function findOrphanPairs(devices) {
  const list = Array.isArray(devices) ? devices : [];
  const byIeee = new Map();
  const byCouple = new Map();
  for (const d of list) {
    if (!d || !d.id) {continue;}
    const ieee = ieeeOf(d);
    if (ieee) {
      if (!byIeee.has(ieee)) {byIeee.set(ieee, []);}
      byIeee.get(ieee).push(d);
    }
    const couple = coupleOf(d);
    if (couple) {
      if (!byCouple.has(couple)) {byCouple.set(couple, []);}
      byCouple.get(couple).push(d);
    }
  }
  const out = [];
  const seen = new Set();
  const pushPair = (reason, keyField, key, a, b) => {
    const sig = [reason, key, a.id, b.id].sort().join('|');
    if (seen.has(sig) || a.id === b.id) {return;}
    seen.add(sig);
    // Prefer treating an unavailable / older-looking entry as "old"
    const aOld = a.available === false && b.available !== false;
    const older = aOld ? a : b.available === false && a.available !== false ? b : a;
    const newer = older === a ? b : a;
    out.push({ reason, [keyField]: key, older, newer });
  };
  for (const [ieee, group] of byIeee) {
    if (group.length < 2) {continue;}
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        pushPair('same-ieee', 'ieee', ieee, group[i], group[j]);
      }
    }
  }
  for (const [couple, group] of byCouple) {
    if (group.length < 2) {continue;}
    const drivers = new Set(group.map((d) => d.driverId));
    if (drivers.size < 2 && group.every((d) => d.available !== false)) {continue;}
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        if (group[i].driverId !== group[j].driverId || group[i].available === false || group[j].available === false) {
          pushPair('same-couple', 'couple', couple, group[i], group[j]);
        }
      }
    }
  }
  return out;
}

module.exports = { findOrphanPairs, ieeeOf, coupleOf };
