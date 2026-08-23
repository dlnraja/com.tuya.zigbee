# Tuya DP interpretation guide (sacred couple doctrine)

> **Rule:** A DP number alone means nothing. Always lock `(manufacturerName, productId)` before interpreting RX or TX.

## Tuya frame recap

EF00 frame: `[status][seq][dpId][type][len_hi][len_lo][data…]`

| Type | Name | Size | Homey handling |
|------|------|------|----------------|
| **0** | **RAW / byte_array** | variable | **Custom parser required** — see below |
| 1 | BOOL | 1 byte | `true/false` |
| 2 | VALUE | 4 bytes uint32 BE | Use `smartDivisorDetect()` — never hardcode `/100` |
| 3 | STRING | variable | UTF-8 text |
| 4 | ENUM | 1 byte | Map per couple — allow unknown values (Tongou DP108 = 4 modes) |
| 5 | BITMAP | 1–4 bytes | Bit flags |

Parser: `lib/tuya/TuyaEF00Parser.js` — type 0 returns raw `Buffer`.

## DP6 — why it breaks if interpreted globally

DP6 is the classic collision:

| Couple | Driver | DP6 meaning | Type |
|--------|--------|-------------|------|
| `_TZE284_6ocnqlhn` + TS0601 | `din_rail_meter` | **Electricity composite RAW** (V/A/W burst) | 0 |
| `_TZE284_m1cvyneb` + TS0601 | `wall_dimmer_tuya` | Countdown timer | 2 |
| Fantem / Immax motion | `sensor_contact_motion` | Humidity `/10` | 2 |
| Generic DIN meter | `din_rail_meter` | Exported energy (bidirectional) | 2 |

**Failure mode (Gmail 3a1f196d):** device paired as `smart_rcbo` → DynamicCapabilityManager heuristics (`DP 6` in humid list) → phantom `measure_humidity`.

**Fix path:**
1. Lock couple to `din_rail_meter`
2. Map DP6 `{ capability: null, internal: 'tongou_electricity_raw' }`
3. Parse with `lib/tuya/DpByteArrayProfiles.js` in `_handleDP`
4. Set `blockDcm: true` in `data/dp_couple_knowledge.json`

## How to interpret byte_array (type 0)

### Step 1 — Lock the couple
- Interview / diag Log ID / forum post → extract `mfr` + `pid`
- Check `docs/knowledge/device-truth.json` + `data/dp_couple_knowledge.json`

### Step 2 — Capture hex samples (RX)
From Homey log: `[TUYA-P0] Frame hex: …` or `[TuyaEF00Parser] DP6 (type=0): …`

Run locally:
```bash
npm run diag:analyze -- path/to/diag-excerpt.txt
npm run audit:dp-couples -- --couple=_TZE284_6ocnqlhn,TS0601
```

### Step 3 — Cross-reference sources (priority)
1. **Z2M converter** — `data/dp_registry.json` → `byMfr["_TZE284_6ocnqlhn"]`
2. **Z2M issues** — e.g. #12466 (DP108 control_mode), #30925 (DP125 test5 = real power)
3. **Gmail diags** — Log ID + stdout DP lines
4. **Forum silent scan** — symptom + couple extraction
5. **TinyTuya / Tuya app** — enum labels for TX settings

### Step 4 — Propose layout (document before code)
For Tongou DP6 (heuristic, validate on hardware):

```
Offset  Encoding   Scale   Field
[0]      ignore     —       header
[1-2]    u16 BE     ÷10     voltage (V)
[3-4]    u16 BE     ÷1000   current (A)
[5-6]    u16 BE     ÷10     power (W)
```

Add entry to `data/dp_couple_knowledge.json` + `DpByteArrayProfiles.js`.

### Step 5 — Implement RX
```javascript
// drivers/din_rail_meter/device.js
const { parseTongouToqSysJztDp6 } = require('../../lib/tuya/DpByteArrayProfiles');

_handleDP(dpId, rawValue) {
  if (this._isTongouToqSysJzt() && dpId === 6) {
    const parsed = parseTongouToqSysJztDp6(rawValue);
    for (const [cap, val] of Object.entries(parsed.decoded || {})) {
      this.safeSetCapabilityValue(cap, val).catch(() => {});
    }
    return;
  }
  return super._handleDP(dpId, rawValue);
}
```

### Step 6 — TX (commands)
- Only SET DPs documented with `direction: rx_tx` in knowledge JSON
- Trip thresholds (Tongou DPs 102–119): enum/threshold — verify scale before `sendDP`
- Use `markAppCommand()` before TX to avoid flow loops

## Tools in this repo

| Command | Purpose |
|---------|---------|
| `npm run audit:dp-couples` | Cross-ref registry × driver × Z2M × knowledge |
| `npm run diag:analyze -- <file>` | Log ID, signals, couples from diag text |
| `node tools/ci/dp-diagnostic.js --list-known-dps` | Legacy global DP list (do not trust for couple lock) |
| `npm run knowledge:peculiarities` | Regenerate PECULIARITIES.md from registry |

## Files to update when locking a new DP

1. `data/dp_couple_knowledge.json` — canonical RX/TX semantics
2. `drivers/<id>/device.js` — `dpMappings` + optional `_handleDP`
3. `lib/tuya/DpByteArrayProfiles.js` — type 0 layouts
4. `data/user-misattribution-registry.json` — if wrong driver stole couple
5. `docs/knowledge/PECULIARITIES.md` — human summary
6. `test/critical/p*.test.js` — regression gate

## Anti-patterns (never)

- Map DP6 → humidity on energy meters
- Use DCM/IntelligentDeviceLearner on locked couples without `blockDcm`
- Invent pid from retail SKU (SGS02Z, TO-Q-SYS-JZT model name ≠ pid)
- SET enum without full value map (Tongou DP108 value 3 is valid)
