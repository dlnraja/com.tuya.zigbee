# Homey Tuya Zigbee — reprise depuis le début (2026-08-21 22:33 PT)

Rien n’est supposé. Preuves locales + Athom Tools collé par dlnraja. Pas de pid inventé. Pas de post forum.

## 1. Qu’est-ce que c’est

Fork de JohanBendz: https://github.com/dlnraja/com.tuya.zigbee
Workspace parent: `C:\Users\Dell\Documents\homey`
Doctrine runtime: identité = **manufacturerName + productId** (couple sacré). Un MFS a des milliers de variants. Jamais driver-key mfr-only. Runtime s’adapte à TX/RX réel (ZCL et EF00). Late DP doit être géré, pas ignoré.

Interdit: CloudAgent Cursor, Max Mode, poster Community (T157628), inventer un pid, `Cluster.addCluster` OnOff std, storm EF00/0x8004/reporting sur sleepy IAS/TS004x.

## 2. Deux apps Athom (preuve t50u Developer Tools)

dlnraja gère **2 apps**, pas une.

| Canal | Branche git | Clone | App ID Store | Nom Store | Affichage Tools | HEAD git vérifié |
|---|---|---|---|---|---|---|
| Soak smart 9.0 | `master` | `Documents\homey\master` | `com.dlnraja.tuya.zigbee` | Universal Tuya | `9.0.6194730` | `1f18cb336` origin/master |
| **STABLE** | **`stable-v5` EST STABLE** | `Documents\homey\stable` | `com.dlnraja.tuya.zigbee.stable` | Tuya Unified (Stable) | `5.11.216270` | `4ab10842d` origin/stable-v5 |

Conséquence: slots Test/Live **indépendants**. L’ancien soak-guard « ne jamais Publish Stable→Test tant que 9.0 occupe le slot » visait un **ID unique**. Il est faux pour le Store actuel.

Trou git: `stable/app.json` a encore `"id": "com.dlnraja.tuya.zigbee"`, `"version": "5.12.87"`, name Universal Tuya, commentaire « STABLE channel ». Tant que cet id n’est pas `.stable`, un publish depuis cette branche peut viser la **mauvaise** app 9.0. **Ne pas pousser stable tant que les workflows + id ne sont pas recoupés.**

master ne change pas d’id.

## 3. Ce qui est déjà sur Test 9.0 (cette soirée)

Commits master (log local):

- `8e46a953f` coerce IAS zoneStatus Buffer/object → uint16 (Peter pulse)
- `324e166a6` / `85ad24d98` v9.0.618 stamp
- `1f18cb336` TS0044 0xFD physical press, skip 0x8004, gangCount=4, EP1–4 `scene_switch_4`

Athom Tools montre Universal Tuya **9.0.619** (build collé). Git local n’a pas de commit `v9.0.619` dans le log -5. Possible Auto-Publish bump Store sans tag git, ou affichage version+build. À recouper CI.

stable `4ab10842d` = même fix TS0044 0xFD, **git only**, tree clean.

meter91 doit **updater Test + re-pair** (EP1–4 / 0xFD ne hot-swap pas). Peter était encore en 9.0.617 Experimental au post.

## 4. Terrain (couples lockés seulement si preuve)

**meter91 #2189** — Moes XH-SY-04Z `_TZ3000_zgyzgdua`+**TS0044**, driver `scene_switch_4`. PAS un knob ERS-10TZBVK-AA. Press = genOnOff **cmd 0xFD** payload 0/1/2 par EP 1–4. Jamais write 0x8004. TS0044 ≠ TS0004 ≠ TS004F. Overlay: ne pas locker mfr seul.

**Peter #2184 / dump 1cf775a2** (9.0.596): water leftover HYBRID-QUERY (11 DP requested, 0/11 sent). Smartbutton dump `_TZ3000_mrpevh8p`+TS0041. Water couple compose/Z2M `_TZ3000_k4ej3ww2`+TS0207 IAS — **absent du post forum**, donc overlay forum-only interdit. SOS OK. Contact pulse (coerce déjà ship). Water leak dead.

## 5. Architecture publiée (HEAD `1f18cb336`)

RX souhaité: couple → raw handleFrame (0xFD) → BoundCluster → ZCL named → EF00 **seulement si 61184 présent** → HYBRID skip sleepy.

Publié: fusion inversée (zcl=1, dp=2, ias=2 tied, raw=5). Catalogs overlay / EnrichedDPMappings / LiveData = **mfr-only**. Couple DB = `DeviceFingerprintDB.lookup("mfr|pid")` seulement. Late DP = stocké + `tuya_dp_received`, pas addCapability (≥3 samples). SmartDriverAdaptation diagnostic_only refuse Tuya DP. `_bootDynamicAdaptation` no-op si EF00 absent à l’interview.

IR: 4 drivers, TS1202 absent, flows cassés, 0 couple DEVICE_TRUTH.

Boutons: mixin 0xFD **jamais bindé** sauf `scene_switch_4`. Deux fichiers OnOffBoundCluster. Flow ids hashés vs construits.

Cursor plan energy/L14: YAML stale pending, code 9.0.618 déjà là. Reste: 42 bypass L14, horloges 5 vs 15 min, pas de setDriver SDK3.

## 6. Working trees maintenant

master DIRTY (skip IAS commencé, chemins réels):

- `lib/tuya/TuyaZigbeeDevice.js`
- `lib/io/DeviceIOFacade.js`
- `lib/io/ProtocolFallbackChain.js`
- `lib/protocol/IntelligentProtocolDetect.js`
- `data/protocol_quirk_table.json`
- untracked: `.github/state-forum-tail.json`, `reports/forum-2183/` — **ne pas committer**

stable CLEAN.

Worktree `Documents\homey\stable-v5-p195` @ `868dd209d` = **STALE**. Clone canonique Stable = `Documents\homey\stable`.

## 7. Plan depuis zéro (intelligent, pas un dump)

Ordre:

1. **Recouper CI** : quelle GHA publie quel App ID depuis quelle branche. Bloquant pour tout push stable.
2. **Master** leftover skip EF00 sleepy IAS (1cf775a2) + mixin 0xFD + fusion sleepy-only raw/IAS > DP. Push master → Auto-Publish Test 9.0. Pas de 3e publish manuel si slot healthy.
3. **stable-v5** aligner `.homeycompose` id → `com.dlnraja.tuya.zigbee.stable` + nom Store. Ensuite seulement push. Identity: k4ej TS0207 IAS, ZG-303Z hors climate, TB25 hors generic_tuya. Fiabilité only.
4. Overlay smartbutton couple dump `mrpevh8p`+TS0041 → `button_wireless_1` (pas lock mfr-only).
5. MASTER_ONLY ensuite: catalogs `mfr|pid`, late-DP addCapability, clocks, IR method names, flow hash map.
6. Ne PAS: infer-enrich apply, Kanbros → wall_* sans interview, inventer 18 mfrs vides, locker zgyzgdua overlay, poster forum.

## 8. Docs déjà sur le PC

- `C:\Users\Dell\Documents\homey\DUAL_APP_AND_BRANCHES.md`
- `dynamic-adapt-code.md`
- `ir-blaster.md`
- `button-coverage.md`
- `cursor-todos-import.md`
