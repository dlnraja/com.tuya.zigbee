# Using this app's devices in Apple Home, Google Home, Alexa, SmartThings and Home Assistant

Homey stays the controller. Other ecosystems see your Tuya devices through one of two routes:

| Ecosystem | Route | What it needs from a device |
|---|---|---|
| Apple Home (HomeKit) | **Matter Bridge app** (Homey's own HomeKit experience is being retired, see below) | a supported device class + standard capabilities |
| Google Home / Google Assistant | Homey's Google Assistant integration (account linking in Google Home), **or** the Matter Bridge | device class + standard capabilities |
| Amazon Alexa | Homey skill, **or** the Matter Bridge | sockets, switches, lights, fans, thermostats, locks, blinds/curtains, TVs, speakers, or any device with on/off |
| Samsung SmartThings | **Matter Bridge only** (Homey has no direct SmartThings export) | same as Matter Bridge |
| ChatGPT / AI assistants (Claude, ...) | Homey's ChatGPT app or the Homey MCP server (`https://mcp.athom.com`) | clear device class, standard capabilities and titles, well-labelled flow cards (en + fr) |
| Home Assistant | Matter Bridge (or the Homey integration on the HA side) | same as Matter Bridge |

## HomeKit is being retired on Homey

From Homey Pro / Self-Hosted Server **v13.5.1**, new users can no longer enable Homey's built-in
HomeKit experience, and Athom will remove it completely in **March 2027**. Athom recommends the
**Matter Bridge** app: install it, open More (⋯) → Settings → Matter Bridge, scan the QR code from
Apple Home (or Google Home, Alexa, SmartThings, Home Assistant) and pick the devices to share.

## What the Matter Bridge exposes (checked against its source, Sept 2026)

- **Lights** (`light`): on/off, brightness, colour (hue + saturation), colour temperature.
- **Sockets** (`socket`): on/off, power.
- **Thermostats / heaters / heat pumps / air conditioners**: target temperature, room temperature, mode, humidity.
- **Locks**: locked/unlocked.
- **Blinds, curtains, roller shutters** (`windowcoverings`, `blinds`, `shutterblinds`, `curtain`): position, or up/stop/down.
- **Sensors** (`sensor`): temperature, humidity, CO, CO2, PM2.5, PM10, light level, motion, occupancy, contact, smoke.
- **Anything else with on/off** shows up as a plug.

Not bridged today (a limitation of the bridge, not of this app): water leak, gas, vibration,
energy meters and DIN-rail meters (beyond power on sockets), garage doors, doorbells, scene
buttons and remotes, valves, battery level, and the extra channels of multi-gang switches
(only the main on/off is shared). These keep working in Homey and in Homey flows.

Tip: if a relay or plug drives a lamp, set **"What's plugged in?"** to Light in the device
settings in Homey; the bridge and the voice assistants then treat it as a light.

## ChatGPT and other AI assistants

Since June 2026 Homey can be connected to ChatGPT in one click (or any MCP-capable assistant via
`https://mcp.athom.com`): it can read and control devices, start Flows and help create them. The
assistant reads the device class, the capabilities and the Flow card catalogue, so clear names and
complete flow-card labels matter. Known pitfall: one malformed flow card from any app can make the
assistant unable to list Flow cards at all; this app is checked against that (see below).

## What we do in this app

- The bridge mapping we check against is in `data/matter-bridge-mapping.json` (from Athom's Matter Bridge source, credited).
- Every driver is audited (`npm run check:ecosystems`) for its device class and standard
  capabilities, per ecosystem. The report lists what each ecosystem can see and what is hidden.
- Where a driver only exposes a custom capability, a standard one is added next to it; when no
  standard capability fits, the closest one is mirrored (for example a mode as on/off or a
  generic alarm, a scene as a button) or the feature stays available through flows.
- Flow cards are checked for the shape AI assistants require (every dropdown option has a title,
  drop tokens are arrays); 38 dropdown options that only had a `label` got a `title` too.
- Nothing is removed or renamed: existing devices, flows and voice commands keep working.

Status: `data/leads/resume-checkpoint.json` (master_queue, "Matter Bridge / ecosystems") and
`docs/rules/ECOSYSTEM_AUDIT_2026-10-04.md`.
