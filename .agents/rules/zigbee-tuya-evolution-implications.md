# P2537 — Zigbee/Tuya evolution implications (ALWAYS)

When touching Zigbee RF, MCU time, fingerprints, or compose clusters:

1. **RF coexistence** — Wi-Fi **1 / 6 / 11** ↔ Zigbee/Thread **15 / 20 / 25** @ **20 MHz** (`lib/utils/rf-channel-coexistence.js`).
2. **No invent** — never invent **Suzi** / **Green Power** manufacturerName or productId.
3. **MCU time** — always `TuyaTimeSyncFormats.guessFormat` + `getFallbackChain`; never hardcode a single format.
4. **Awareness ≠ compose** — Zigbee 4.0 / Suzi docs OK; **no** new compose clusters/tags (`suzi`, `sub_ghz`, …) without real interview + sacred couple.

Gate: `npm run check:p2537` · SSOT: `config/architecture/zigbee-tuya-evolution-ssot.json` · helper `assertHomeyImplications()`.
