# Fil « Device Capabilities » — synthèse pour notre app

Source : https://community.homey.app/t/43287 (app Device Capabilities / Advanced Virtual Devices, auteur **Arie J. Godschalk**), 2261 posts lus du n°1 (19/02/2021) au dernier (10/10/2026) via l'API JSON Discourse. Réécrit, rien de copié. Contributeurs les plus actifs : Arie_J_Godschalk (891 posts), Peter_Kawa (283), Sharkys, SunBeech, DirkG, Le_Cactus.

## Ce que les utilisateurs viennent chercher (fréquence par mots-clés sur 2261 posts)
bugs/erreurs 244 · boutons 212 · icônes 201 · Insights 96 · cartes de flow 66 · energy 65 · « reflect » (recopier l'état d'un autre appareil) 64 · zones 45 · thermostat 36 · Google/Alexa/HomeKit 35.

## Idées utiles pour nous
1. **Les sous-capabilities n'ont pas de cartes de flow automatiques** (doc Athom) : les utilisateurs passent par DC pour en créer (#1206, #2024). → Nos drivers multi-voies doivent fournir leurs propres cartes par voie (vérifier la couverture `onoff.gangN`, `dim.N`).
2. **Une vraie `onoff` (pas une capability custom) est indispensable pour Google/Alexa/Matter** (#779, #1206). → Garder `onoff` principal sur chaque driver commandable.
3. **Energy sans compteur** : demande récurrente d'une conso « allumé / veille » calculée automatiquement (#1492-1497). → Homey le fait nativement via `energy.approximation.usageOn/usageOff` dans le manifeste : à ajouter (additif) sur les lampes/variateurs sans `measure_power`.
4. **Insights** : demande de pouvoir couper la création d'Insights sur les boutons poussoirs (#792). → `preventInsights` sur les `button.*` et capabilities techniques.
5. **Icônes** : nombreuses demandes d'icône par appareil (#199, #222). → Proposer un réglage d'icône n'est pas possible côté app, mais choisir la bonne `class` et des icônes de capabilities custom l'est.
6. **Mémoire** : DC a connu une croissance mémoire avec beaucoup de cartes de flow (#709, #1306) → même leçon que notre correctif du manifeste : pas de gros objets gardés en mémoire.
7. **Indisponibilité** : l'astuce des utilisateurs (#2162) est de relancer l'app depuis un flow quand un appareil est indisponible → notre tolérance « données reçues < 2 min = disponible » (radar #550) va dans le même sens.
8. **Nouvelles classes et capabilities Homey** : DC a ajouté toutes les nouvelles classes en août 2026 (#2210) ; tri des champs (#2276, 02/10/2026).
9. **Dépendance entre apps** : Better Logic Library a dû réécrire son démarrage car il bloquait d'autres apps (#2299).

## Proposé (pas encore implémenté, touche au manifeste — après le bisect master)
- `energy.approximation` sur les drivers lumière sans mesure ; `preventInsights` sur les boutons ; audit des cartes par voie des multi-gang.
