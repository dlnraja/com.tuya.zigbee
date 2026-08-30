# P2322 — PresentSky #2206 + Gabriel #2186/#2188 deep fix (2026-08-30)

Silent enrichment only (T157628). Inspired by HomeSuite / Z2M — no GPL copy.

## PresentSky #2206 (`_TZE284_m1cvyneb`+`TS0601`)

**Symptom (recurring):** paired as wall dimmer after update, but on/off/dim do nothing. Diag `60959c24`. Interview: EP1 clusters `0,4,5,61184,60672` (EF00-only, no genOnOff).

**Root causes found (not “already covered”):**
1. Flow `driver.js` used `setCapabilityValue` → Homey UI/flow updated **without mesh TX**; brightness card targeted wrong capability `brightness` instead of `dim`.
2. Soft-fail `writeBool`/`writeData32` returned `false` while listeners swallowed errors → Homey thought TX succeeded.
3. MCU needs Z2M-style `configureMagicPacket` after re-pair; handshake was not forced on wall_dimmer init.
4. Hollow `zclNode` IEEE after re-pair — heal missed `device.node.ieeeAddress`.

**Fixes (BOTH reliability):**
- `drivers/wall_dimmer_tuya/driver.js` — TX via `_txCapability` / `dim`
- `drivers/wall_dimmer_tuya/device.js` — persist IEEE, force magic, 3×350ms retry, throw on fail
- `lib/io/healZigbeeNodeIdentity.js` — also read `device.node`

## Gabriel #2186/#2188 (`_TZ3000_lwthnp7j`)

**HomeSuite interview:** `TS0004` + EP1–4 `genOnOff` (cluster 6) — ZCL touch 4-gang, not EF00.

**Already locked** to `wall_switch_4gang_1way`. Complements:
- Registry notes + `forbidMode: couple` + HomeSuite interview source
- `wall_switch_4gang_1way` forces `zcl_only` + re-push settings on pair (HomeSuite power-restore idea)

## User action (no forum reply)

Update Universal Tuya Test → for PresentSky: **remove + re-pair** wall dimmer once more after tip ships. For Gabriel 4-gang: update Test; re-pair only if still on wrong driver.
