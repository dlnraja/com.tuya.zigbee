# Bastien diag cb3c0c87 — 2026-09-22 (P2676)

## Symptom
User: « Rien ne fonctionne » — plus aucune lumière / relais depuis les mises à jour.
App: **Zigbee Bastien v1.0.51** · Homey Pro Early 2023 · Log ID `cb3c0c87-45d4-4371-9ea8-8218037e3aaf`

## Root cause
```
Cannot find module 'homey-zigbeedriver'
at Object.<anonymous> (/app/lib/drivers/ZigBeeDriverFlowCardPatch.js:3:26)
← required from /app/app.js
```
Hard `require('homey-zigbeedriver')` at patch load → **app process exit 1** → tous les drivers morts.

## Fix (P2676)
1. Soft-require + early `return` in `ZigBeeDriverFlowCardPatch.js`
2. Soft-require wrapper in `app.js`
3. `prepare-publish` FATAL if `node_modules/homey-zigbeedriver` missing
4. Contre quoi: `test/critical/p2676-zigbeedriver-boot-harden.test.js`
5. Tip **Bastien ≥ 1.0.54**

## User action
Update **Zigbee Bastien** Test to **≥ 1.0.54**, restart app (or reboot Homey). Lights/relays should init again.

## Dual-app
Bastien house-only crash path; same soft-require mirrored on master Universal.
