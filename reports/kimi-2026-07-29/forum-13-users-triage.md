# Triage des 13 utilisateurs forum sans réponse (2026-07-29)

> Source : `forum-dlnraja-history.md` §5. Statut au build **v9.0.353** (Test) + correctifs en cours.
> Aucune réponse postée (consigne « sans prévenir les utilisateurs ») — ce fichier sert de feuille de route.

| Utilisateur | Problème | Statut technique |
|---|---|---|
| **Jocke_Wallen** (#2079-2104) | Moes 4-btn `_TZ3000_u3nv1jwk` appuis muets, 4 diags | Driver TS0044 complet en repo (v10.1.2) ; son build publié était tronqué par l'ancien compacteur → **résolu par le nouveau compacteur (2674+)** + logs diag ajoutés (P92.18 en cours) |
| **Tobias-B** (#2080) | Light sensor sans données lux (`_TZE284_aaeasoll`) | Couvert par `light_sensor_outdoor` ; cause probable = version publiée ancienne → **à re-tester sur v9.0.353** |
| **Automagiker** (#2081) | Nedis `_TZE284_ne4pikwm` appairée Climate Sensor | Vérifier dual-claim `radiator_valve` vs `climate_sensor` — sinon couvert par compactor |
| **Ronald_Bok** (#2091) | Soil `_TZE200_npj9bug3` → Curtain Module | Mispairing cross-driver → vérifier claim dans curtain_motor (voir ci-dessous) |
| **Lucas360** (#2092) | Energy usage erroné (×660) | **Fix défensif en cours** (agent-37 : diviseur alternatif sur bond impossible) |
| **blutch32** (#2093-2101) | Soil + ampèremètre cassés | Soil : overflow 0x04000000 corrigé (P92) ; ampèremètre = même fix energy |
| **JiriG** (#2097) | Soil `_TZE284_myd45weu` unknown | Fingerprint présent ; tronqué au publish avant → **résolu 2674+** |
| **VicBehrens** (#2099) | Moes 4-gang `_TZ3000_mrduubod` « Missing Capability Listener: Button 1 » | **Corrigé** : button.1-4 déclarés (driver-mesh) + listeners vérifiés (P92) |
| **Beck51** (#2106) | `_TZE284_pcdmj88b` inutilisable | Couvert par `wall_thermostat` ; build publié tronqué → **à re-tester sur v9.0.353** |
| **Peter_van_Werkhoven** (#2107-2114) | Contact state figé + crashs | Fix luminance confirmé (v9.0.261) + fixes onDeleted/`_destroyed` (P92, stable incluse) |
| **Nigel_Scott** (#2112) | Demande device, image = logo sans interview | **Bloqué** : besoin de l'interview Zigbee (mfr/pid/clusters) |
| **thierry_arguimbau** (#2115) | Dual energy meter `_TZE204_dhotiauw` | **Couvert** (`din_rail_meter`, fix P88 du 24/07) → à re-tester sur v9.0.353 |
| **Joep_Vullings** (#2102-2105) | Valve : batterie OK, boutons KO, UI « 4× Dim niveau » | Appairée dans un driver dimmer (mauvais) → vérification dual-claim en cours (agent-37) |

## Actions restantes côté projet

1. ~~Vérifier les dual-claims mis-pairing~~ **FAIT (2026-07-29)** : les 4 mfrs sont chacun
   revendiqués par UN SEUL driver correct (`ne4pikwm`→radiator_valve, `npj9bug3`→soil_sensor,
   `pcdmj88b`→wall_thermostat, `fhvpaltk`→valve_dual_irrigation). Les mauvais appairages
   venaient de la troncation au publish (drivers absents du build) — résolu par le compacteur
   priorisé (build 2674+).
2. Quand les utilisateurs republieront des diags sur v9.0.353 : traiter via le pipeline diagnostics habituel.
3. Nigel_Scott : sans interview, rien de faisable.
