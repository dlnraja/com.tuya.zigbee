# Homey / VM reachability (P2658 session 2026-09-21)

## Bastien Homey Pro
- SSOT: `192.168.1.15` / `homey-65d495eb252c3ef65c879247.local`
- Probe: **unreachable** from this PC (HTTP timeout) — not on LAN or powered off / different network
- Action: silent code fixes only; no live install this session

## Homey self-hosted / VM
- VMware Player present; VMs: `Ubuntu 64-bit`, `up`
- `vmrun start … Ubuntu 64-bit.vmx` → **file already in use** (lock) but `vmrun list` = 0 running
- No Homey Pro image in VMs (Homey is hardware; cannot replace Bastien box with a VM Athom runtime)
- Do **not** invent a fake Homey — wait for LAN access to Bastien or Dylan’s Pro

## Diags treated
- Unknown fatal: `TypeError: device.setName is not a function` (TitleSanitizer) → **fixed P2658**
- Gmail cascade: L3 local state only (IMAP/OAuth secrets missing locally)
- Known crash patterns remain classified fixed_* in gate
