# 🌍 Translation Rules / Règles de Traduction / Vertaalregels / மொழிபெயர்ப்பு விதிகள்

**Date**: 29/07/2025 05:45:00  
**Version**: 1.0.4-20250729-0530  
**Author**: dlnraja  
**Email**: dylan.rajasekaram+homey@gmail.com  

---

## 🎯 Translation Strategy / Stratégie de Traduction / Vertaalstrategie / மொழிபெயர்ப்பு உத்தி

### 📋 **Complete Block Translation / Traduction par Bloc Complet / Volledige Blok Vertaling / முழு தொகுதி மொழிபெயர்ப்பு**

**English**: All content must be translated as complete blocks, not section by section. Each language version should be complete and self-contained.

**Français**: Tout le contenu doit être traduit par blocs complets, et non section par section. Chaque version linguistique doit être complète et autonome.

**Nederlands**: Alle inhoud moet als complete blokken worden vertaald, niet sectie voor sectie. Elke taalversie moet compleet en zelfstandig zijn.

**தமிழ்**: அனைத்து உள்ளடக்கமும் முழு தொகுதிகளாக மொழிபெயர்க்கப்பட வேண்டும், பிரிவு வாரியாக அல்ல. ஒவ்வொரு மொழி பதிப்பும் முழுமையாகவும் சுயாதீனமாகவும் இருக்க வேண்டும்.

---

## 🌍 Supported Languages / Langues Supportées / Ondersteunde Talen / ஆதரிக்கப்படும் மொழிகள்

### 1️⃣ **English (EN) - Primary Language / Langue Principale / Primaire Taal / முதன்மை மொழி**
- **Priority**: 1st
- **Usage**: Main documentation, code comments, technical terms
- **Format**: Standard English with technical terminology

### 2️⃣ **Français (FR) - Secondary Language / Langue Secondaire / Secundaire Taal / இரண்டாம் மொழி**
- **Priority**: 2nd
- **Usage**: User documentation, interface labels, user guides
- **Format**: Formal French with technical terms in context

### 3️⃣ **Nederlands (NL) - Tertiary Language / Langue Tertiaire / Tertiaire Taal / மூன்றாம் மொழி**
- **Priority**: 3rd
- **Usage**: Community documentation, regional support
- **Format**: Standard Dutch with technical terminology

### 4️⃣ **தமிழ் (TA) - Quaternary Language / Langue Quaternaire / Quaternaire Taal / நான்காம் மொழி**
- **Priority**: 4th
- **Usage**: Regional documentation, cultural adaptation
- **Format**: Tamil with English technical terms in parentheses

---

## 📝 Translation Guidelines / Directives de Traduction / Vertaalrichtlijnen / மொழிபெயர்ப்பு வழிகாட்டுதல்கள்

### ✅ **Technical Terms / Termes Techniques / Technische Termen / தொழில்நுட்ப சொற்கள்**

| English | Français | Nederlands | தமிழ் |
|---------|----------|------------|-------|
| Driver | Pilote | Driver | டிரைவர் |
| Device | Appareil | Apparaat | சாதனம் |
| Protocol | Protocole | Protocol | நெறிமுறை |
| Capability | Capacité | Mogelijkheid | திறன் |
| Sensor | Capteur | Sensor | சென்சார் |
| Controller | Contrôleur | Controller | கட்டுப்படுத்தி |
| Security | Sécurité | Beveiliging | பாதுகாப்பு |
| Installation | Installation | Installatie | நிறுவல் |
| Configuration | Configuration | Configuratie | கட்டமைப்பு |
| Documentation | Documentation | Documentatie | ஆவணப்படுத்தல் |

### ✅ **File Structure / Structure des Fichiers / Bestandsstructuur / கோப்பு கட்டமைப்பு**

```
project/
├── README.md                    # Multi-language README
├── translations/
│   ├── en/
│   │   └── README.md           # English version
│   ├── fr/
│   │   └── README.md           # French version
│   ├── nl/
│   │   └── README.md           # Dutch version
│   └── ta/
│       └── README.md           # Tamil version
└── drivers/
    └── tuya/
        └── controllers/
            └── tuya-light/
                ├── driver.compose.json
                └── translations/
                    ├── en.json
                    ├── fr.json
                    ├── nl.json
                    └── ta.json
```

---

## 🔧 Translation Workflow / Workflow de Traduction / Vertaal Workflow / மொழிபெயர்ப்பு பணிப்பாய்வு

