# CRITICAL MISTAKES - Never Repeat (v5.9.23)

## A. CODE BUGS ENCOUNTERED

A1. Settings keys: zb_model_id NOT zb_modelId, zb_manufacturer_name NOT zb_manufacturerName
A2. Flow triggers: NO titleFormatted with [[device]] - use title field
A3. Press type 0-indexed: 0=single 1=double 2=hold (1-indexed broke TS0044)
A4. Battery check order: test <=100 FIRST then <=200 (wrong order = unreachable branch)
A5. Double-inversion: IAS+alarm_contact both invert = back to original. Invert ONCE only
A6. Imports: require('../../lib/tuya/TuyaZigbeeDevice') NOT require('../../lib/TuyaZigbeeDevice')
A7. Mixin order: PhysicalButtonMixin(VirtualButtonMixin(HybridSwitchBase))

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
