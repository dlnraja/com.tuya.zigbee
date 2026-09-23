# Couple profile — `_TZ3000_vsxvaj9i+TS0043` (P2629 / P2693 / P2695)

- **Driver:** `button_wireless_3`
- **Protocol:** ZCL OnOff **0xFD** + E000 (no EF00)
- **Source:** Bastien Homey interview 2026-09-20 (IEEE `a4:c1:38:f6:3d:2d:c9:79`)
- **Mesh 2026-09-23:** IEEE **OFF MESH** — must re-pair
- **Endpoints:** EP1 [0,1,6,57344]; EP2–4 [1,6]; sleepy; EP4 phantom
- **Battery:** EP1 only; ZCL 0–200; skipBatteryReporting
- **Flows:** Button 1–3 — **not** Developer Tools Zigbee canaux
- **P2693:** debounce 200ms; reject gang>3; `enableLevelControl:false`

## Cross-ref
- Z2M: `zigbeeModel: ["TS0043"]` actions `1_single`…`3_hold` (Lonsonho / LoraTap white-labels)
- ZHA: many TO quirks (signature often [0,1,6,57344] + EP2–4)
- ControllerX TS0043 light/cover maps
- Contre quoi: `npm run check:p2629` · `check:p2693`