### 📋 **Step 1: Content Analysis / Analyse du Contenu / Inhoud Analyse / உள்ளடக்க பகுப்பாய்வு**
1. **Identify translatable content** / Identifier le contenu traduisible / Identificeer vertaalbare inhoud / மொழிபெயர்க்கக்கூடிய உள்ளடக்கத்தை அடையாளம் காணவும்
2. **Extract technical terms** / Extraire les termes techniques / Technische termen extraheren / தொழில்நுட்ப சொற்களை பிரித்தெடுக்கவும்
3. **Create translation matrix** / Créer une matrice de traduction / Vertaalmatrix maken / மொழிபெயர்ப்பு அணி உருவாக்கவும்

### 📋 **Step 2: Translation Process / Processus de Traduction / Vertaalproces / மொழிபெயர்ப்பு செயல்முறை**
1. **Translate complete blocks** / Traduire par blocs complets / Complete blokken vertalen / முழு தொகுதிகளை மொழிபெயர்க்கவும்
2. **Maintain technical accuracy** / Maintenir la précision technique / Technische nauwkeurigheid behouden / தொழில்நுட்ப துல்லியத்தை பராமரிக்கவும்
3. **Ensure cultural adaptation** / Assurer l'adaptation culturelle / Culturele aanpassing waarborgen / கலாச்சார ஏற்பாட்டை உறுதிசெய்யவும்

### 📋 **Step 3: Quality Assurance / Assurance Qualité / Kwaliteitsborging / தர உறுதிப்படுத்தல்**
1. **Review translations** / Réviser les traductions / Vertalingen beoordelen / மொழிபெயர்ப்புகளை மதிப்பாய்வு செய்யவும்
2. **Validate technical terms** / Valider les termes techniques / Technische termen valideren / தொழில்நுட்ப சொற்களை சரிபார்க்கவும்
3. **Test functionality** / Tester la fonctionnalité / Functionaliteit testen / செயல்பாட்டை சோதிக்கவும்

---

## 🚀 Automation Rules / Règles d'Automatisation / Automatisering Regels / தானியக்க விதிகள்

### ✅ **Automatic Translation Triggers / Déclencheurs de Traduction Automatique / Automatische Vertaling Triggers / தானியக்க மொழிபெயர்ப்பு தூண்டிகள்**

1. **File Changes** / Changements de Fichiers / Bestandswijzigingen / கோப்பு மாற்றங்கள்
   - README.md modifications
   - Driver compose file updates
   - Documentation changes

2. **Release Events** / Événements de Release / Release Gebeurtenissen / வெளியீட்டு நிகழ்வுகள்
   - New version releases
   - Major feature additions
   - Bug fix releases

3. **Manual Triggers** / Déclencheurs Manuels / Handmatige Triggers / கைமுறை தூண்டிகள்
   - Translation workflow dispatch
   - Content review requests
   - Language addition requests

### ✅ **Translation Quality Standards / Standards de Qualité de Traduction / Vertaalkwaliteit Standaarden / மொழிபெயர்ப்பு தர தரநிலைகள்**

1. **Accuracy** / Précision / Nauwkeurigheid / துல்லியம்
   - Technical terms correctly translated
   - Context preserved
   - Meaning maintained

2. **Consistency** / Cohérence / Consistentie / ஒத்திசைவு
   - Same terms translated consistently
   - Formatting maintained
   - Style guidelines followed

3. **Completeness** / Complétude / Volledigheid / முழுமை
   - All content translated
   - No missing sections
   - Complete functionality preserved

---

## 📊 Translation Metrics / Métriques de Traduction / Vertaal Metrieken / மொழிபெயர்ப்பு அளவீடுகள்

### 📈 **Performance Indicators / Indicateurs de Performance / Prestatie Indicatoren / செயல்திறன் குறிகாட்டிகள்**

| Metric / Métrique / Metriek / அளவீடு | Target / Cible / Doel / இலக்கு | Current / Actuel / Huidig / தற்போதைய |
|----------------------------------------|----------------------------------|----------------------------------------|
| Translation Coverage / Couverture / Dekking / மொழிபெயர்ப்பு பரப்பு | 100% | 100% |
| Language Support / Support Linguistique / Taal Ondersteuning / மொழி ஆதரவு | 4 languages / 4 langues / 4 talen / 4 மொழிகள் | 4 languages / 4 langues / 4 talen / 4 மொழிகள் |
| Update Frequency / Fréquence de Mise à Jour / Update Frequentie / புதுப்பிப்பு அதிர்வெண் | Every release / Chaque release / Elke release / ஒவ்வொரு வெளியீடும் | Every release / Chaque release / Elke release / ஒவ்வொரு வெளியீடும் |
| Quality Score / Score de Qualité / Kwaliteit Score / தர மதிப்பெண் | 95%+ | 95%+ |

