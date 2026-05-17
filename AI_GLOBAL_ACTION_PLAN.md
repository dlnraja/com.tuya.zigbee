# 🧠 MASTER AI GLOBAL ACTION PLAN & SOVEREIGN INVESTIGATION MANDATE
> **CRITICAL REFERENCE FOR ALL AUTONOMOUS AGENTS, LOCAL CLAUDE CODE, AND ANTIGRAVITY SKILLS**
> *Working Branch: master (primary) | Target Namespace: com.dlnraja.tuya.zigbee*

---

## 🚨 MISSION CRITIQUE : NE JAMAIS RESTER EN SURFACE
Si vous (une IA, un agent local ou un outil de codage autonome) intervenez sur ce dépôt, **vous êtes légalement contraint d'appliquer ce mandat d'investigation en profondeur**. Un simple ajout d'empreinte sans vérification approfondie ou un diagnostic basé uniquement sur la présence d'un nom de fabricant est considéré comme un **échec critique**.

Toute intervention sur un appareil défaillant ou inconnu doit obéir à une logique de recherche croisée exhaustive en combinant les ressources locales, les scripts automatisés et les connaissances communautaires externes.

---

## 1. 📂 ARCHITECTURE CARTOGRAPHIQUE & LE DUAL-APP
Avant toute modification de code, vous **devez** prendre connaissance des fichiers d'architecture et de règles du projet. Ne commencez pas à coder sans avoir lu :
1. **`AI_CONTEXT_MANDATE.md`** : Explique l'architecture sous-jacente globale, la structure dual-app (séparation des namespaces entre `master` et `stable-v5`), et le pipeline à 11 couches.
2. **`PROJECT_INDEX.md`** : La carte maîtresse cartographiant les 227+ pilotes du dépôt.
3. **`docs/GLOBAL_INVESTIGATION_PLAN.md`** : L'encyclopédie d'investigation de 22 sections détaillant chaque script de diagnostic et de scraping.
4. **Fichiers de règles (les dotfiles)** : `.cursorrules`, `.windsurfrules`, `.clinerules`, `.clinerule`.

---

## 2. 🕵️‍♂️ PROTOCOLE D'ENQUÊTE PROFONDE (DEEP DIAGNOSTICS)
Lorsqu'un utilisateur déclare un dysfonctionnement ou demande l'ajout d'un nouvel appareil :

### A. Règle absolue des Variantes multiples (`manufacturerName` × `productId`)
* **Ne présumez JAMAIS** qu'un nom de fabricant (`manufacturerName` ou `MFR`, ex: `_TZ3000_abc123`) est unique à un appareil.
* **Un même `manufacturerName` peut être utilisé pour plus de 50 variantes d'appareils différentes** (interrupteur 1 gang, 2 gangs, variateur, vanne d'eau, etc.).
* **La clé unique est le COMBINÉ** : `manufacturerName` + `productId` (ex: `_TZ3000_abc123` + `TS0001` pour 1 gang et `_TZ3000_abc123` + `TS0002` pour 2 gangs).
* Ne retirez JAMAIS un `manufacturerName` d'un pilote existant sous prétexte qu'il apparaît ailleurs, sauf si la combinaison exacte `manufacturerName` + `productId` est associée à un pilote erroné (collision).

