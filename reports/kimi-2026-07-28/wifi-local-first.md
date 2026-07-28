# WiFi Local-First — Rapport de mission (2026-07-28)

> Périmètre : `lib/tuya/LocalTuya*.js`, `lib/tuya/LocalWiFiTuyaBridge.js`, `lib/tuya/TuyaGatewayEmulator.js`,
> `lib/wifi/*`, drivers WiFi Tuya (`device.js` uniquement), docs, rapport.
> Non touché (chantiers concurrents) : `DeviceFingerprintDB.js`, `TuyaNormalizer.js`, `scripts/`, `driver.compose.json`.

## 1. Cartographie WiFi actuelle

- **50 drivers WiFi** (`drivers/wifi_*`) dont **28 Tuya LAN** (étendent `lib/tuya-local/TuyaLocalDevice`)
  et 22 non-Tuya (11 eWeLink + 10 Sonoff DIY + 1 caméra) hors protocole Tuya.
- **Connexion** : 100% LAN Tuya (TuyAPI, TCP 6668, AES) via `TuyaLocalClient` : auto-détection protocole
  3.3→3.4→3.5→3.2→3.1, heartbeat 15 s, backoff 5 s→60 s, file de commandes 200 ms + timeout 10 s + 2 retries,
  file offline (50 cmd, expiration 5 min), IP self-healing par `TuyaUDPDiscovery` (UDP 6666/6667/6668).
- **Cloud** : uniquement au pairing (QR SmartLife / IoT API / manuel) et à la récupération de `local_key`,
  et seulement si `wifi_connection_policy.cloudFallback=true` (défaut `false`, local-first).
- **État des modules de mon périmètre** :
  - `lib/tuya/LocalWiFiTuyaBridge.js` : **était un stub** (v1, « Future implementation », aucun appelant) → rendu fonctionnel (v2, voir §3).
  - `lib/tuya/LocalTuyaInspired.js` + `LocalTuyaEntityHandler.js` : tables DP statiques utilisées par `TuyaEF00Manager` (Zigbee EF00), pas par le WiFi.
  - `lib/tuya/TuyaGatewayEmulator.js` : fonctionnel, utilisé par `drivers/sensor_motion_radar` (WakeStrategies).
  - `lib/wifi/WiFiConnectionPolicy.js` : policy store (strategy `local_first`, `cloudFallback:false` par défaut) — déjà câblée dans `TuyaLocalDevice`.

## 2. Branche `feature/wifi-local-first`

- Pas de merge-base avec master (historique divergent, 4242 fichiers de diff).
- `LocalTuyaEntityHandler.js`, `LocalTuyaInspired.js`, `LocalWiFiTuyaBridge.js` : **blob-identiques à master** (déjà intégrés).
- `TuyaGatewayEmulator.js` : la version **master est plus récente** (safeLogger, guards `_destroyed`, timers Homey).
- **Conclusion : rien à porter.** Le contenu utile de la branche est déjà sur master ou y est dépassé.

## 3. Changements appliqués

### a. Résolveur local-first — `lib/wifi/LocalFirstResolver.js` (nouveau)
Logique pure, sans I/O, pattern tuya-local :
1. **LAN** si `device_id` + `local_key` présents (IP via settings > udp-discovery > scan `find()` au connect) ;
2. **cloud** seulement si LAN impossible ET `cloudFallback=true` ET credentials cloud présents ;
3. **none** sinon. Chaque décision retourne un `reason` détaillé.

### b. Câblage — `lib/tuya-local/TuyaLocalDevice.js`
- `_createDevice()` : log verbeux de la décision — `[LOCAL-FIRST] Transport decision: LAN — local credentials present (device_id=…); IP known via settings; policy strategy=local_first…`.
  Transport `none`/`cloud` → `setUnavailable` explicite, pas de crash.
