# 🌡️ Vision Temporo-Situationnelle — Tuya Unified Zigbee

> Où le projet se trouve-t-il dans son cycle de vie ? Quelle trajectoire ? Quelles priorités ?

---

## 📅 Axe Temporel — Cycle de Vie du Projet

### Timeline (6 ans : mai 2020 → juin 2026)

```
2020-05 ───● Démarrage ("First version", LCD Temp Sensor)
           │
2020-2024  │ Phase dormante (commits sporadiques)
           │ Total cumulé : ~50 commits en 4 ans
           │
2024-09 ───● Réveil (56 commits) — première activité soutenue
2025-01 ───● Croissance modérée (8-13 commits/mois)
           │
2025-10 ───● 💥 EXPLOSION (638 commits/mois)
2025-11 ───● 574 commits
2025-12 ───● 699 commits
2026-01 ───● 1312 commits (pic #1)
2026-02 ───● 776 commits
2026-03 ───● 694 commits
2026-04 ───● 1562 commits (PIC ABSOLU)
2026-05 ───● 1196 commits
2026-06 ───● 1025 commits (en cours)
           │
           ▼ AUJOURD'HUI (v9.0.40, 8729 commits, 285 tags)
```

**Diagnostic temporel** : le projet a connu une **croissance hyperbolique** sur 9 mois (oct 2025 → juin 2026), passant de ~50 à 8 729 commits. C'est typique d'un projet qui passe de "hobby" à "production à grande échelle" — avec les tensions inhérentes (dette technique accumulée vite).

---

## 🎯 Axe Situationnel — État Présent (snapshot)

### Forces ✅
| Domaine | État | Preuve |
|---------|------|--------|
| **Couverture matérielle** | Excellent | 429 drivers, 4 040+ fingerprints, 4 313 flow cards |
| **Documentation** | Très riche | 398 fichiers .md, 7 docs de règles, KNOWLEDGE_CACHE |
| **Gouvernance IA** | Structurée | 5 configs assistants (cursor/cline/windsurf/claude/core), 19 skills |
| **CI/CD** | Mature | 40 workflows, 99 scripts npm, auto-enrichissement |
| **Anti-régression** | Robuste | 11-Layer Quality Gateway, 242 règles CRITICAL_MISTAKES |
| **Tests (après investigation)** | En progrès | 29 tests (était 5) |

### Faiblesses ⚠️
| Domaine | État | Risque |
|---------|------|--------|
| **Dette non commitée** | 38 fichiers modifiés + 29 backups | Écrasement possible |
| **Coverage tests** | 29 tests / 536 fichiers lib/ (5%) | Régressions silencieuses |
| **Prolifération batterie** | 13 managers (1 canonique) | Confusion, duplication |
| **398 docs .md** | Surentretenu | Désynchronisation, infos obsolètes |
| **Fingerprints orphelins** | 59 restants | Devices non supportés |
| **app.json 4.9MB** | Monolithique | Build lent, OOM historique |

### Menaces externes 🌍
| Menace | Impact |
|--------|--------|
| Firmware Tuya instable | TS0601 time sync, battery 0% (non corrigeable) |
| Athom SDK évolution | Dépréciations API (getTriggerCard déjà vu) |
| Concurrence apps Tuya | JohanBendz fork, autres apps communautaires |

---

## 🚦 Matrice de Priorisation (Impact × Effort)

| # | Action | Impact | Effort | Priorité |
|---|--------|:------:|:------:|:--------:|
| 1 | **Committer le travail d'investigation** (38 fichiers) | 🔴 Élevé | 🟢 Faible | **P0** |
| 2 | **Nettoyer les 29 backups** (.backup-restore-*) | 🟡 Moyen | 🟢 Faible | **P0** |
| 3 | **Étendre tests** (objectif 50+, coverage mixins) | 🔴 Élevé | 🟡 Moyen | **P1** |
| 4 | **Intégrer LegacyButtonDetectionMixin** dans drivers boutons | 🔴 Élevé | 🟡 Moyen | **P1** |
| 5 | **Régénérer app.json** via `npm run build` | 🟡 Moyen | 🟢 Faible | **P1** |
| 6 | **Unifier managers batterie** → UnifiedBatteryHandler | 🟡 Moyen | 🔴 Élevé | **P2** |
| 7 | **Consolider 398 docs** (supprimer obsolètes) | 🟡 Moyen | 🟡 Moyen | **P2** |
| 8 | **59 fingerprints orphelins** restants | 🟢 Faible | 🟡 Moyen | **P3** |

---

## 📈 Trajectoire & Recommandation Stratégique

### Phase actuelle : "Croissance hyper-active → Consolidation nécessaire"

Le projet est sorti de sa phase d'explosion (oct 2025–juin 2026) où la priorité était la **couverture matérielle** (429 drivers). Il entre maintenant dans une phase de **consolidation** où les priorités doivent basculer vers :

1. **Stabilisation** : committer, nettoyer, tester
2. **Qualité** : unifier les doublons (batterie, docs)
3. **Maintenabilité** : réduire la surface de code (398 docs, 13 managers)

### Risque principal : "Surconsolidation"
Le commit TITAN V5 GOD-MODE (53234799d) illustre ce risque : vouloir trop consolérer supprime des features critiques (EventDeduplicationLayer, setupButtonDetection). **La consolidation doit être additive, pas destructive**.

---

## ✅ Plan d'Action Immédiat (exécutable maintenant)

### P0 — Sécurité (immédiat)
- [x] Investigation forensique terminée
- [x] EventDeduplicationLayer re-porté
- [x] 5 causes racines boutons corrigées
- [x] 87 fingerprints restaurés
- [ ] **Committer le travail** (38 fichiers en attente)
- [ ] **Nettoyer les 29 backups**

### P1 — Qualité (cette semaine)
- [ ] Étendre tests à 50+ (MultiGang, CapabilityManager)
- [ ] Intégrer LegacyButtonDetectionMixin dans button_wireless_*
- [ ] Régénérer app.json

### P2 — Maintenabilité (ce mois)
- [ ] Déprécier 12 managers batterie au profit d'UnifiedBatteryHandler
- [ ] Archiver les docs obsolètes (sur 398)
- [ ] Documenter la chaîne de mixins dans CORE_RULES

---

*Analyse générée le 2026-06-20 — projet en phase de consolidation post-croissance exponentielle.*
