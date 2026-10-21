# `drivers/`: one folder per device family

Each folder is one Homey driver:

| File | Role |
|---|---|
| `driver.compose.json` | **Source of truth**: name, class, capabilities, and the Zigbee couples (`manufacturerName` + `productId`) that select this driver at pairing time |
| `device.js` | Runtime behaviour (data points, ZCL clusters, buttons, battery) built on the shared code in [`lib/`](../lib/README.md) |
| `driver.js` | Pairing and driver-level Flow cards |
| `driver.flow.compose.json` | Flow cards of this driver |
| `assets/` | Icons and images (and firmware for drivers with native OTA) |

`app.json` is generated from these files; the [supported devices page](https://dlnraja.github.io/com.tuya.zigbee/docs/devices.html)
and the root README are generated from `app.json`.

Rules when adding a device:
- a couple goes into the **one** driver that matches what the device really is; never invent a model id;
- note the public source of the couple (Zigbee2MQTT, ZHA, deCONZ, Blakadder, interview…) in the commit and credit people in [`CREDITS.md`](../CREDITS.md);
- add or extend a unit test.

Requests and bugs: [GitHub issues](https://github.com/dlnraja/com.tuya.zigbee/issues) ·
guide: [request a device](https://dlnraja.github.io/com.tuya.zigbee/docs/request-device.html) ·
[contributing](https://dlnraja.github.io/com.tuya.zigbee/docs/contributing.html).
