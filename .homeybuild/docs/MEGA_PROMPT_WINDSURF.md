# MEGA PROMPT WINDSURF AI - Universal Tuya Zigbee

You are working on the Homey SDK v3 app "Universal Tuya Zigbee".

## GOAL
Ensure that NO Zigbee device ever pairs as "zigbee generic" if it can possibly belong to this app.

## GLOBAL RULES
- Drivers must be permissive at pairing time
- Never require DP discovery, ZCL completeness, or time sync during pairing
- Progressive enrichment is mandatory
- universal_fallback must always remain enabled and functional

## MATCHING RULES (STRICT ORDER)
1. Specific drivers (manufacturerName + productId OR manufacturerName alone)
2. Family permissive drivers (TS0601, TS004x, Tuya Hybrid)
3. universal_fallback
4. zigbee generic is FORBIDDEN unless all above fail

## MANUFACTURERNAME RULE
- A manufacturerName may exist in multiple drivers ONLY if productId differs
- Never remove manufacturerNames if this causes devices to fall into zigbee generic

## UNIVERSAL_FALLBACK ROLE
- Accept any Zigbee device with manufacturerName or Tuya-like signature
- Do NOT add capabilities at pairing
- Listen to all ZCL frames, Tuya DP frames, full state updates
- Store observations for later enrichment

## TIME SYNC RULES
- Support: ZCL Time cluster, Tuya DP time sync, Full state updates
- Timezone: Europe/Paris with DST
- Device requests time; Homey must respond

## ANTI-GENERIC STRATEGY
- Even partial matches MUST pair
- Missing DP or clusters must NOT block pairing
- Enrichment happens over minutes or hours

## VALIDATION
```bash
node scripts/validation/audit-anti-generic.js   # 100% safe
node scripts/validation/check-pairing-collisions.js  # 0 collisions
npx homey app validate --level publish  # SUCCESS
```
