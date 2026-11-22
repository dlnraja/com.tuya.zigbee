# Flow remap and homey:manager:api (P3374 / t1016u)

Date: 2026-11-22 (Europe/Paris).

## Decision (do not add the permission on master)

This app is a Zigbee/Wi-Fi device app (`category: appliances`). It must **not** request
`homey:manager:api` in `.homeycompose/app.json` / `app.json`.

Official Athom docs (https://apps.developer.homey.app/the-basics/app/permissions):

- The permission gives an app complete control over the Homey it is installed on
  (devices, Flows, etc.), including items that are not part of this app.
- It should only be requested when that access is the **main functionality** of the app.
- Apps that request it are reviewed more carefully. If the permission is not required
  for the app to function, the App Store submission will be rejected.
- Rule of thumb: only apps in the **Tools** section (HomeyScript, Device Groups, DIY
  alarm, ...). Examples that should **not** use it: apps that connect to a physical
  device (lights, thermostats, and this Tuya Zigbee app).
- The permission is not allowed on Homey Cloud.
- Adding a permission later means the app will not auto-update on already-installed
  Homeys until the user accepts it.

Store review can refuse this permission on our app. Document the risk here and in the
notebook before any future attempt. Prefer the fallback below until a human store-review
decision exists.

## Fallback implemented in this app

- Detect likely re-pair / driver-move pairs among **this app's** devices (same IEEE, or
  same exact mfr+pid on two devices).
- Settings page: preview (dry-run) of a device-id remap. Apply stays off unless the
  kill switch is lifted (`FLOW_REMAP_WRITES=1` **and** setting `flow_remap_writes_enabled`)
  **and** the user ticks the confirm box **and** sends `confirm=APPLY`.
- Bounded JSON backup in app settings before any write (`flow_remap_backups`, max 5).
- If ManagerFlow cannot list or update all Homey flows (the usual case without the Web
  API permission), the preview explains that and links to Flow Converter.
- Capability aliases live in `lib/flow-remap/capability-map.json` (SSOT, additive only).

## Credit

Flow Converter by late4marshmellow (`app.l4m.flowconverter`, category tools, and that
app **does** request `homey:manager:api`, which is appropriate for a Tools app).
Forum: https://community.homey.app/t/154906
Source: https://github.com/late4marshmellow/app.l4m.flowconverter
Also thanks Martijn Poppen's API Playground, as credited there.

Flow Converter is an **optional third-party app, never a dependency** of this app.
