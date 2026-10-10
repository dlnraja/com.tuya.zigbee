# Homey firmware & Zigbee stack: research notes (2026-10-10)

Public, unmodified sources only. No firmware image was downloaded, unpacked or decompiled.
Athom does not publish Homey Pro firmware images for download; updates go through the app (Settings → Updates).

See REA_TOOL.md for the rea evaluation.

## 2. Node.js per firmware (official)
Source: https://apps.developer.homey.app/the-basics/app#node.js
- Since Homey v12.9.0, all platforms (Pro 2016–19, Early 2023, mini, Cloud) run apps on Node 22. Before that: Early 2023 and mini used Node 18; 2016–19 used Node 16 (or Node 12 before v7.4.0).
- Cloud: an app moves to Node 22 only when a new version is published after 2025-12-02.
- Consequence: the app runtime is Node 22. CI can use Node 24 for the `homey` CLI (≥4.5.0), but the code itself must stay compatible with Node 22, so no Node 24-only APIs.

## 3. Zigbee stack (EmberZNet NCP)
- Homey OS v13.5.0 (Sept 2026) silently raised the Zigbee NCP firmware from 7.4.2-0 to 9.1.0-0 on Pro 2026, and Pro 2023 got the same version. This was reported by users; Athom's changelog only says "updates various components". https://community.homey.app/t/zigbee-firmware-update-in-homey-os-v13-5-0-what-s-new-or-improved/159290
- Silicon Labs release notes: https://docs.silabs.com/sisdk-release-notes/2026.6.0/sisdk-zigbee-release-notes/ . What changes between 7.4 and 9.1: APS ACK / retry reliability, join fixes on large networks, Trust Center rejoin and recovery, R23/BDB 3.1 groundwork (dynamic link keys, APS frame-counter sync), route-table handling, Green Power fixes. Athom has not confirmed which of these it enabled. 9.1.1 adds fixes for sleepy end devices and APS retry timing, but Homey is not on it yet.
- Reported field regression: after the 13.5.0 update, one user's routers all went offline and Athom's answer was "re-pair each node". Bindings and reporting configuration can be lost after an NCP upgrade.
- Zigbee OTA for devices is supported since Homey v13.2.0 (mobile app ≥9.10.0), declared in the driver manifest with `updates[]`: device mfr/pid, then files with manufacturerCode, imageType, fileVersion and integrity. https://apps.developer.homey.app/wireless/zigbee/zigbee-firmware-updates
- v12.3.0 added `ZigBeeNode.ieeeAddress`.

## 4. Open-source libraries (npm, as of 2026-10-10)
- zigbee-clusters 3.8.0 (2026-09-18) · homey-zigbeedriver 2.2.18 (2026-09-09) · homey CLI 4.6.0 (2026-10-09) · homey-apps-sdk-v3-types 0.3.12 (2026-09-28).
- Repos: github.com/athombv/node-zigbee-clusters, athombv/homey-zigbeedriver, athombv/node-homey-lib (the validator), athombv/homey-apps-sdk-v3-types.

## 5. Memory and app lifecycle
- Homey sends `memwarn` events (count / max) and kills the app if usage does not drop (documented in the SDK; the Python SDK shows `on_memwarn(count, max)`). The exact per-app MB limit is not published, so it is not stated here. Peter's OOM fits this pattern.
- Bug unrelated to the app, for triage: in the 13.4.1 ENETUNREACH case the cause was a DHCP race with a router, not Homey.

## 6. Build processing (Athom)
- Not documented publicly. What we observed: a version already uploaded fails processing ("AggregateError"), and the validator is node-homey-lib (2.52.3). Validating with `homey app validate -l verified` under the CLI's Node version is the closest public proxy.

## 7. Additive proposals for the app
1. Handle `memwarn`: drop caches (DP maps, logs), log the count to diagnostics, and run a heap-budget test in CI.
2. Rebinding after an NCP update: at init, compare the stored "last bound" stamp with the time since the last reporting. If a device has been silent longer than N times its report interval, re-run bind and configureReporting once, with backoff. Add a "Re-bind / reconfigure reporting" maintenance action.
3. Rely on end-to-end APS ACK: keep a single retry, with jitter, for writes; do not stack app retries on top of the stack's retries (avoids bursts that freeze Tuya MCUs, e.g. Gledopto).
4. Sleepy end devices: queue writes until the next check-in instead of failing; mark as unavailable only after 2–3 reporting intervals (generalises the #550 fix).
5. Store `ieeeAddress` (≥12.3.0) in diagnostics, guarded for older firmware.
6. Use Node 22 as the runtime target: add a CI job that runs the tests on Node 22 as well as Node 24 for the CLI. Set `compatibility` to `>=12.9.0` only if Node 22 APIs are really used.
7. Optional OTA manifest entries, only for vendor-published images whose licence allows redistribution (do not host Tuya images).
8. A weekly workflow watches the npm versions in §4 and the Silabs release notes, and opens an issue when something changes.

## Credits
- Athom B.V.: SDK docs (apps.developer.homey.app), npm packages.
- Community forum: Sharkys (EmberZNet 7.4.2→9.1.0 analysis), RuuduitdeG (Pro 2023 confirmation), Arve_Bjornerud (regression report), Mike_Nono (Silabs link), SunBeech (thread author).
- Silicon Labs: Zigbee SDK release notes.
- GitHub issue athombv/homey-apps-sdk-issues#405 (Node.js versions).
