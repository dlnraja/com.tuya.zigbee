# Issue #513 — Diagnostic & corrections (2026-07-28)

Issue : https://github.com/dlnraja/com.tuya.zigbee/issues/513
Utilisateur : finnamu — climate sensor `_TZE284_hodyryli` / `TS0601`, « Unknown Zigbee unit » persistant en v9.0.348 + crash `_onDeleted` sur stable. Labels : `bug`, `reopened-by-user`.
Interview Zigbee de l'utilisateur (pièce jointe du 1er commentaire) : endpoint 1, inputClusters `[4, 5, 61184, 0, 60672]`, outputClusters `[25, 10]`, mfr exact `_TZE284_hodyryli` (minuscule), modelId `TS0601`, battery enddevice.

---

## #513a — « Unknown Zigbee unit » au pairing

### Vérifications effectuées (toutes OK côté repo)

- `drivers/climate_sensor/driver.compose.json` : un seul bloc `zigbee` ; `_TZE284_hodyryli` (ligne 799) **et** `_TZE284_HODYRYLI` (ligne 721) dans `manufacturerName` (854 entrées) ; `TS0601` présent dans `productId` (74 entrées). Paire (mfr, pid) dans le MÊME driver. ✔
- `app.json` (manifest publié, v9.0.348) : driver `climate_sensor` contient bien les deux variantes de casse + `TS0601`. Aucun **autre** driver (sur 431) ne revendique ce mfr — pas de collision, pas de driver générique capturant. ✔
- `platforms: ["local"]`, `connectivity: ["zigbee"]` corrects dans compose et app.json. ✔
- `drivers/climate_sensor/device.js` : mappings DP TS0601 génériques (DP1 temp, DP2 hum, DP3/4 battery) — le device interviewé n'a PAS de clusters ZCL temp/hum (1026/1029) ; il parle Tuya DP (0xEF00 = 61184), donc les dpMappings suffisent. Pas de blocage pairing ici (le pairing Homey matche uniquement mfr+productId, pas les endpoints). ✔

### Conclusion

**Le manifeste du repo est correct.** Homey matche au pairing sur `manufacturerName` + `productId` (comparaison exacte de chaînes) — les deux casses sont présentes, le match devrait réussir en v9.0.348. L'échec persistant chez l'utilisateur pointe donc vers l'**artefact publié ≠ repo** :

- `app.json` fait **6,49 MB** — le gate P23 (AGENTS.md) documente une limite Athom de 4 MB. Le validateur (`scripts/_validate_all.js`, check M09) signale aussi 255 mfrs synthétiques à pruner pour réduire la taille d'upload. Un publish partiel/rejeté avec version bumpée quand même (pattern P19 : « auto-publish bot can revert manual fixes ») expliquerait que le store serve un build où le fix de casse P82 est absent.
- À vérifier côté release (hors portée locale, aucun git push autorisé) : le build test v9.0.348 contient-il réellement `_TZE284_hodyryli` en minuscule ?

Aucune correction code nécessaire pour #513a — le repo est sain.

---

## #513b — Crash `Cannot read properties of null (reading '_onDeleted')`

### Cause racine

`_onDeleted` est un interne du **firmware Homey** (cycle de vie device côté core) — l'identifiant n'existe nulle part dans le repo ni dans `node_modules` (grep exhaustif). Le crash est déclenché côté app par la cassure de la **chaîne `onDeleted`** : plusieurs classes surchargent `onDeleted()` **sans appeler `super.onDeleted()`**, donc `ZigBeeDevice.onDeleted()` (homey-zigbeedriver), qui fait `node.removeAllListeners()` + nettoie les listeners de tous les clusters zclNode, **n'était jamais exécuté**. Les listeners Zigbee restaient actifs sur un device détruit ; une trame tardive (rapport DP 0xEF00, attribute report) après suppression → le core touche un device disposé → `null._onDeleted`.

