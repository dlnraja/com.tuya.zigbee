# Smart Gateway Features (P2563–P2565)

Branding-free Homey reimplementations of Zigbee hub smart features from Signify, IKEA, Aqara, SmartThings, Lutron, WiZ, Xiaomi — **never** those names in UI.

**Machine SSOT:** [`config/architecture/world-zigbee-smart-features-ssot.json`](../../config/architecture/world-zigbee-smart-features-ssot.json)  
**Gates:** `check:p2563` · `check:p2564` · `check:p2565`  
**Classify:** `MASTER_ONLY`

## Multi-vendor map (internal → UI)

| Vendor concept (internal) | Homey UI |
|---------------------------|----------|
| Hue Adaptive / daytime white | Soft Daylight Fade / Auto |
| Hue/WiZ lamp RF sensing | Lamp Mesh Occupancy |
| IKEA remote→light binding | Soft Device Link |
| Aqara motion+lux lighting | Lux Adaptive Dim + Path Light |
| ST/HA master–follower | Mirror Light Sync |
| ST arrival / Aqara welcome | Welcome Home Soft |
| Aqara absence energy-save | Absence Energy Soft |
| Lutron/ST leave-home | Staggered Leave Off |
| Quiet hours / DND | Quiet Hours |
| Door/contact entry | Contact Entry Soft |
| Sunset Tracker shades | Shade Daylight Soft |
| Peak load shed | Peak Load Soft Shed |
| Auto-Off Timer | Idle Auto-Off Soft |
| Night path dim | Night Path Bias |
| Entertainment RGB flood | Soft Ambient Sync (rate-limited) |
| Hubitat/ST modes | House Mode |
| Vacation / away shuffle | Lived-In Shuffle |
