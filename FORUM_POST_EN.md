Hey everyone — time for a proper update on where things stand.

**The landscape has shifted.** 

There are now effectively 3 apps for Tuya Zigbee on Homey:

1. **JohanBendz / com.johanbendz.tuya.zigbee** — The original. Johan stepped away from active development long ago. This app still works for many basic devices but receives no updates. New fingerprints, bug fixes, and modern devices are not being added there.

2. **dlnraja / com.dlnraja.tuya.zigbee (v8.x "master" branch)** — The bleeding edge. This is the unified engine with adaptive DP mapping, the Antigravity runtime (L0-L14 quality layers), self-healing fleet stability, adaptive lighting, cross-protocol fallback, the UnifiedBatteryHandler, and full PhysicalButtonMixin / VirtualButtonMixin support. It currently sits at **v8.1.0**. This is where all new development happens — at the cost of some complexity.

3. **dlnraja / com.dlnraja.tuya.zigbee.stable (v5.x "stable-v5" branch)** — The stable, proven track. A curated subset of ~50 essential drivers, static DP mappings, no adaptive magic. Think of it as "v8's foundations, frozen and polished." It compiles to a **separate App ID** in the Homey store, so both can sit side-by-side on the same Homey without conflict. Currently at **v5.11.212** (not yet pushed — next batch).

**Which one should you use?**

- **If you just want things to work** with your switches, sensors, thermostats, plugs, and lights → stick with the **stable-v5** app (`com.dlnraja.tuya.zigbee.stable`). It's simpler, battle-tested, and won't surprise you.

- **If you have exotic or newer devices**, want the latest fingerprint coverage, advanced features (virtual buttons, adaptive metering, cross-protocol self-healing), or are willing to help test → use the **master** app (`com.dlnraja.tuya.zigbee`).

**What about new development?**

To be transparent — I'm dialing back public development. The amount of Chinese OEM variants, incompatible DP schemas, and forum support requests has grown beyond what one person can sustainably handle. The codebase has 4200+ device fingerprints, 126K+ entries in the DB, 50+ drivers, and the architecture has evolved into something I'm genuinely proud of — but maintaining that and responding to everyone is a full-time job I don't have.

Going forward:
- **Critical bug fixes** will still be shipped on both tracks.
- **New fingerprints** will be added when I have them, but expect slower cadence.
- **The existing codebase is open and free** — fork it, improve it, make it yours. Both branches are on GitHub at `github.com/dlnraja/com.tuya.zigbee`.
- **I will still read the forum thread (140352)** but may not reply to every post. If it's urgent, open a GitHub issue.

**One more thing — the USB dongle users asked about (_TZ3000_h1ipgkwn and _TZ3000_iwtv2jwo, TS0002)**:

This device (the 2-port USB relay + Zigbee repeater, sold by SL SYS and others) is now properly supported in v8.1.0 with a dedicated `switch_usb_dongle` driver. It was previously being caught by `light_dimmable` and `switch_3gang` in error — both wrong. If you have one, re-pair it with the new version and it'll show up correctly as a 2-port USB socket with on/off control for each port plus power-on behavior settings.

Thanks for sticking with this project — it's been a hell of a ride building what's now the largest Tuya Zigbee app for Homey.

— Dylan
