# Zigbee Apps Catalog for Homey

This catalog centralizes the **most popular Homey apps** that handle Zigbee or Zigbee-derived proprietary protocols (Tuya, Philips, Xiaomi/Aqara, IKEA, etc.). Use this as a reference when expanding `ManufacturerCatalog`, `TuyaDPUltimate`, flows, or driver coverage.

| App name | App Store link | GitHub/Source repo | Protocol coverage | Key manufacturers | Feature highlights | Notes |
| -------- | -------------- | ------------------ | ----------------- | ----------------- | ------------------ | ----- |
| **Philips Hue** | https://homey.app/fr-fr/app/nl.philips.hue/ | https://github.com/athombv/homey-philips-hue | Zigbee ZLL / Zigbee 3.0 + Hue gateway bridge | Philips / Signify | Lighting scenes, entertainment, color loop, motion | Official Athom app; uses Huebridge for Hue devices; helpful for color flow inspiration |
| **Aqara** | https://homey.app/fr-fr/app/com.xiaomi-mi/ | https://github.com/athombv/com.xiaomi-mi | Zigbee ZHA + Xiaomi proprietary (FCC0 cluster) | Xiaomi / Aqara / LUMI | Motion, contact, temp/humidity, sensors, cameras | Good reference for handling Xiaomi quirks and opple remotes |
| **IKEA Trådfri** | https://homey.app/fr-fr/app/com.ikea.tradfri/ | https://github.com/athombv/com.ikea.tradfri | Zigbee ZLL + IKEA extensions (FC7C cluster) | IKEA of Sweden | Lights, remotes, blinds, powering, groups | Shows how to handle IKEA-specific OTA/binding flows |
| **Shelly** | https://homey.app/fr-fr/app/cloud.shelly/ | https://github.com/allterco/homey-shelly | Cloud + Zigbee/Tuya-like hybrids | Shelly / Allterco | Plugs, relays, energy monitoring | Mixed connectivity (Cloud/Local) but good for energy flows |
| **Sonos** | https://homey.app/fr-fr/app/com.sonos/ | https://github.com/athombv/com.sonos | Wi-Fi (reference only) | Sonos | Speaker grouping, flows | Useful for integration style, not Zigbee
| **Tuya Zigbee (Universal Tuya)** | https://homey.app/fr-fr/app/com.dlnraja.tuya.zigbee/ | https://github.com/dlnraja/com.tuya.zigbee | Tuya DP 0xEF00, 0xE000, 0xE001, 0xED00 | _TZ3000_, _TZE200_, _TZE284_, etc. | 25+ device profiles, 500+ DPs, Matter bridging, flows | Use existing TuyaDPUltimate for mapping; align flows with catalog entries |
| **Zemismart** (community) | https://homey.app/fr-fr/app/com.dlnraja.zemismart/ | https://github.com/dlnraja/com.dlnraja.zemismart | Tuya DP (EF00) bundles | Zemismart / Lonsonho | Curtains, switches, button controllers | Good for multi-gang manufacturer handling |
| **Fibaro** | https://homey.app/fr-fr/app/com.fibaro/ | https://github.com/athombv/com.fibaro | Z-Wave / Zigbee? (mostly Z-Wave) | Fibaro | Scenes, motion, relays | Reference for flows/capabilities, not Zigbee
| **HomeyScript / Virtual Devices** | n/a | https://github.com/athombv/homeyscript | n/a | Custom | Automation toolkit | Use for scripting flows; mention in notes

## Integration Notes
1. **ManufacturerCatalog** should reference the `Protocol coverage` and `Key manufacturers` columns to keep categories aligned with actual apps. For example, apps supporting `_TZE284_` should map to `motion_sensor` or `climate_sensor` categories.
2. **TuyaDPUltimate** can reuse the `Feature highlights` column as shorthand for which DPs/capabilities are already covered; mark missing combos for future additions.
3. **Flows & Flow cards**: align flow descriptions (motion detected, curtain opened) with the flows listed under ManufacturerCatalog categories. Use this catalog as documentation to ensure each app's flows are mirrored in your custom flows when possible.
4. **External contributions**: when new manufacturer and app mappings are discovered (forums, Homey App Store, GitHub), add rows to this table with the protocol, manufacturer, and capability notes.

## Next Steps (manual)
- Continue enriching this catalog with apps discovered via the Homey App Store, forums, or GitHub. Add `Protocol coverage`, `Manufacturers`, and `Flow highlights`. Flag any missing protocols/capabilities in TuyaDPUltimate.
- Use the catalog to populate additional unit tests or mapping validation scripts.
