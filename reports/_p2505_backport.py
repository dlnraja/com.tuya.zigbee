#!/usr/bin/env python3
"""P2505 — treat deferred suggestions: P2485 BOTH backport to stable + tip close-out."""
from __future__ import annotations

import json
import re
import shutil
from pathlib import Path

M = Path(r"C:\Users\Dell\Documents\homey\master")
S = Path(r"C:\Users\Dell\Documents\homey\stable")

FOUR_GANG = [
    "_TZE200_hewlydpz", "_tze200_hewlydpz",
    "_TZE204_hewlydpz", "_tze204_hewlydpz",
    "_TZE204_7ytnacie", "_tze204_7ytnacie",
]
THREE_GANG = ["_TZE204_rkbxtclc", "_tze204_rkbxtclc"]
ALL = set(x.lower() for x in FOUR_GANG + THREE_GANG)

STRIP_FROM = {
    "curtain_motor": {"hewlydpz"},
    "sensor_illuminance_presence": {"hewlydpz"},
    "dimmer_wall_1gang": {"7ytnacie", "rkbxtclc", "hewlydpz"},
}


def strip_mfrs(compose: Path, needles: set[str]) -> int:
    j = json.loads(compose.read_text(encoding="utf-8"))
    mfrs = j.get("zigbee", {}).get("manufacturerName")
    if not isinstance(mfrs, list):
        return 0
    before = len(mfrs)
    next_list = [m for m in mfrs if not any(n in str(m).lower() for n in needles)]
    if len(next_list) == before:
        return 0
    if not next_list:
        s = f"_hybrid_{compose.parent.name}_needs_device_assignment"
        next_list = [s, s.upper()]
    j["zigbee"]["manufacturerName"] = next_list
    compose.write_text(json.dumps(j, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return before - len([m for m in mfrs if any(n in str(m).lower() for n in needles)])


def ensure_mfrs(compose: Path, add: list[str]) -> int:
    j = json.loads(compose.read_text(encoding="utf-8"))
    zb = j.setdefault("zigbee", {})
    mfrs = zb.setdefault("manufacturerName", [])
    if not isinstance(mfrs, list):
        mfrs = []
        zb["manufacturerName"] = mfrs
    existing = {str(m).lower() for m in mfrs}
    added = 0
    for m in add:
        if m.lower() in existing:
            continue
        mfrs.append(m)
        existing.add(m.lower())
        added += 1
    # ensure TS0601 productId present
    pids = zb.setdefault("productId", [])
    if isinstance(pids, list) and "TS0601" not in pids and "ts0601" not in [str(x).lower() for x in pids]:
        pids.append("TS0601")
    compose.write_text(json.dumps(j, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return added


def inject_launch_once(ef00: Path) -> bool:
    text = ef00.read_text(encoding="utf-8")
    if "static async launchOnce" in text:
        print("launchOnce already present")
        return False
    block = '''
  /**
   * WHY(P2486b): several manager *instances* may exist on a device (Cover / Layers / IO).
   * Only ONE may be *launched* (initialize + EF00 listeners). Collect candidates smartly.
   */
  static collectManagers(device) {
    if (!device) return [];
    const out = [];
    const seen = new Set();
    const push = (m) => {
      if (!m || typeof m.initialize !== 'function' || seen.has(m)) return;
      seen.add(m);
      out.push(m);
    };
    push(device.__ef00LaunchedManager);
    push(device.tuyaEF00Manager);
    push(device._tuyaEF00Manager);
    try { push(device.io?.ef00); } catch (_) { /* noop */ }
    try { push(device.io?.tuyaEF00); } catch (_) { /* noop */ }
    return out;
  }

  /** @returns {TuyaEF00Manager|null} manager already initializing or initialized */
  static findLaunched(device) {
    return this.collectManagers(device).find((m) => m._initialized || m._initializing) || null;
  }

  static isAnyLaunched(device) {
    return !!this.findLaunched(device);
  }

  /**
   * Soft-create primary slot only — does NOT launch.
   * Extra `new TuyaEF00Manager(device)` elsewhere remains allowed.
   */
  static attachPrimary(device) {
    if (!device) return null;
    if (device.tuyaEF00Manager) return device.tuyaEF00Manager;
    const mgr = new TuyaEF00Manager(device);
    device.tuyaEF00Manager = mgr;
    return mgr;
  }

  /**
   * Launch at most one EF00 manager for this device.
   * If any instance is already launched, reuse it (no second listener bind).
   */
  static async launchOnce(device, zclNode) {
    if (!device) return null;
    const running = this.findLaunched(device);
    if (running) {
      if (!device.tuyaEF00Manager) device.tuyaEF00Manager = running;
      device.__ef00LaunchedManager = running;
      return running;
    }
    const mgr = this.attachPrimary(device);
    if (mgr && typeof mgr.initialize === 'function') {
      await mgr.initialize(zclNode);
    }
    if (mgr && (mgr._initialized || mgr._initializing)) {
      device.__ef00LaunchedManager = mgr;
    }
    return mgr;
  }

'''
    # Insert after constructor closing — look for first `_log(...args)` after class start
    m = re.search(r"\n  _log\(\.\.\.args\) \{", text)
    if not m:
        raise SystemExit("cannot find insertion point for launchOnce")
    text = text[: m.start()] + "\n" + block + text[m.start() :]
    ef00.write_text(text, encoding="utf-8")
    print("injected launchOnce into TuyaEF00Manager")
    return True


def patch_ensure_tx_uses_launch_once(ef00: Path) -> None:
    text = ef00.read_text(encoding="utf-8")
    if "Prefer device-wide launchOnce" in text:
        return
    # Soft-patch ensureInitialized-like block if present without launchOnce
    old = "await this.initialize(zcl);"
    if "launchOnce" not in text and old in text:
        # only replace first occurrence in P2475-style block if any
        pass


def merge_registry() -> None:
    mreg = json.loads((M / "data/user-misattribution-registry.json").read_text(encoding="utf-8"))
    sreg_path = S / "data/user-misattribution-registry.json"
    sreg = json.loads(sreg_path.read_text(encoding="utf-8"))
    want_ids = {"p2485-rkbxtclc-3gang", "p2485-hewlydpz-7ytnacie-4gang"}
    m_cases = {c["id"]: c for c in mreg.get("cases", []) if c.get("id") in want_ids}
    s_ids = {c.get("id") for c in sreg.get("cases", [])}
    added = 0
    for cid, case in m_cases.items():
        if cid in s_ids:
            # refresh
            for i, c in enumerate(sreg["cases"]):
                if c.get("id") == cid:
                    sreg["cases"][i] = case
                    break
        else:
            sreg["cases"].insert(0, case)
            added += 1
    sreg_path.write_text(json.dumps(sreg, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"registry: added={added} refreshed={len(m_cases)}")


def bump_version(ver: str) -> None:
    for rel in ["package.json", ".homeycompose/app.json"]:
        p = S / rel
        j = json.loads(p.read_text(encoding="utf-8"))
        j["version"] = ver
        p.write_text(json.dumps(j, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    # app.json compact one-liner version replace
    app = S / "app.json"
    raw = app.read_text(encoding="utf-8")
    raw2 = re.sub(r'"version"\s*:\s*"5\.12\.\d+"', f'"version":"{ver}"', raw, count=1)
    if raw2 == raw:
        raise SystemExit("app.json version not replaced")
    app.write_text(raw2, encoding="utf-8")
    cl = json.loads((S / ".homeychangelog.json").read_text(encoding="utf-8"))
    cl[ver] = {
        "en": "P2505 BOTH: EF00 4/3-gang couples (hewlydpz/7ytnacie/rkbxtclc) rehomed + launchOnce peer-skip."
    }
    (S / ".homeychangelog.json").write_text(json.dumps(cl, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print("bumped", ver)


def main() -> None:
    # 1) profiles
    shutil.copy2(M / "lib/tuya/Ef00MultiGangProfiles.js", S / "lib/tuya/Ef00MultiGangProfiles.js")
    print("copied Ef00MultiGangProfiles.js")

    # 2) device.js 4-gang from master (full P2485)
    shutil.copy2(
        M / "drivers/wall_switch_4_gang_tuya/device.js",
        S / "drivers/wall_switch_4_gang_tuya/device.js",
    )
    print("copied wall_switch_4_gang_tuya/device.js")

    # 3) strip wrong drivers
    for drv, needles in STRIP_FROM.items():
        p = S / "drivers" / drv / "driver.compose.json"
        if p.exists():
            n = strip_mfrs(p, needles)
            print(f"strip {drv}: {n}")

    # 4) ensure correct drivers
    print("add 4gang", ensure_mfrs(S / "drivers/wall_switch_4_gang_tuya/driver.compose.json", FOUR_GANG))
    print("add 3gang", ensure_mfrs(S / "drivers/switch_3gang/driver.compose.json", THREE_GANG))

    # 5) switch_3gang P2485 profile block if missing
    s3 = S / "drivers/switch_3gang/device.js"
    t = s3.read_text(encoding="utf-8")
    if "P2485" not in t:
        # insert near start of onNodeInit after printNode if possible
        needle = "async onNodeInit({ zclNode }) {"
        idx = t.find(needle)
        if idx < 0:
            raise SystemExit("switch_3gang onNodeInit not found")
        # find first newline after {
        brace = t.find("{", idx) + 1
        insert = '''
    // P2485: Z2M colored 3-gang rkbxtclc — log profile + force mains (no phantom battery)
    try {
      const { resolveEf00MultiGangProfile } = require('../../lib/tuya/Ef00MultiGangProfiles');
      const mfr = this.getSetting?.('zb_manufacturer_name') || this.getStoreValue?.('manufacturerName') || '';
      this._ef00Profile = resolveEf00MultiGangProfile(mfr, { gangs: 3 });
      this.log(`[P2485] switch_3gang profile=${this._ef00Profile.id} mfr=${mfr}`);
      if (/rkbxtclc/i.test(mfr)) {
        if (this.hasCapability('measure_battery')) {
          await this.removeCapability('measure_battery').catch(() => {});
        }
        if (typeof this.setEnergy === 'function') {
          await this.setEnergy({ batteries: null, mains: true }).catch(() => {});
        }
      }
    } catch (e) {
      this.log('[P2485] profile resolve soft-fail:', e.message);
    }
'''
        t = t[:brace] + insert + t[brace:]
        s3.write_text(t, encoding="utf-8")
        print("patched switch_3gang device.js")
    else:
        print("switch_3gang already has P2485")

    # 6) launchOnce
    inject_launch_once(S / "lib/tuya/TuyaEF00Manager.js")

    # 7) registry
    merge_registry()

    # 8) version
    bump_version("5.12.182")

    # 9) critical test
    test = S / "test/critical/p2505-p2485-ef00-multigang-rehome.test.js"
    test.write_text(
        ''''use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

function compose(id) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', id, 'driver.compose.json'), 'utf8'));
}
function hasMfr(driverId, needle) {
  const list = compose(driverId).zigbee?.manufacturerName || [];
  return list.some((m) => String(m).toLowerCase().includes(needle));
}

describe('P2505 / P2485 EF00 multi-gang rehome (stable BOTH)', () => {
  it('hewlydpz + 7ytnacie on wall_switch_4_gang_tuya only', () => {
    assert.ok(hasMfr('wall_switch_4_gang_tuya', 'hewlydpz'));
    assert.ok(hasMfr('wall_switch_4_gang_tuya', '7ytnacie'));
    assert.ok(!hasMfr('curtain_motor', 'hewlydpz'));
    assert.ok(!hasMfr('dimmer_wall_1gang', '7ytnacie'));
  });
  it('rkbxtclc on switch_3gang not dimmer', () => {
    assert.ok(hasMfr('switch_3gang', 'rkbxtclc'));
    assert.ok(!hasMfr('dimmer_wall_1gang', 'rkbxtclc'));
  });
  it('Ef00MultiGangProfiles + launchOnce present', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'lib/tuya/Ef00MultiGangProfiles.js')));
    const ef00 = fs.readFileSync(path.join(ROOT, 'lib/tuya/TuyaEF00Manager.js'), 'utf8');
    assert.ok(ef00.includes('static async launchOnce'));
    assert.ok(ef00.includes('P2486b') || ef00.includes('collectManagers'));
  });
});
''',
        encoding="utf-8",
    )
    print("wrote test", test)


if __name__ == "__main__":
    main()
