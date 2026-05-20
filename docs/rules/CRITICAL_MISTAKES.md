# CRITICAL MISTAKES - Never Repeat (v7.5.31)

## A. CODE BUGS ENCOUNTERED

A1. Settings keys: zb_model_id NOT zb_modelId, zb_manufacturer_name NOT zb_manufacturerName
A2. Flow triggers: NO titleFormatted with [[device]] - use title field
A3. Press type 0-indexed: 0=single 1=double 2=hold (1-indexed broke TS0044)
A4. Battery check order: test <=100 FIRST then <=200 (wrong order = unreachable branch)
A5. Double-inversion: IAS+alarm_contact both invert = back to original. Invert ONCE only
A6. Imports: require('../../lib/tuya/TuyaZigbeeDevice') NOT require('../../lib/TuyaZigbeeDevice')
A7. Mixin order: PhysicalButtonMixin(VirtualButtonMixin(UnifiedSwitchBase))

## B. BSEED ZCL-ONLY RULES

B1. Group toggle bug: firmware broadcasts ZCL to ALL EPs (Z2M #27167, ZHA #2443)
B2. Fix pattern: _removeGroupMemberships() + _lastCommandedGang + broadcast filter 2s window
B3. Applied to: switch_2gang, switch_3gang, switch_4gang
B4. ZCL-only fingerprints: _TZ3000_l9brjwau, _TZ3000_blhvsaqf, _TZ3000_ysdv91bk, _TZ3000_hafsqare, _TZ3000_e98krvvk, _TZ3000_iedbgyxt
B5. requiresExplicitBinding=true for BSEED (no attr reports without binding)
B6. Register capability listeners BEFORE attr listeners (packetninja fix)

## C. BATTERY DEVICES

C1. Store-based restore: persist on every update, restore on init if null
C2. Unified DP list: [4,10,14,15,21,100,101,102,104,105]
C3. Sleepy devices: first report up to 24h. NOT a bug.
C4. batteryPercentageRemaining===0 is VALID (dead battery). Do not reject.
C5. Voltage curves: CR2032/2xAA/Li-ion/AA per Z2M profiles (not linear)

## D. PHYSICAL BUTTON DETECTION

D1. 2000ms timeout for app command pending window
D2. Track _lastOnoffState, _appCommandPending, _appCommandTimeout
D3. isPhysical = reportingEvent AND NOT _appCommandPending
D4. perEndpointControl: markAppCommandAll() for multi-gang firmware broadcast
D5. Deduplication: skip if same capability+value within 500ms

## E. IAS ZONE

E1. Sleepy battery: opportunistic enrollment on wake
E2. noIasMotion override: check _hasTuyaDPCluster before skipping IAS
E3. ZCL-only devices: force noTemp=noHum=true when no 0xEF00
E4. Numeric cluster lookup: 0x0500 = 1280 (use both string and number keys)

## F. FINGERPRINTS

F1. Fingerprint = manufacturerName + productId COMBINED (both must match)
F2. Same mfr in multiple drivers is NORMAL (different productIds)
F3. TRUE collision = same mfr + same productId in incompatible drivers
F4. TS0601 collisions are inherent to Tuya architecture (2094 remaining)
F5. Case-insensitive: include both _TZE200_ and _tze200_ variants
F6. No wildcards in SDK3: _TZE284_* is INVALID

## G. MULTI-GANG SWITCHES

G1. Capability names: onoff (gang1), onoff.gang2, onoff.gang3, onoff.gang4
G2. Endpoint mapping: EP1=gang1, EP2=gang2, etc.
G3. Flow IDs: {driver}_physical_gang{N}_{on|off}
G4. Broadcast filter: track _lastCommandedGang, filter non-commanded within 2s
G5. Tuya DP: DP1-8 = gang states, DP14=power-on, DP15=backlight, DP101=child_lock

## H. BUTTON DRIVERS

H1. OnOffBoundCluster must be bound per EP for multi-press detection
H2. cmd 0xFD on genOnOff carries press type (silently dropped without binding)
H3. E000 BoundCluster for Tuya-specific button events
H4. First press after sleep may be lost (Zigbee limitation for sleepy devices)

## I. VALIDATION AND RELEASE

I1. Always: npx homey app validate --level publish
I2. Always: node -c on modified .js files
I3. Update .homeycompose/app.json version
I4. Update .homeychangelog.json (add at TOP)
I5. NEVER npx homey app publish locally - use GitHub Actions
I6. zb_ prefix warning in settings is cosmetic (app still validates)
I7. Post-Promotion Documentation & Registry Sync: On every app promotion (draft-to-test / production / branch synchronization), it is mandatory to recursively audit, normalize, and update all markdown documentation files (.md), technical registries/reference databases (like app.json, package.json, fingerprint matrices, and cross-references), dotfiles (.eslintignore, .homeyignore, etc.), rules configuration files (such as .clinerule, .cursorrules, etc.), architectural maps, and cartography/index files (like PROJECT_INDEX.md, FINGERPRINT-CROSSREF.md) to maintain perfect structural alignment with active codebase updates and prevent documentation rot.
I8. Comment robustness in CI/CD pipeline checks: When grep'ing for banned words, comment lines (// or *) must be ignored (using grep -v '^[[:space:]]*//' | grep -v '^[[:space:]]*\*') to prevent false-positive failures during code-quality validations.
I9. Draft script isolation in STRICT_SYNTAX_GUARD: The temporary draft or development scripts directory (temp) must be explicitly ignored by the syntax checker so only active production, lib, drivers, and standard CI/CD files are validated, keeping the repository's build green.
I10. Hybrid-Compatible Base Class Exports: Base classes exported from lib/devices/ (like SensorBase / UnifiedSensorBase.js) must use direct exports together with self-referential class properties (SensorBase.SensorBase = SensorBase; module.exports = SensorBase;) to ensure absolute compatibility with both direct destructured requires (used by driver implementations) and index-based requires.
I11. Universal Evolution & Continuous Enrichment Loop (MANDATORY): On *every* single prompt execution or task processed, the developer agent MUST execute a comprehensive, full-scope repository sweep. This loop comprises: scanning and triaging latest community PRs/issues/images (`scan-prs-issues.js`), auto-learning newly found fingerprints (`auto-learn-fingerprints.js`), running self-heals and automated code-fixes (`auto-fix-common-issues.js`), verifying drivers, and collectively enriching ALL yml files, javascript source codes, base classes, rules configs (`.clinerule`, `.cursorrules`, `.windsurfrules`), automations, cartographies, indexes, and reference databases. No element of the ecosystem must be left stagnant.


## J. DIAGNOSTICS AND SUPPORT

J1. Diag reports expire - user must submit within 60s of button presses
J2. Always ask: update to latest + remove + re-pair + diag
J3. Piotr 2-gang _TZ3000_cauq1okq = DEVICE FIRMWARE (unfixable, Z2M #14750)
J4. Ricardo_Lenior: needs fingerprint, not just diag ID
J5. configureReporting needed for power/voltage/current (not just listeners)

## K. TUYA DP PROTOCOL

K1. Cluster 0xEF00 (61184)
K2. Types: 0=Raw 1=Bool 2=Value 3=String 4=Enum 5=Bitmap
K3. DP values may need division: temp/10, hum/10, battery/2
K4. Some manufacturers send raw C (no division needed) - check per fingerprint
K5. Multi-DP frames: single report contains multiple DPs, parse ALL of them

## L. PASSIVE / UNANNOUNCED MONITOR INFO BROADCASTS

L1. Unannounced Telemetry Handling: Sleepy or battery-powered devices often broadcast telemetry data on random intervals ("monitor info") prior to completing ZCL pairing/interview or without announcing themselves.
L2. No Initialization Blocks: Drivers must NEVER block or discard incoming cluster or raw frame reports due to strict "device initialized" status checks. Raw frames (cluster 0xEF00 or ZCL attributes) must be accepted, parsed, and mapped dynamically even if standard pairing interviews are in progress.
L3. Passive Mode Decoupling: Ensure that `TuyaEF00Manager` passive listening mode (`_setupPassiveMode` & raw frame listener on cluster 0xEF00/61184) remains intact and is never bypassable or disabled by unannounced data transmissions.
L4. Persistent Telemetry Logging: Gracefully log unannounced passive frames as `[TUYA] 📥 Passive frame received` to ensure visibility for diagnostics and debugging.

# CRITICAL MISTAKES - Never Repeat (v5.9.23)

## A. CODE BUGS ENCOUNTERED

A1. Settings keys: zb_model_id NOT zb_modelId, zb_manufacturer_name NOT zb_manufacturerName
A2. Flow triggers: NO titleFormatted with [[device]] - use title field
A3. Press type 0-indexed: 0=single 1=double 2=hold (1-indexed broke TS0044)
A4. Battery check order: test <=100 FIRST then <=200 (wrong order = unreachable branch)
A5. Double-inversion: IAS+alarm_contact both invert = back to original. Invert ONCE only
A6. Imports: require('../../lib/tuya/TuyaZigbeeDevice') NOT require('../../lib/TuyaZigbeeDevice')
A7. Mixin order: PhysicalButtonMixin(VirtualButtonMixin(HybridSwitchBase))
A8. NaN Sanitization: Validate numeric reports in SemanticConverter to prevent NaN crashes.

## B. BSEED ZCL-ONLY RULES

B1. Group toggle bug: firmware broadcasts ZCL to ALL EPs (Z2M #27167, ZHA #2443)
B2. Fix pattern: _removeGroupMemberships() + _lastCommandedGang + broadcast filter 2s window
B3. Applied to: switch_2gang, switch_3gang, switch_4gang
B4. ZCL-only fingerprints: _TZ3000_l9brjwau, _TZ3000_blhvsaqf, _TZ3000_ysdv91bk, _TZ3000_hafsqare, _TZ3000_e98krvvk, _TZ3000_iedbgyxt
B5. requiresExplicitBinding=true for BSEED (no attr reports without binding)
B6. Register capability listeners BEFORE attr listeners (packetninja fix)

## C. BATTERY DEVICES

C1. Store-based restore: persist on every update, restore on init if null
C2. Unified DP list: [4,10,14,15,21,100,101,102,104,105]
C3. Sleepy devices: first report up to 24h. NOT a bug.
C4. batteryPercentageRemaining===0 is VALID (dead battery). Do not reject.
C5. Voltage curves: CR2032/2xAA/Li-ion/AA per Z2M profiles (not linear)

## D. PHYSICAL BUTTON DETECTION

D1. 2000ms timeout for app command pending window
D2. Track _lastOnoffState, _appCommandPending, _appCommandTimeout
D3. isPhysical = reportingEvent AND NOT _appCommandPending
D4. perEndpointControl: markAppCommandAll() for multi-gang firmware broadcast
D5. Deduplication: skip if same capability+value within 500ms

## E. IAS ZONE

E1. Sleepy battery: opportunistic enrollment on wake
E2. noIasMotion override: check _hasTuyaDPCluster before skipping IAS
E3. ZCL-only devices: force noTemp=noHum=true when no 0xEF00
E4. Numeric cluster lookup: 0x0500 = 1280 (use both string and number keys)

## F. FINGERPRINTS

F1. Fingerprint = manufacturerName + productId COMBINED (both must match)
F2. Same mfr in multiple drivers is NORMAL (different productIds)
F3. TRUE collision = same mfr + same productId in incompatible drivers
F4. TS0601 collisions are inherent to Tuya architecture (2094 remaining)
F5. Case-Insensitive: normalize ALL lookups via UniversalTuyaParser (Rule 24)
F6. No wildcards in SDK3: _TZE284_* is INVALID
F7. Fingerprint collisions: TS0601 collisions are inherent; use mfr+pid combination.

## G. MULTI-GANG SWITCHES

G1. Capability names: onoff (gang1), onoff.gang2, onoff.gang3, onoff.gang4
G2. Endpoint mapping: EP1=gang1, EP2=gang2, etc.
G3. Flow IDs: {driver}_physical_gang{N}_{on|off}
G4. Broadcast filter: track _lastCommandedGang, filter non-commanded within 2s
G5. Tuya DP: DP1-8 = gang states, DP14=power-on, DP15=backlight, DP101=child_lock

## H. BUTTON DRIVERS

H1. OnOffBoundCluster must be bound per EP for multi-press detection
H2. cmd 0xFD on genOnOff carries press type (silently dropped without binding)
H3. E000 BoundCluster for Tuya-specific button events
H4. First press after sleep may be lost (Zigbee limitation for sleepy devices)

## I. VALIDATION AND RELEASE

I1. Always: npx homey app validate --level publish
I2. Always: node -c on modified .js files
I3. Update .homeycompose/app.json version
I4. Update .homeychangelog.json (add at TOP)
I5. NEVER npx homey app publish locally - use GitHub Actions
I6. zb_ prefix warning in settings is cosmetic (app still validates)

## J. DIAGNOSTICS AND SUPPORT

J1. Diag reports expire - user must submit within 60s of button presses
J2. Always ask: update to latest + remove + re-pair + diag
J3. Piotr 2-gang _TZ3000_cauq1okq = DEVICE FIRMWARE (unfixable, Z2M #14750)
J4. Ricardo_Lenior: needs fingerprint, not just diag ID
J5. configureReporting needed for power/voltage/current (not just listeners)

## K. TUYA DP PROTOCOL

K1. Cluster 0xEF00 (61184)
K2. Types: 0=Raw 1=Bool 2=Value 3=String 4=Enum 5=Bitmap
K3. DP values may need division: temp/10, hum/10, battery/2
K4. Some manufacturers send raw C (no division needed) - check per fingerprint
K5. Multi-DP frames: single report contains multiple DPs, parse ALL of them
K6. Time Sync (0x24): 10-byte payload `[seq:2][UTC:4][Local:4]`. Echo `seqNum` from request!