Le pire contrevenant était la **racine** de la hiérarchie : `TuyaZigbeeDevice.onDeleted()` (lib/tuya/TuyaZigbeeDevice.js:870) — alors que `onUninit()` juste en dessous appelait bien `super.onUninit()`. Toute la branche (431 drivers en majorité) était affectée. Chaîne climate_sensor : `ClimateSensorDevice → UnifiedSensorBase → TuyaZigbeeDevice → …mixins… → ZigBeeDevice`.

### Corrections (même pattern : ajout de l'appel `super.onDeleted()` gardé)

| Fichier | Ligne | Correction |
|---|---|---|
| `lib/tuya/TuyaZigbeeDevice.js` | 870 | `if (super.onDeleted) { await super.onDeleted(); }` en fin de méthode (style calqué sur `onUninit` juste en dessous) |
| `lib/devices/UnifiedSensorBase.js` | 4489 | appel parent gardé + try/catch (style `BaseUnifiedDevice`) — classe utilisée par climate_sensor |
| `lib/devices/TuyaUnifiedDevice.js` | 1852 | méthode passée en `async` + appel parent gardé |
| `drivers/outdoor_2_socket/device.secondSocket.js` | 34 | méthode passée en `async` + appel parent gardé (étend `ZigBeeDevice` directement) |
| `lib/templates/BEST_PRACTICE_DEVICE_TEMPLATE.js` | 184 | appel parent gardé (le template « best practice » propageait le mauvais pattern) |

Scan exhaustif drivers/ + lib/ : 6 overrides `onDeleted` sans `super` trouvés, 5 corrigés. Le 6e, `lib/utils/ClassExtendsGuard.js:64`, est un **stub minimal intentionnel** (classe de secours sans parent) — laissé tel quel.

Chaîne vérifiée après correction : `DiagnosticLogsCollector` et les mixins (`PhysicalButtonMixin`, `VirtualButtonMixin`) ne surchargent pas `onDeleted` → l'appel remonte bien jusqu'à `ZigBeeDevice.onDeleted()`.

---

## Fix bot diag-resolver (spam « Auto-resolved »)

Fichier : `.github/scripts/diagnostic-auto-resolver.js` (le vrai script ; `scripts/diagnostic-auto-resolver.js` à la racine est un stub d'une ligne). Le bot commentait toute issue dont les fingerprints existent, sans tenir compte des retours utilisateur (28 commentaires sur #513, dont 3 le 27/07).

Garde ajoutée dans la boucle issues de `main()`, avant tout commentaire (KB match ou fingerprint) :

- **(a)** skip si l'issue porte le label `reopened-by-user` ;
- **(b)** sinon, fetch des commentaires de l'issue : skip si le **dernier commentaire humain** (hors comments taggés `<!-- diag-resolver -->`, `<!-- tuya-reopen-bot -->` et auteurs `*[bot]`) est **postérieur au dernier commentaire bot** ET contient `/\b(still|toujours|not fixed|encore)\b/i`.

Défensif : si l'API comments échoue (`ghGet` → null), la garde (b) est ignorée (comportement antérieur conservé) ; la garde (a) labels reste active. Aucun changement sur les repos sans fingerprints.

---

## Validation

- `node --check` OK sur les 6 fichiers modifiés.
- `node scripts/_validate_all.js` → **3/3 checks passed** (50 checks OK, 0 erreur CI-blocking ; warnings M09/O20 préexistants, non liés).
- Aucune action GitHub en écriture (lecture seule : `gh issue view` uniquement). Aucun commit/push.

## Limites (non vérifiables sans Homey réel)

- #513a : impossible de vérifier localement que le build test v9.0.348 publié contient le fix de casse — le repo est correct, l'hypothèse « artefact publié périmé » (P19/P23) nécessite une inspection du build Athom ou un re-publish.
- #513b : le crash vient de la stable v5.11.216 (branche `stable`, non présente localement) ; le même pattern y existe probablement — à backporter après vérification master (discipline AGENTS.md).
- La garde (b) du bot n'a pas été testée en exécution réelle (nécessite token + réseau) ; syntaxe validée par `node --check`.
