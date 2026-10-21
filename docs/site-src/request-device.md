# Request a device

GitHub issues are the way to report a new device or a problem:
[open an issue](https://github.com/dlnraja/com.tuya.zigbee/issues/new/choose).
The forum topic is fine for discussion, but an issue is tracked and closed when the fix ships.

Before asking, search the [supported devices list](devices.html): your device may already be
supported under another brand name.

## What to send

A Tuya device is identified by a **couple**: the manufacturer name *and* the model (product id).
We never guess one from the other, so please send both.

| Item | Where to find it | Example |
|---|---|---|
| Manufacturer name (`mfr`) | Homey Developer Tools → Zigbee → your device, field `manufacturerName` (or device settings `zb_manufacturer_name`) | `_TZE200_xxxxxxxx` |
| Model / product id (`pid`) | same page, field `modelId` (or `zb_product_id`) | `TS0601` |
| Zigbee interview | Developer Tools → Zigbee → the device → *Interview* (copy the whole JSON) | endpoints and clusters |
| App diagnostic | Homey app → Apps → this app → *Send diagnostic report*, then paste the code in the issue | a code, no personal data |
| What it is | brand, shop listing title, a photo of the label | "soil moisture sensor" |
| What goes wrong | pairs as unknown, wrong class, a value is missing or wrong, a button does nothing | |

Tips:
- Battery devices sleep. Press the button right before (and during) the interview so it answers.
- If the interview keeps timing out, the manufacturer name and model from the Zigbee overview are
  already enough to start.
- For Wi-Fi devices, send the product id / category and, if you have them, the data point (DP) list
  from a local tool. **Never** paste a local key or a cloud token in an issue.
- Remove personal data from screenshots (names, addresses, IP addresses, tokens).

## What happens next

1. The couple is cross-checked against public references (Zigbee2MQTT, ZHA, deCONZ, Blakadder,
   tuya-local and others, see [sources](sources.html)).
2. A couple confirmed by a reliable source goes into the matching driver, with the source noted.
3. A couple we cannot confirm yet goes into the *provisional tier* (see [architecture](architecture.html#provisional-tier))
   until a second source or your interview confirms it.
4. The change ships to the **Test** channel first; please test it there and report back in the issue.

See also the [FAQ](faq.html) and the [contributing guide](contributing.html).
