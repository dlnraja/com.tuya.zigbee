# 🧠 MEGA PROMPT CURSOR – COM.TUYA.ZIGBEE (EN MODE ENRICHISSEMENT SANS RÉGRESSION)

**💡 Objectif général :**
Reconstruire, enrichir et automatiser totalement le projet com.tuya.zigbee avec une approche IA, multilingue, modulaire, légère, documentée, et à jour avec les dernières specs Zigbee et SDK Homey.
**⚠️ Aucune perte fonctionnelle ne doit être introduite. Aucune dépendance à un serveur local ne doit être ajoutée.**

---

### ✅ TÂCHES À RÉALISER PAR CURSOR (interprétées comme des ordres immédiats)

#### 🧱 Refonte structurelle du repo
* Reorganiser tous les dossiers : drivers/, dashboard/, ef/, docs/, scripts/, .github/, 	est/, etc.
* Créer des liens symboliques si besoin pour compatibilité Homey CLI
* Nettoyer les fichiers inutiles (.bak, .log, .tmp, .old, archives, etc.)


#### 📁 README.md
* Corriger tous les liens internes et externes (dashboard, doc, workflows, clusters, benchmarks)
* Ajouter logos, icônes, badges CI/CD, version, taille, licence
* Présenter dans **les 3 langues** : 🇫🇷 Français, 🇬�� Anglais, 🇮🇳 Tamoul
* Intégrer automatiquement les informations du dashboard, changelog, KPIs, features IA

#### 📊 Dashboard enrichi

* Intégrer la matrice des devices, stats SDK3, graphiques KPIs, liens docs, changelog
* Générer un script auto de mise à jour (scripts/update-dashboard-auto.ps1)

#### 🔧 Scripts PowerShell