- **Nouveau handler `connection-timeout`** (le client l'émettait, personne ne l'écoutait → device mort jusqu'au redémarrage) :
  `_onConnectionTimeout()` → décision de fallback loguée (`resolveLanFailureAction`), snapshot cloud de diagnostic
  (rate-limité 10 min, **jamais appliqué** aux capabilities — le contrôle reste local), `setUnavailable`,
  puis **retry LAN différé 5 min** (`_scheduleLocalRetry`, timer nettoyé dans `_destroyDevice`, guards `_destroyed` partout).

### c. Bridge — `lib/tuya/LocalWiFiTuyaBridge.js` (v1 stub → v2 fonctionnel)
Façade local-first au-dessus de `TuyaUDPDiscovery` + `TuyaLocalClient` : `startDiscovery()`, `resolveTransport(id)`
(log de décision), `registerDevice()` (crée une session LAN réelle ou explique pourquoi pas), `connectDevice()`,
`sendCommand()` (file du client), `destroy()` propre. Rétrocompatible (même constructeur/export).

### d. DP mappings alimentés depuis `data/scanners/tuya-local-results.json`
Analyse : 500 devices crawlés (summary en annonce 995 — export tronqué), **362 matchent nos catégories WiFi**.
Nos drivers couvrent déjà l'essentiel (seules 3 capabilities compose non mappées : `light_hue/light_saturation`
— déjà gérées hors dpMappings via `_processDPUpdate` — et `child_lock` du thermostat). Ajouts **conservateurs** :
- `drivers/wifi_thermostat/device.js` : **+1 mapping réel** — `'7': child_lock` (tuya-local « lock », attesté x20/68 devices,
  capability présente dans le compose mais non mappée) ;
- annotations documentaires `// tuya-local: "<name>" (xN/…)` sur DPs `unknown` existants, **sans changement de comportement** :
  wifi_thermostat (5=fan_mode x24, 15=max_temperature x15, 36=hvac_action x13, 40=lock x22, 101=hvac_mode x51),
  wifi_humidifier (2=speed, 4=mode, 12=temperature_f, 13=humidity), wifi_dehumidifier (4=speed x30),
  wifi_siren (4=tone, 5=volume_level, 7=duration, 102=Alarm detection, 103=Open detection),
  wifi_sensor (9=button), wifi_ir_remote (201=send, 202=receive).
- Données d'analyse : `reports/wifi-tuya-local-coverage.json`.

Non fait volontairement : pas de nouveau mapping `onoff`/`dim`/`measure_*` générique (noms tuya-local trop
ambiguës — « switch », « sensor », « value » — risque de conflit multi-DP sur une même capability), pas de
nouveau driver, pas de `driver.compose.json` (chantier concurrent).

## 4. Tests

- `node --check` : OK sur les 9 fichiers touchés.
- Nouveau test `test/critical/wifi-local-first-resolver.test.js` : **13 tests, tous verts** (résolveur 9, bridge 4 ; mocks, zéro réseau).
- Périmètre WiFi (`wifi-local-first-resolver` + `wifi-local-battery-normalization` + `smartlife-wifi-regressions`) : **30/30 verts**.
- Suite complète `test/critical/*.test.js` : baseline **62 passing** avant mes changements ; à la fin **72 passing / 3-4 failing**,
  toutes les failures dans `lib/DeviceFingerprintDB.js` / `lib/utils/fingerprint-matcher.js` (`index is not iterable`,
  timeouts) — fichiers modifiés à 00:22-00:23 par les **agents concurrents** (chantier matching), sans lien avec mes changements.

## 5. Reste à faire

- Fallback cloud **données** (codes cloud → DPs) : non implémenté, nécessite un mapping code↔DP par produit ; le snapshot actuel est volontairement diagnostique.
- `LocalWiFiTuyaBridge` n'a pas encore d'appelant en production (candidat : `app.js` ou un futur driver unifié WiFi).
- tuya-local exporte 995 devices mais le JSON n'en contient que 500 → relancer le crawl pour les 495 manquants.
- Catégories tuya-local sans driver chez nous : EV chargers (~30 devices), kettles, heat pumps/HRV — à évaluer.
- Les noms DP génériques (« sensor », « value », « option ») gagneraient à être enrichis côté crawler (champ `capability` peu fiable aujourd'hui).