### B. Recherche croisée multi-sources (Cross-Referencing)
Pour toute anomalie ou intégration, vous devez croiser les informations à l'aide des scripts Node.js locaux prévus à cet effet pour **économiser vos tokens d'IA** et **éviter les plantages des navigateurs MCP** :
1. **Les Forums Homey** : Récupérez les messages, les images, les captures d'écran et les liens du fil de discussion communautaire via `node .github/scripts/forum-activity-scraper.js --topic 140352`.
2. **Les E-mails et Diagnostics de crash** : Scrappez les rapports d'erreur envoyés par les utilisateurs (Homey Diagnostics Report) via `node .github/scripts/fetch-gmail-diagnostics.js`.
3. **GitHub PRs & Issues (Y compris CLOSES)** : Scannez l'historique complet via `node .github/scripts/github-scanner.js`. Une issue fermée ou une ancienne conversation peut contenir la capture exacte d'un manuel utilisateur ou les Data Points (DP) originaux.
4. **Autres Projets Domotiques** : Vérifiez comment l'appareil est intégré par la concurrence open-source via `node scripts/automation/deep-crossref-scraper.js`. Vérifiez **Zigbee2MQTT (Z2M)** (tuya.ts), **ZHA** (Quirks Home Assistant), **Domoticz**, **Blakadder** et **Hubitat**.

---