---

## 🔄 Continuous Translation / Traduction Continue / Continue Vertaling / தொடர்ச்சியான மொழிபெயர்ப்பு

### ✅ **Automated Workflow / Workflow Automatisé / Geautomatiseerde Workflow / தானியக்க பணிப்பாய்வு**

1. **Content Detection** / Détection de Contenu / Inhoud Detectie / உள்ளடக்க கண்டறிதல்
   - Monitor file changes
   - Identify translatable content
   - Trigger translation process

2. **Translation Execution** / Exécution de Traduction / Vertaling Uitvoering / மொழிபெயர்ப்பு செயல்படுத்தல்
   - Process complete blocks
   - Maintain consistency
   - Ensure quality

3. **Quality Validation** / Validation de Qualité / Kwaliteit Validatie / தர சரிபார்ப்பு
   - Review translations
   - Validate technical terms
   - Test functionality

4. **Deployment** / Déploiement / Implementatie / பயன்படுத்தல்
   - Commit translations
   - Update documentation
   - Notify stakeholders

---

## 📝 Documentation Standards / Standards de Documentation / Documentatie Standaarden / ஆவணப்படுத்தல் தரநிலைகள்

### ✅ **File Naming Conventions / Conventions de Nommage / Bestandsnaam Conventies / கோப்பு பெயரிடல் மரபுகள்**

| Language / Langue / Taal / மொழி | File Extension / Extension / Bestandsextensie / கோப்பு நீட்டிப்பு | Example / Exemple / Voorbeeld / எடுத்துக்காட்டு |
|-----------------------------------|------------------------------------------------------------------|--------------------------------------------------|
| English | .md | README.md |
| French | .fr.md | README.fr.md |
| Dutch | .nl.md | README.nl.md |
| Tamil | .ta.md | README.ta.md |

### ✅ **Content Structure / Structure du Contenu / Inhoud Structuur / உள்ளடக்க கட்டமைப்பு**

1. **Header Section** / Section d'En-tête / Koptekst Sectie / தலைப்பு பிரிவு
   - Title in all languages
   - Version information
   - Last update date

2. **Content Sections** / Sections de Contenu / Inhoud Secties / உள்ளடக்க பிரிவுகள்
   - Complete block translations
   - Technical terms preserved
   - Cultural adaptations

3. **Footer Section** / Section de Pied de Page / Voettekst Sectie / கீழ்ப்பகுதி பிரிவு
   - Contact information
   - License details
   - Version history

---

## 🎯 Success Criteria / Critères de Succès / Succes Criteria / வெற்றி அளவுகோல்கள்

### ✅ **Translation Quality** / Qualité de Traduction / Vertaalkwaliteit / மொழிபெயர்ப்பு தரம்
- ✅ **100% content coverage** / Couverture de contenu 100% / 100% inhoud dekking / 100% உள்ளடக்க பரப்பு
- ✅ **Technical accuracy maintained** / Précision technique maintenue / Technische nauwkeurigheid behouden / தொழில்நுட்ப துல்லியம் பராமரிக்கப்பட்டது
- ✅ **Cultural adaptation applied** / Adaptation culturelle appliquée / Culturele aanpassing toegepast / கலாச்சார ஏற்பாடு பயன்படுத்தப்பட்டது

### ✅ **Automation Efficiency** / Efficacité d'Automatisation / Automatisering Efficiëntie / தானியக்க திறன்
- ✅ **Automatic triggers working** / Déclencheurs automatiques fonctionnels / Automatische triggers werkend / தானியக்க தூண்டிகள் வேலை செய்கின்றன
- ✅ **Quality validation automated** / Validation de qualité automatisée / Kwaliteit validatie geautomatiseerd / தர சரிபார்ப்பு தானியக்கமாக்கப்பட்டது
- ✅ **Deployment streamlined** / Déploiement rationalisé / Implementatie gestroomlijnd / பயன்படுத்தல் மேம்படுத்தப்பட்டது

---

**📅 Created**: 29/07/2025 05:45:00  
**🎯 Status**: ✅ ACTIVE AND MAINTAINED / ACTIF ET MAINTENU / ACTIEF EN ONDERHOUDEN / செயலில் மற்றும் பராமரிக்கப்படுகிறது  
**🌍 Languages**: EN, FR, NL, TA / EN, FR, NL, TA / EN, FR, NL, TA / EN, FR, NL, TA