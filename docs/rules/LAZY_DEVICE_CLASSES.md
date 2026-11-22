# Lazy device classes (P3389)

WHY: Homey loads `driver.js` and `device.js` of every driver at app start. With ~450 drivers and a
few paired devices, the device class bodies and the libs they pull in were most of the boot heap
(Bastien OOM SIGABRT at a ~66 MB cap, p3272).

HOW: each `drivers/<id>/device.js` keeps its full source and exports, wrapped in
`lazyDeviceClass(module, () => { ... return module.exports; })` (lib/utils/LazyDeviceClass.js).
The module exports a transparent stand-in: `new`, `extends`, `instanceof`, static members and
helper exports (`module.exports.x = ...`) all forward to the real class, which is built on first use.
A bare re-export (`module.exports = require('../other/device')`) stays as is.

Rules:
- New drivers: run `node scripts/maintenance/p3389-lazy-device-entries.js` (test p3389 fails otherwise).
- Never touch the stand-in while its own body is still loading (circular require): it throws loudly.
- `TUYA_EAGER_DEVICE_CLASSES=1` restores eager loading (diagnostics only).

Measured with test/_support/homey-stub (all driver.js + device.js required, 3 house classes used):
master 19.3 -> 14.4 MB heap, stable 21.0 -> 15.0 MB, bastien source tree 21.5 -> 15.4 MB;
Bastien shipped 27-driver payload 8.5 -> 6.5 MB.