## 3. 🛡️ DUAL-CONTEXT ENVIRONMENT GUARD (MANDATORY SEPARATION)
Il est **strictement obligatoire** de distinguer les différents environnements d'exécution du projet pour éviter toute pollution ou fuite de code d'automatisation dans l'application embarquée.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          UNIVERSAL TUYA PROJECT                          │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │
         ┌───────────────────────────┴───────────────────────────┐
         ▼                                                       ▼
 🏡 HOMEY RUNTIME CONTEXT                               💻 AUTOMATION CONTEXT
 (Runs on User's Homey Pro Hub)                         (IDE Agents & GitHub CI/CD)
 ├─ Size: Strict < 7MB (.homeyignore)                   ├─ Run: GitHub Actions / Dev PC
 ├─ Cloud: 100% Offline / Local                         ├─ Secrets: OpenAI, Google, GitHub PAT
 ├─ Keys: ZERO secrets/API keys                         ├─ Tasks: Scraping, Scaffolding, Triage
 └─ Specs: SDKv3, Drivers, Lib                          └─ Scripts: .github/scripts/, scripts/
```

### 🏡 A. CONTEXTE 1 : L'APPLICATION HOMEY (RUNTIME BOX)
* **Où cela s'exécute** : Physique, sur la box Homey Pro de l'utilisateur final.
* **Fichiers concernés** : Tout ce qui est dans `drivers/`, `lib/`, `assets/`, `app.json`, `app.js`.
* **Règles Strictes de l'App Runtime** :
  1. **ZÉRO Dépendance Cloud / API tierces** : Le runtime de l'application doit être 100% autonome et local.
  2. **ZÉRO Clé API ou Secrets** : N'écrivez jamais de clés d'API (OpenAI, Google, GitHub) dans les pilotes ou les librairies `lib/`. Ces secrets sont strictement réservés à la CI/CD.
  3. **Poids strict < 7 Mo** : Pour préserver la RAM des box Homey, le bundle final doit être minime. Tout dossier hors-jeu (`.github/`, `scripts/`, `docs/`, `.git/`, `tmp/`) doit être listé dans `.homeyignore` pour être exclu lors de l'exportation.
  4. **Compatibilité SDKv3 Pure** : Pas de code expérimental Node non supporté par la version cible de la box Homey Pro.

### 💻 B. CONTEXTE 2 : L'ÉCOSYSTÈME AUTOMATISATION (IDE & GITHUB ACTIONS)
* **Où cela s'exécute** : 
  * **IDE Local** : Sur votre ordinateur via des agents (Cursor, Windsurf, Claude Code Local) exécutant des commandes locales de test/validation.
  * **CI/CD GitHub** : Sur les machines virtuelles de GitHub Actions (via `.github/workflows/*.yml`).
* **Fichiers concernés** : `.github/workflows/`, `.github/scripts/`, `scripts/automation/`, `scripts/validation/`.
* **Règles Strictes d'Automatisation** :
  1. **Secrets & API Keys** : GitHub Actions gère l'orchestration des modèles (Google, OpenAI, DeepSeek, Mistral) via les secrets de dépôt (`GOOGLE_API_KEY`, `GH_PAT`, etc.).
  2. **Interdit d'embarquer** : Ne référencez JAMAIS de variables d'environnement secrètes ou des modules de scraping lourds (comme puppeteer ou axios pour les forums) dans le code de l'application Homey (`drivers/` ou `lib/`).
  3. **Commits et skips** : Toutes les écritures automatisées poussées sur GitHub doivent utiliser le tag `[skip ci]` dans le message de commit pour éviter les boucles infinies de builds.
  4. **Scraping autonome** : Utilisez toujours des scripts Node légers pour interroger Z2M ou les forums afin d'éviter la lourdeur des navigateurs headless (MCP Browsers) qui consomment trop de RAM et de tokens.

---

## 4. 🛠️ INTÉGRATION DES OUTILS "ANTIGRAVITY SKILLS" & CLAUDE CODE
* Ce projet intègre l'arsenal d'IA **Antigravity Skills** (`.agents/skills/` tel que `bug-hunter`, `codebase-audit`) et s'inspire directement du framework **Claude Code Local**.
* Utilisez ces outils et scripts d'auto-évaluation pour valider chaque ligne de code avant de soumettre vos modifications.
* Avant de commiter vos modifications, lancez obligatoirement le validateur récursif global :
  ```bash
  node scripts/validation/comprehensive-recursive-validator.js
  ```
  Celui-ci doit indiquer **0 erreurs critiques et 0 warnings**.

---

## 4. 🔄 LE BOUCLE D'ENRICHISSEMENT ET D'AMÉLIORATION CONTINUE
A chaque fois que vous découvrez une nouvelle logique d'appareil, un nouveau bug récurrent, ou une astuce d'intégration :
1. **Améliorez les workflows** : Mettez à jour les pipelines d'intégration (`nightly-auto-process.yml` et `driver-maintenance.yml`) pour y ajouter vos scripts de validation automatique.
2. **Mettez à jour les documentations et dotfiles** : Enrichissez `PROJECT_INDEX.md`, `AI_GLOBAL_ACTION_PLAN.md` et les fichiers de règles (`.cursorrules`, etc.) avec vos conclusions pour guider le prochain agent IA.
3. **Créez des scripts de prévention** : Si vous corrigez un bug de structure (comme le mauvais usage de `BatteryMixin` ou un mauvais type de backlight), créez ou mettez à jour un script JS dans `scripts/automation/` pour vérifier que ce bug ne réapparaisse plus jamais lors des futurs commits (Garde-fou permanent).

---

## 🚀 ÉTAPES D'EXÉCUTION IMMÉDIATES À CHAQUE ENTRÉE SUR LE DÉPÔT
1. **Étape 1** : Lisez `AI_CONTEXT_MANDATE.md` pour le contexte architectural et `PROJECT_INDEX.md` pour la cartographie.
2. **Étape 2** : Lisez ce fichier `AI_GLOBAL_ACTION_PLAN.md` pour le plan de vol.
3. **Étape 3** : Lancez le scanneur d'issues et de PRs local :
   ```bash
   node .github/scripts/scan-prs-issues.js
   ```
4. **Étape 4** : Pour l'appareil ou l'issue cible, exécutez le scraper universel pour agréger toutes les sources (Z2M, forums, e-mails, variantes) d'un seul coup et sans consommer de tokens :
   ```bash
   node scripts/automation/deep-crossref-scraper.js --mfr="NOM_MFR" --pid="PRODUCT_ID"
   ```
5. **Étape 5** : Implémentez la correction dans le pilote adéquat en utilisant les classes de base SDK3 durcies (V8.0 `BaseUnifiedDevice` ou `UnifiedSwitchBase`).
6. **Étape 6** : Validez avec `comprehensive-recursive-validator.js` et `npx homey app validate`.
7. **Étape 7** : Enrichissez la documentation et les workflows, puis clôturez l'issue GitHub de manière autonome.

*Document souverain rédigé et appliqué dans le cadre de la mission Zéro-Défaut.*
