# device_plug_smart wildcard pids — decision (2026-10-20)

Owner delegated the call ("prends les bonnes décisions entre compatibilité et couverture", 20/10 08:35 Paris).

## Facts
- `device_plug_smart` (class socket) has an EMPTY `manufacturerName`, so each productId it lists is a wildcard:
  Homey offers it for ANY manufacturer with that model id.
- Homey's Zigbee manifest has **no priority / match-order field**, and `zigbee.endpoints` does not take part in
  matching: per the Homey Apps SDK Zigbee guide it only defines which clusters are exposed on the ZCLNode.
  So "let the specific driver win" cannot be done by ordering; the only lever is where the wildcard lives.
- Evidence of harm: `_TZ3000_bjawzodf` / TY0201 (Z2M WSD500A temp+humidity, P2266) paired as a socket through
  this driver although `lcdtemphumidsensor` lists the exact couple (Wilhelm Dall, 17/10). A sensor bound to a
  socket driver has no working capability, so these pids gave no real coverage, only mis-pairs.
- The driver owns no couple (no manufacturerName), so no working couple can be lost by moving its wildcards.
- Its endpoint listed only Basic + 0xEF00, so ZCL On/Off, Metering and Electrical Measurement were not even exposed
  for native TS011F/TS0101 plugs that fell back here.

## Decision
1. Keep the plug-type wildcards here as last-resort fallback: TS011F, TS0101, TS0601, TS0049 (on/off water valve,
   on/off works), and the exotic pids that have no class-correct pid-only host yet (TS0222, TS1201, Excellux).
2. Re-home the sensor wildcards to class-correct pid-only fallbacks (coverage kept, class fixed):
   - climate pids RH3052, SM0201, TH01, THS317-ET, WSDCGQ01LM, WSDCGQ11LM, WSDCGQ12LM, lumi.sensor_ht,
     lumi.sensor_ht.agl02, lumi.weather -> `sensor_lcdtemphumidsensor_temphumidsensor` (class sensor,
     UnifiedSensorBase handles ZCL + Tuya DP); its endpoint gains native 0x0001, 0x0402, 0x0405.
   - TS0201, TY0201: already wildcard-hosted by that same sensor fallback, only dropped from the plug.
   - TS0202 (PIR) -> `pirsensor` (class sensor, IAS Zone).
3. Native clusters added to the plug endpoint: 0x0006, 0x0702, 0x0B04 (EF00 stays as overlay).
4. `ClimateSensorClassHeal` stays as backstop for devices already paired as socket. Existing paired devices are
   not touched; only new pairings route differently. Exact couples on exact drivers are unchanged.

Sources: Homey Apps SDK Zigbee guide (apps.developer.homey.app/wireless/zigbee), Z2M WSD500A, repo DB P2266.
Guard: test/critical/p2905-device-plug-smart-wildcard.test.js.
