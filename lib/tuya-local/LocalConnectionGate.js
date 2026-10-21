'use strict';
/**
 * P2930 — One LAN session per Tuya device id, app-wide.
 * Tuya firmwares (tinytuya/tuyapi docs, localtuya issue threads) accept a single local
 * TCP client: a second socket kicks the first, producing ECONNRESET / "socket hang up"
 * loops. Owners are held weakly-by-design: a destroyed owner is reclaimed automatically.
 */
const owners = new Map(); // id -> owner

function _alive(o) { return o && !o._destroyed; }

function acquire(id, owner) {
  if (!id) {return true;}
  const cur = owners.get(id);
  if (cur && cur !== owner && _alive(cur)) {return false;}
  owners.set(id, owner);
  return true;
}

function release(id, owner) {
  if (owners.get(id) === owner) {owners.delete(id);}
}

function holder(id) { const o = owners.get(id); return _alive(o) ? o : null; }
function size() { return owners.size; }
function _reset() { owners.clear(); }

module.exports = { acquire, release, holder, size, _reset };
