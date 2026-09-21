# Homey / VM reachability (P2658 session 2026-09-21)

## Bastien Homey Pro
- SSOT: `192.168.1.15` / `homey-65d495eb252c3ef65c879247.local`
- Probe: **unreachable** (TCP/80 timeout; not in ARP — only `.1` `.10` `.12` `.22` on LAN)
- Other LAN hosts `.10` `.12` `.22`: no Homey HTTP on :80
- Action: silent code fixes only; no live install this session (house-only skip OK)

## Homey self-hosted / VM
- VMware Player: `C:\Program Files (x86)\VMware\VMware Player\`
- VMs present: `Ubuntu 64-bit`, `up`
- Stale `.lck` dirs cleared; **`Ubuntu 64-bit` started** (`vmrun list` = 1 running)
- No Homey Pro image in VMs (Homey is hardware; Ubuntu ≠ Athom Pro runtime)
- Do **not** invent a fake Homey — wait for LAN access to Bastien or Dylan’s Pro

## Publish tips (Athom apps-api)
- Universal `com.dlnraja.tuya.zigbee` Test tip: **9.0.1162** (Auto-Publish success after P2658 `9.0.1161` push)
- Stable `com.dlnraja.tuya.zigbee.stable` Test tip: **5.12.294** (Publish Stable workflows completed; tip not bumped this session — reliability setName backport is on `stable-v5` commit `fe2f9c501`)

## Diags treated
- Unknown fatal: `TypeError: device.setName is not a function` (TitleSanitizer / diag `1e071a86`) → **fixed P2658** (master + stable)
- Gmail crash gate: `setName_not_fn` classified; `verdict: ok` (unknown=0)
- Gmail Diagnostics + Fetch Homey Diagnostics: workflow_dispatch in flight this session
- Known crash patterns remain classified `fixed_*` in gate

## OSS credits / CI sources (shipped)
- CREDITS + `SourceCredits.js`: TinyTuya, TuyAPI+CLI, make-all/tuya-local, hass-localtuya, localtuya, tuya-mqtt, tuyadump, GoTuya, Z2M, tuya-local-key, sharing-sdk, com.tuyalocal
- Workflow: `.github/workflows/oss-lan-source-enrich.yml` + SSOT `oss-lan-source-workflows-ssot.json`
- Gates: `npm run check:p2656` / `p2657` / `p2658`
