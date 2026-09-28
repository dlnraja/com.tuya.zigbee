# Antigravity Usage Monitor — analysis (2026-09-28)

**Repo:** [tuckiestudio/antigravity-usage-monitor](https://github.com/tuckiestudio/antigravity-usage-monitor)  
**Local clone:** `C:\Users\Dell\Documents\homey\antigravity-usage-monitor`  
**License:** MIT · **Version:** 1.0.0

## What it is

A **VS Code extension** for the **Google Antigravity IDE**. It shows AI model quota / usage / reset timers in the status bar and a webview dashboard (Gemini, Claude, GPT-OSS, shared prompt credits).

- Reads **local** Antigravity Language Server state (`localhost` only)
- **No** Homey / Zigbee / Tuya / Athom runtime
- Polling interval default 30s (IDE UI only)

## Verdict for Universal Tuya / Bastien / Stable

| Option | Decision |
|--------|----------|
| Integrate into Homey app bundle | **NO** |
| Wire into GHA Homey publish | **NO** |
| Use as IDE usage report for Dylan | **YES (optional)** |

**Pourquoi:** Homey Pro apps must stay local-first Zigbee/WiFi device control. An Antigravity IDE quota monitor does not belong in `com.dlnraja.tuya.zigbee*` and would burn BootBudget / confuse Athom validation.

**Pour qui:** Cursor / Antigravity IDE operators only.

**Contre quoi:** Shipping IDE telemetry into Homey mesh runtime.

## If you want usage visibility

1. Install the VSIX / marketplace extension beside Antigravity IDE.
2. Or keep the clone as a **report-only** reference — do not merge into this Homey monorepo drivers/lib.

## Related project AI forfait (already in-repo)

Homey CI already enforces `AI_FORCE_LOCAL` / P2491 / forfait caps — that is the correct Homey-side control plane. Do not duplicate Antigravity quota UI inside Homey.
