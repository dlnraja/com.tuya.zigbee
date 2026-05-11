# The "56 Years Ago" Bug and Tuya Sleepy Devices

## Core Problem ("56 Years Ago")
Users frequently report symptoms on the forum like:
- "The value stays at 56 Years ago"
- "The device pairs but no events are ever received"
- "Motion/Contact sensor not updating its state"

This happens primarily on "Sleepy" battery-powered devices belonging to the Tuya `TS02xx` family (like `TS0203` contact sensors, `TS0202` motion sensors, or specific variants like `_TZE200_pay2byax`) and the `TS004x` button family.

## Architectural Root Cause
Tuya battery devices are extremely aggressive with their deep sleep to save battery. During Zigbee pairing (ActiveEndpointResponses step), these sleepy sensors often **hide or fail to announce their Tuya proprietary cluster (0xEF00)** to the network.

Previously in the Homey app:
1. `TuyaEF00Manager.js` proactively searched for the `0xEF00` cluster upon pairing to register data parsers.
2. Because the sensor was asleep, the cluster was missing from the endpoint object.
3. The Manager aborted initialization, assuming this wasn't a Tuya DP device.
4. Without the parser, Homey ignored any incoming Datapoint (DP) payloads. The user's device capability thus remained at Epoch 0 (January 1, 1970), leading to the "56 Years Ago" display in the Homey UI.

## The Solution (Inspired by Zigbee2MQTT)
Zigbee2MQTT uses a robust workaround to circumvent this polling timeout: they register a **Passive Data Listener** unconditionally for known Tuya models. They don't ask the device for its capabilities; they just listen natively to raw Datagrams (Raw ZCL).

Our Homey app now does the same:
- We expanded the `_setupPassiveMode` inside `TuyaEF00Manager.js`.
- It now triggers automatically and unconditionally for any `TS0601`, `TS02xx`, `TS004x`, or `TS130x` device (or devices starting with `_TZE`).
- By listening natively to `endpoint.on('zcl')`, the app gracefully bypasses Homey's cluster mapping validation.
- When the device wakes up (e.g., someone opens the door), the Tuya DP payload is caught instantly and routed by `PASSIVE_DP_MAPPINGS`.

## How the AI Should Reply on the Forum
If a user mentions "56 years ago", "not updating", or "not receiving events" for a battery-powered Tuya sensor:
1. Acknowledge their issue and explain the root cause in simple terms ("Battery devices tend to hide their Tuya configuration when they sleep during pairing, which confuses Homey").
2. Announce the fix: "We just implemented a massive engine fallback in version `v5.11.170+` (inspired by Zigbee2MQTT). The app now uses an advanced `Passive DP Listener` that blindly catches data from these sleepy sensors even if Homey failed to 'see' the module during pairing!"
3. Instruct them to install the latest TEST version from the Homey App Store: `https://homey.app/a/com.dlnraja.tuya.zigbee/test/`.
4. Suggest a best practice: "If you still have trouble, press the pairing/wake button on the sensor once every 2 seconds during the entire Homey pairing process. This keeps the sensor awake long enough to configure itself perfectly."
