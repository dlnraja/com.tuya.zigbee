# Diagnostics et crashs Homey reçus par Gmail (01/08 → 10/10/2026)

Source : notifications noreply@homey.app (lecture seule). 23 fils = 19 crashs automatiques + 73 rapports de diagnostic envoyés par les utilisateurs (master 62, Bastien 11, stable 0 diag / 2 crashs). Les rapports eux-mêmes ne sont pas recopiés ; seules les causes sont résumées.

## Crashs automatiques (19), par cause racine
| Cause | Versions | Nb | État |
|---|---|---|---|
| Carte flow `health_battery_replacement_predicted` : jeton `current_battery` indéfini | 9.0.391–394 | 3 | Corrigé (`_safeNumber`) sur les 3 branches |
| `getDeviceById` pendant la relecture des flows (appareil supprimé) | 9.0.426 | 1 | Corrigé (P101, patch global) sur les 3 branches |
| `clusterUtils` timer : `_destroyed` sur `this` non lié | 9.0.429–433 | 3 | Corrigé sur les 3 branches |
| `auditCapabilities is not a function` | 5.12.70 | 1 | Corrigé (garde de type) sur les 3 branches |
| `generic_tuya` : `capability is not defined` | 9.0.434 | 1 | Corrigé sur les 3 branches |
| `Invalid Driver ID` / `Driver Not Initialized` (anciens drivers dans des flows : virtualdriverzigbee, ZG9101SAC_HP, light, motionsensor) | 9.0.677–895 | 8 | Corrigé (`safe-get-driver-patch`) sur les 3 branches |
| `TuyaRadarRangeScale` introuvable (stable) | 5.12.288–290 | 2 | Corrigé (fichier présent) |

## Erreurs récurrentes dans les diagnostics
| Erreur | Nb | État |
|---|---|---|
| Radar : `[P2308] recursion aborted: tuya_dp_value` | 48 | Garde en place + nettoyage des anciennes capabilities tuya_dp_* |
| SOS : `onNodeInit` → `.catch` sur undefined | 34 | Corrigé (v9.0.365+) |
| Télécommandes : `this.homey` indéfini pendant l'enrôlement IAS | 32 | Corrigé (IASZoneManager réécrit, reprises différées) |
| `battery_health_changed` : jeton `health_score` indéfini | 14 | Corrigé sur master/Bastien ; **porté sur stable le 10/10** |
| `remote_button_wireless_wall` : `CI is not defined` | 2 | Corrigé sur master/Bastien ; **porté sur stable le 10/10** |
| Thermostat mural : récursion `safeSetCapabilityValue` | 7 | Plafond de profondeur P2308 en place |
| Volets : `Tuya cluster not available` | 12 | Volets _TZE200_127x7wnl / _TZE204_5slehgeo / _TZE200_icka1clh : à suivre avec un nouveau diagnostic |
| Manque de mémoire (Peter, 9.0.1330) | 1 | Corrigé (plus de chargement du manifeste complet) |

## Couples cités (tous déjà dans les drivers des 3 branches)
_TZ3000_dzwgk7e2, _TZ3000_axpdxqgu, _TZ3000_vsxvaj9i, _TZ3000_0cxtpylt, _TZ3000_mrpevh8p, _TZ3000_xffhmvhv, _TZ3000_zgyzgdua, _TZ3000_kaflzta4 (boutons) · _TZE200_127x7wnl, _TZE200_icka1clh, _TZE204_5slehgeo (volets) · _TZE200_3towulqd, _TZE204_clrdrnya (radars) · _TZE200_pay2byax, _TZ3000_decxrtwa (contact) · _TZ3000_3dfewsk1 (fuite) · _TZE284_m1cvyneb (variateur) · _TZE200_p3dbf6qs (TRV) · _TZE284_60cnqlhn (compteur DIN) · _TZ3000_fdxihpp7, _TYZB01_qeqvmvti (interrupteurs).
Aucune interview Zigbee complète dans ces mails.
