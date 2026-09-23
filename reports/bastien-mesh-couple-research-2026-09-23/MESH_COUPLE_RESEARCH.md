# Bastien mesh couple research — P2695 (2026-09-23)

**Mandate:** max-depth mfr+pid only · Z2M / ZHA / Blakadder / Hubitat / HA / Gmail diag / prior Bastien SSOT  
**No invent pid** · Network key never stored · Forum SHADOW only  
**Tip:** Zigbee Bastien ≥ **1.0.71**

## Live mesh inventory → sacred couple → driver

| Nwk | DevTools name | IEEE | Live mfr / pid | Driver | Sources lock |
|-----|---------------|------|----------------|--------|--------------|
| 1–2 | Radiateur * | NodOn | `NodOn`+`SIN-4-FP-21` | **EXTERNAL** `com.nodon` | leave alone |
| 3 | Unknown | `7c:c6:b6:ff:fe:a3:e1:58` | `_TZ3000_axpdxqgu`+`TS0041` | `button_wireless_1` | Z2M #28038 #25720 · ZHA TO quirk · P2630 interview |
| 4 | salon/cuisine | `a4:c1:38:09:4f:ff:ff:ff` | `eWeLink`+`CK-TLSR8656-SS5-01(7014)` | `climate_sensor` | Z2M device page · Hubitat CK-TLSR · **≠7000 button** |
| 5–8,10,12,15–16 | Lights | HOBEIAN OUIs | `HOBEIAN`+`ZG-301Z` | `switch_1gang` | Z2M ZG-301Z (WHD02 family) · **no metering** · P2667 light class |
| 9,11 | Sous sol / chambre | `…a0:cf…` / `…b2:2c…` | `_TZ3000_fllyghyj`+`SNZB-02` *(Homey)* | `climate_sensor` | Z2M fingerprint **TS0201**/WSD500A/TH02Z · Homey may show SNZB-02 alias |
| 13 | Unknown | `…bb:8f:37:ee:17` | stale ghost old TS0042 | remove orphan | was P2636; live remote = #17 |
| 14 | Unknown | `…c1:17:76:42:f4` | `_TZ3000_fllyghyj`+SNZB-02 | `climate_sensor` | same family as #9/#11; interview lost |
| 17 | 2-Boutons… | `…e6:69:60:4a:6f` | `_TZ3000_dzwgk7e2`+`TS0042` | `button_wireless_2` | Z2M generic TS0042 (0xFD actions) · diag **885a9901** powerCfg · P2691/P2693 |
| 18 | Unknown | `…e6:74:3a:00:da` | **NEED_INTERVIEW** | — | Soft only: OUI near #17 — never invent |
| 19 | Eclairage salon | `…f7:14:92:cb:c8` | `_TZ3000_ltt60asa`+`TS0004` | `switch_4gang` | Z2M TS0004_switch_module · Blakadder SML-04Z · ZHA #1982 gang bleed |
| — | **OFF MESH** | `…f6:3d:2d:c9:79` | `_TZ3000_vsxvaj9i`+`TS0043` | `button_wireless_3` | Z2M TS0043 actions · Bastien interview P2629 · P2693 Flow not canaux |

## Cross-ref matrix (external)

| Couple | Z2M | ZHA / HA | Blakadder / Hubitat | Homey Bastien Contre quoi |
|--------|-----|----------|---------------------|---------------------------|
| axpdxqgu+TS0041 | TS0041 action single/double/hold | quirk events | — | `check:p2630` / p2684 |
| dzwgk7e2+TS0042 | zigbeeModel TS0042 (generic) | scene remote | privatehomelab TS0042 notes | `check:p2636` / p2693 · diag 885a9901 |
| vsxvaj9i+TS0043 | zigbeeModel TS0043 | many TO quirks | ControllerX TS0043 | `check:p2629` / p2693 |
| fllyghyj+TS0201/SNZB-02 | WSD500A fingerprint TS0201 | Hubitat lists TS0201 | HA #450863 | `check:p2666` climate |
| eWeLink+7014 | dedicated TH page | Hubitat CK-TLSR driver | herdsman #8855 | P2631 forbid 7000 |
| HOBEIAN+ZG-301Z | ZG-301Z / WHD02 · switch_type/countdown | HA devices list | no power meter | P2662–P2667 calm+light |
| ltt60asa+TS0004 | TS0004_switch_module EP1–4 | ZHA #1982 independent gangs | Blakadder SML-04Z | `check:p2634` |

## Diags / prior patches

| UUID / patch | Couple | Lesson |
|--------------|--------|--------|
| **885a9901** | dzwgk7e2+TS0042 @ 1.0.60 | powerCfg TX storm → CR2032 drain → **P2691** skipBatteryReporting |
| **8f0915fa** | dzwgk7e2 + switch_1gang | bootstrap ghost physical_off → **P2681** |
| P2629 interview | vsxvaj9i+TS0043 | clusters [0,1,6,57344] · 0xFD · no EF00 |
| P2630 interview | axpdxqgu+TS0041 | [0,1,6] · no E000 |

## Mesh health notes (this dump)

- Channel **20** OK for Wi-Fi coexistence.
- TS0042 #17 last-seen improved vs earlier (was 3h → ~18m) but still routes **0→NodOn→remote** (LQI ~86) — re-pair near HOBEIAN.
- HOBEIAN routers healthy (high TX counters) — keep tip ≥1.0.69 heal (no metering flood).
- **4 Unknown** still need user remove/re-pair (except #13 orphan delete-only).

## Enrichment applied (P2695)

1. Couple profile markdowns (all Bastien house couples + research links)
2. `BastienIeeeIdentity` + `check:p2695` Contre quoi
3. Document Homey `SNZB-02` pid alias for fllyghyj (Z2M = TS0201) — both already in `climate_sensor` productId (complementary, no invent)
4. Soft NEED_INTERVIEW for Node 18 only

## User actions (unchanged priority)

1. Update Bastien ≥**1.0.71**
2. Remove Unknown #3 → Bouton 1 · #14 → Climate · #13 orphan delete · #18 interview
3. Re-pair OFF-MESH 3-btn as Bouton 3
4. Repair #17 near HOBEIAN; Flows = Button pressed
