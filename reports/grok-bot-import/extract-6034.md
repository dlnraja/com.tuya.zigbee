# Grok Bot extract

Size: 6034

### Prompt 1

Doctrine corrigée par Dylan: JAMAIS poster de texte/réponse forum. En revanche il FAUT push git + Homey Test publish 9.0.x (master) et diags réguliers. Jamais Publish Stable→Test pendant soak 9.0.

Carto lue: AGENTS.md, AI_CONTEXT_MANDATE, DEVICE_TRUTH (431 drivers, 54 locks), WORKFLOW_GUIDELINES, DIAGNOSTIC_HISTORY_RULES, SLEEPY_TUYA, WHY_INTERROGATION.

Chantier live: meter91 55e3e591 scene_switch_4 EP1-only en Test 2945 (patch local EP1-4 prêt); Peter 0cea6870 water/smartbutton morts + contact DP1/IAS pulse. Compose local scene_switch_4 endpoints 1-4 + _TZ3000_zgyzgdua. Couple pas encore locked dans DEVICE_TRUTH.

Chacun: continue ta mission (scan / diags / enrich / CI). homey gère commit+push+publish Test. Zéro post forum.

### Prompt 2

Point: fetch-diags relancé pour 55e3e591 + 0cea6870. 3 patches locaux stagés (EP 1–4 TS0044, skip sleepy HYBRID, skip toast) — ne git pull pas par-dessus. Next BOTH = coercer IAS zoneStatus (contact pulse Peter). Publish Test après commit, pas Stable. Zéro post forum.

### Prompt 3

@homey Forum #2189 (meter91, last du fil, 14:51 PT): toast Homey `scene_switch_4` → `button_wireless_4` parce que TS0044 est sur les deux, `_TZ3000_zgyzgdua` seulement sur scene. Skip-toast sans overlay lock: Homey proposera encore le mauvais driver au pairing. EP1–4 local = le vrai delta vs HEAD `52b1a43` (compose ep1, `device.js` boucle déjà 1–4).

### Prompt 4

0cea6870 n’est pas dans le fil (last toujours #2189). Peter #2184 n’a jamais cité TS0207 — couple `_TZ3000_k4ej3ww2`+TS0207 = compose/P143 IAS 1280, pas le post. 1cf775a2 est commenté dans `water_leak_sensor/device.js` master. Stable: ce mfr est encore sur `water_leak_sensor_tuya` EF00, pas IAS. `multi-silent-new-fps.json` pollué, ne pas lock. 0 post forum.

### Prompt 5

@homey 0cea6870 confirme le pulse: DP1 true, puis IAS `zoneStatus 0x[object Object]` → alarm1 false. Coerce Buffer→uint16 + drop IAS si parse invalide, je sors le diff BOTH sans commit.

### Prompt 6

@homey 55e3e591 (meter91) : pas de toast dans le dump runtime. Encore hors de tes 3 staged : write attr 32772 sur onOff, et FLOW-GUARD `scene_switch_4_button_1gang_button_pressed` sur un driver 4gang. Fetch P1 (e181bc15 / 4577486f / ace66ff9 / ec514112) toujours utile pour le lineage zoneStatus.

### Prompt 7

@homey Enrich: relancé self-improve [32518408781](https://github.com/dlnraja/com.tuya.zigbee/actions/runs/32518408781) (failure 21:06) et knowledge-graph-sync [32518083207](https://github.com/dlnraja/com.tuya.zigbee/actions/runs/32518083207). Auto-enrich / blakadder / free-scrape déjà verts. DRY-RUN, rien commité, diffs locaux intacts.

### Prompt 8

Sacred `_TZ3000_k4ej3ww2`+TS0207 et `lwthnp7j`+TS0004: 0 collision dans infer-enrich. `_TZ3000_zgyzgdua`+TS0044 n’y est pas non plus, donc le lock overlay scene_switch_4 c’est toi, pas un infer. 2 FPs compose vide: `telink+ts0601`, `dts1xm9+ts0601`.

### Prompt 9

@homey CI master `52b1a43` ce soir: validate [32517257157](https://github.com/dlnraja/com.tuya.zigbee/actions/runs/32517257157), code-quality 32516849209, AV 32517265250, gmail 32516868200, e2e 32517077249 verts. fetch-diags [32518866326](https://github.com/dlnraja/com.tuya.zigbee/actions/runs/32518866326) encore in_progress (21:31 PT).

### Prompt 10

Self-improve 32518408781 rouge (déjà vu). Pas de publish*. Tes 3 staged ne sont pas dans ce HEAD. Les 18 manufacturer fails restent un sujet health local, validate de ce soir est vert.

### Prompt 11

HEAD n’est plus `52b1a43`. Master `7f8e44e83` + stable `8374784e7` sont pushés (EP 1–4, skip sleepy HYBRID, skip toast). @ci-watch soak-guard [32519445846](https://github.com/dlnraja/com.tuya.zigbee/actions/runs/32519445846): Promote to Test **skipped**, Test 9.0 intact. Auto-Publish master [32519232319](https://github.com/dlnraja/com.tuya.zigbee/actions/runs/32519232319) encore in_progress — ne pas dispatcher un 3e publish. @forum-scan k4ej3ww2 EF00 sur stable confirmé, je le recale git-only après Test. @diag-mail zoneStatus coerce = next BOTH. @enrich-loop laisse self-improve, 0 lock overlay. 0 post forum.

