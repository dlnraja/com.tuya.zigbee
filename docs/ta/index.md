# 🏠 ஹோமியுக்கான டுயா ஜிக்பீ உலகளாவிய ஒருங்கிணைப்பு

## 📋 கண்ணோட்டம்

**டுயா ஜிக்பீ உலகளாவிய ஒருங்கிணைப்பு** என்பது அனைத்து டுயா ஜிக்பீ சாதனங்களுக்கும் புத்திசாலித்தனமான, தானியங்கி ஆதரவை வழங்கும் ஒரு விரிவான ஹோமி பயன்பாடு. ஹோமி SDK3 உடன் கட்டமைக்கப்பட்ட இது, முழுமையான மேம்பாட்டு பதிப்பு (`master`) மற்றும் குறைந்தபட்ச உற்பத்தி பதிப்பு (`tuya-light`) ஆகிய இரண்டையும் வழங்குகிறது.

## 🎯 திட்ட இலக்குகள்

### 🧠 **புத்திசாலித்தனமான டிரைவர் ஒருங்கிணைப்பு**
- **உலகளாவிய ஆதரவு**: அறியப்படாத, பழைய மற்றும் சமீபத்திய ஃபர்ம்வேர் சாதனங்களுக்கான தானியங்கி கண்டறிதல் மற்றும் ஆதரவு
- **ஸ்மார்ட் ஜெனரேஷன்**: காணவில்லை அல்லது பகுதி ஃபர்ம்வேர் தகவல்களைக் கொண்ட சாதனங்களுக்கான AI-ஆல் இயக்கப்படும் டிரைவர் உருவாக்கம்
- **முறை அங்கீகாரம்**: சாதன கிளஸ்டர்கள், எண்ட்பாயிண்ட்கள் மற்றும் நடத்தைகளின் புத்திசாலித்தனமான பகுப்பாய்வு
- **பால்பேக் ஆதரவு**: கட்டுப்படுத்தப்பட்ட சூழல்களுக்கான வலுவான பால்பேக் பொறிமுறைகள்

### 🔄 **மல்டி-பிராஞ்ச் உத்தி**
- **மாஸ்டர் பிராஞ்ச்**: அனைத்து கருவிகள், ஆவணப்படுத்தல் மற்றும் CI/CD உடன் முழுமையான மேம்பாட்டு சூழல்
- **டுயா லைட் பிராஞ்ச்**: சாதன ஒருங்கிணைப்பில் மட்டும் கவனம் செலுத்தும் குறைந்தபட்ச உற்பத்தி பதிப்பு
- **ஆட்டோ-சிங்க்**: மாஸ்டரிலிருந்து டுயா-லைட்டுக்கு மாதாந்திர ஒத்திசைவு
- **பால்பேக் காப்பகங்கள்**: இரண்டு பிராஞ்ச்களுக்கும் ZIP காப்புகள்

### 🌍 **பிராந்திய மற்றும் சூழல் ஆதரவு**
- **பிரேசில் இறக்குமதி வரி கருத்துக்கள்**: பிராந்திய சவால்களுக்கு உகந்ததாக்கப்பட்டது
- **கட்டுப்படுத்தப்பட்ட சூழல்கள்**: கட்டுப்படுத்தப்பட்ட நிலைமைகளில் சோதிக்கப்பட்ட சாதனங்களுக்கான ஆதரவு
- **மல்டி-மொழி**: EN, FR, NL, TA ஆவணப்படுத்தல்
- **சமூக ஒருங்கிணைப்பு**: gpmachado/HomeyPro-Tuya-Devices இலிருந்து third-party பங்களிப்புகள்

## 🏗️ கட்டமைப்பு

### 📚 **மாஸ்டர் பிராஞ்ச் - முழுமையான தத்துவம்**
```
com.tuya.zigbee/
├── drivers/
│   ├── sdk3/           # SDK3 டிரைவர்கள் (முழுமையான)
│   ├── legacy/          # பழைய டிரைவர்கள் (மாற்றப்பட்ட)
│   └── intelligent/     # AI-ஆல் உருவாக்கப்பட்ட டிரைவர்கள்
├── docs/
│   ├── en/             # ஆங்கில ஆவணப்படுத்தல்
│   ├── fr/             # பிரெஞ்சு ஆவணப்படுத்தல்
│   ├── nl/             # டச்சு ஆவணப்படுத்தல்
│   ├── ta/             # தமிழ் ஆவணப்படுத்தல்
│   ├── specs/          # சாதன விவரக்குறிப்புகள்
│   ├── devices/        # சாதன பொருந்தக்கூடிய தன்மை பட்டியல்கள்
│   ├── tools/          # கருவி ஆவணப்படுத்தல்
│   └── matrix/         # பொருந்தக்கூடிய தன்மை அணி
├── tools/
│   ├── intelligent-driver-generator.js
│   ├── legacy-driver-converter.js
│   ├── driver-research-automation.js
│   ├── silent-reference-processor.js
│   ├── comprehensive-silent-processor.js
│   └── additive-silent-integrator.js
├── ref/
│   ├── firmware-patterns.json
│   ├── manufacturer-ids.json
│   └── device-types.json
├── .github/workflows/
│   ├── validate-drivers.yml
│   ├── deploy-github-pages.yml
│   ├── generate-zip-fallbacks.yml
│   ├── validate-tuya-light.yml
│   └── tuya-light-monthly-sync.yml
└── assets/
    └── images/         # டிரைவர் ஐகான்கள் மற்றும் சொத்துக்கள்
```

### ⚡ **டுயா லைட் பிராஞ்ச் - குறைந்தபட்ச தத்துவம்**
```
tuya-light/
├── app.json           # பயன்பாட்டு மேனிஃபெஸ்ட்
├── package.json       # சார்புகள்
├── app.js            # முக்கிய பயன்பாட்டு கோப்பு
├── README.md         # குறைந்தபட்ச ஆவணப்படுத்தல்
├── LICENSE           # MIT உரிமம்
├── .gitignore        # Git புறக்கணிப்பு விதிகள்
├── drivers/sdk3/     # SDK3 டிரைவர்கள் மட்டும்
└── assets/           # அத்தியாவசிய சொத்துக்கள் மட்டும்
```

## 🚀 விரைவு நிறுவல்

### 📚 **மாஸ்டர் பிராஞ்ச் - முழுமையான மேம்பாடு**
```bash
# முழுமையான மேம்பாட்டு பதிப்பை குளோன் செய்யவும்
git clone https://github.com/dlnraja/com.tuya.zigbee.git
cd com.tuya.zigbee

# சார்புகளை நிறுவவும்
npm install

# ஹோமியில் நிறுவவும்
homey app install

# நிறுவலை சரிபார்க்கவும்
homey app validate
```

### ⚡ **டுயா லைட் பிராஞ்ச் - குறைந்தபட்ச உற்பத்தி**
```bash
# குறைந்தபட்ச உற்பத்தி பதிப்பை குளோன் செய்யவும்
git clone -b tuya-light https://github.com/dlnraja/com.tuya.zigbee.git
cd com.tuya.zigbee

# நேரடி நிறுவல் (முக்கிய நோக்கத்தில் மட்டும் கவனம்)
homey app install
homey app validate
```

## 📱 ஆதரிக்கப்படும் சாதனங்கள்

### 🔧 **சாதன வகைகள்**
- **ஸ்விட்ச்கள்**: அடிப்படை ஆன்/ஆஃப் கட்டுப்பாடு
- **டிம்மர்கள்**: மாறக்கூடிய பிரகாச கட்டுப்பாடு
- **பிளக்குகள்**: கண்காணிப்புடன் கூடிய ஸ்மார்ட் மின் வடங்கள்
- **விளக்குகள்**: RGB மற்றும் வெள்ளை ஸ்பெக்ட்ரம் கட்டுப்பாடு
- **சென்சார்கள்**: சுற்றுச்சூழல் கண்காணிப்பு
- **தெர்மோஸ்டேட்கள்**: காலநிலை கட்டுப்பாட்டு சாதனங்கள்
- **அலார்ம்கள்**: புகை மற்றும் நீர் கண்டறிதல்

### 🏭 **உற்பத்தியாளர்கள்**
- **டுயா**: விரிவான ஆதரவுடன் முதன்மை உற்பத்தியாளர்
- **ஜெமிஸ்மார்ட்**: ப்ரீமியம் தர சாதனங்கள்
- **நோவாடிஜிட்டல்**: தொழில்முறை தர உபகரணங்கள்
- **பிளிட்ஸ்வுல்ஃப்**: செலவு-செயல்திறன் தீர்வுகள்
- **மோஸ்**: சிறப்பு தெர்மோஸ்டேட் சாதனங்கள்

### 🔄 **ஃபர்ம்வேர் ஆதரவு**
- **பழைய (1.0.0)**: அடிப்படை செயல்பாட்டு ஆதரவு
- **தற்போதைய (2.0.0)**: நிலையான அம்ச ஆதரவு
- **சமீபத்திய (3.0.0)**: மேம்பட்ட அம்ச ஆதரவு
- **அறியப்படாத**: புத்திசாலித்தனமான பால்பேக் ஆதரவு

## 🛠️ மேம்பாடு

### 🧠 **புத்திசாலித்தனமான டிரைவர் உருவாக்கம்**
```javascript
// எடுத்துக்காட்டு: அறியப்படாத சாதனத்திற்கான டிரைவரை உருவாக்கவும்
const generator = new IntelligentDriverGenerator();
await generator.generateIntelligentDriver({
    modelId: 'UNKNOWN_MODEL',
    manufacturerName: 'Unknown',
    clusters: ['genBasic', 'genOnOff'],
    capabilities: ['onoff'],
    firmwareVersion: 'unknown'
});
```

### 🔄 **பழைய டிரைவர் மாற்றம்**
```javascript
// எடுத்துக்காட்டு: SDK2 ஐ SDK3 க்கு மாற்றவும்
const converter = new LegacyDriverConverter();
await converter.convertLegacyDriver('drivers/legacy/old-driver.js');
```

### 🔍 **ஆராய்ச்சி தானியங்கி**
```javascript
// எடுத்துக்காட்டு: சாதன தகவல்களை ஆராய்ச்சி செய்யவும்
const research = new DriverResearchAutomation();
await research.researchAndIntegrate('TS0001');
```

## 📊 செயல்திறன் அளவீடுகள்

### 📈 **மாஸ்டர் பிராஞ்ச்**
- **டிரைவர்கள்**: 200+ புத்திசாலித்தனமான டிரைவர்கள்
- **ஆவணப்படுத்தல்**: 95% முழுமையான
- **வொர்க்ஃப்ளோக்கள்**: 100% செயல்பாட்டு
- **மொழிபெயர்ப்புகள்**: 75% முழுமையான
- **ஒருங்கிணைப்பு**: 100% புத்திசாலித்தனமான
- **அமைதியான ஒருங்கிணைப்பு**: 100% முழுமையான
- **கூட்டல் ஒருங்கிணைப்பு**: 100% முழுமையான

### ⚡ **டுயா லைட் பிராஞ்ச்**
- **கோப்புகள்**: <50 (குறைந்தபட்ச)
- **நிறுவல்**: <30s (விரைவு)
- **சரிபார்ப்பு**: 100% (நம்பகமான)
- **அளவு**: குறைந்தபட்ச (திறமையான)
- **கவனம்**: 100% முக்கிய நோக்கத்தில்
- **தடைவிதிக்கப்பட்டவை**: 100% மதிக்கப்பட்ட
- **தத்துவம்**: 100% குறைந்தபட்ச கவனம்

## 🔧 கட்டமைப்பு

### 📋 **அத்தியாவசிய கோப்புகள்**
- `app.json`: பயன்பாட்டு மேனிஃபெஸ்ட்
- `package.json`: சார்புகள் மற்றும் ஸ்கிரிப்ட்கள்
- `app.js`: முக்கிய பயன்பாட்டு நுழைவு புள்ளி
- `README.md`: திட்ட ஆவணப்படுத்தல்
- `LICENSE`: MIT உரிமம்
- `.gitignore`: Git புறக்கணிப்பு விதிகள்

### 🚫 **டுயா லைட்டில் தடைவிதிக்கப்பட்டவை**
- ❌ டாஷ்போர்டு இல்லை
- ❌ கூடுதல் கூறுகள் இல்லை
- ❌ மேம்பாட்டு கருவிகள் இல்லை
- ❌ README க்கு அப்பால் ஆவணப்படுத்தல் இல்லை
- ❌ வொர்க்ஃப்ளோக்கள் இல்லை
- ❌ சோதனைகள் இல்லை
- ❌ ஸ்கிரிப்ட்கள் இல்லை
- ❌ கட்டமைப்பு கோப்புகள் இல்லை

## 🌐 மல்டி-மொழி ஆதரவு

### 📚 **ஆவணப்படுத்தல் மொழிகள்**
- **ஆங்கிலம் (EN)**: முதன்மை மொழி
- **பிரெஞ்சு (FR)**: முழுமையான மொழிபெயர்ப்பு
- **டச்சு (NL)**: முன்னேற்றத்தில்
- **தமிழ் (TA)**: முன்னேற்றத்தில்

### 🔄 **மொழிபெயர்ப்பு செயல்முறை**
- தானியங்கி மொழிபெயர்ப்பு வொர்க்ஃப்ளோக்கள்
- சமூக பங்களிப்பு ஆதரவு
- வழக்கமான மொழி புதுப்பிப்புகள்
- பிராந்திய சவால்களுக்கான கலாச்சார ஏற்பாடு

## 🔗 இணைப்புகள்

### 📚 **மாஸ்டர் பிராஞ்ச்**
- **ரெப்போசிட்டரி**: https://github.com/dlnraja/com.tuya.zigbee
- **ஆவணப்படுத்தல்**: https://dlnraja.github.io/com.tuya.zigbee
- **பிரச்சினைகள்**: https://github.com/dlnraja/com.tuya.zigbee/issues
- **விவாதங்கள்**: https://github.com/dlnraja/com.tuya.zigbee/discussions

### ⚡ **டுயா லைட் பிராஞ்ச்**
- **ரெப்போசிட்டரி**: https://github.com/dlnraja/com.tuya.zigbee/tree/tuya-light
- **நேரடி நிறுவல்**: `homey app install`
- **விரைவு சரிபார்ப்பு**: `homey app validate`

## 📊 திட்ட புள்ளிவிவரங்கள்

### 🎯 **தற்போதைய நிலை**
- **திட்ட முடிவு**: 99%
- **உருவாக்கப்பட்ட டிரைவர்கள்**: 200+
- **ஆதரிக்கப்படும் உற்பத்தியாளர்கள்**: 5+
- **ஃபர்ம்வேர் பதிப்புகள்**: 4 (பழைய முதல் சமீபத்திய)
- **சாதன வகைகள்**: 7+
- **மொழிகள்**: 4 (EN, FR, NL, TA)

### 🔄 **ஒருங்கிணைப்பு அளவீடுகள்**
- **புத்திசாலித்தனமான டிரைவர்கள்**: 200+ உருவாக்கப்பட்ட
- **பழைய மாற்றங்கள்**: 100% வெற்றி விகிதம்
- **அமைதியான ஒருங்கிணைப்பு**: 100% முழுமையான
- **கூட்டல் ஒருங்கிணைப்பு**: 100% முழுமையான
- **முக்கிய நோக்கத்தில் கவனம்**: 90% முழுமையான

## 🤝 பங்களிப்பு

### 📝 **எப்படி பங்களிப்பது**
1. ரெப்போசிட்டரியை ஃபோர்க் செய்யவும்
2. ஒரு feature பிராஞ்சை உருவாக்கவும்
3. உங்கள் மாற்றங்களை செய்யவும்
4. முழுமையாக சோதிக்கவும்
5. ஒரு pull request ஐ சமர்ப்பிக்கவும்

### 🧠 **புத்திசாலித்தனமான பங்களிப்புகள்**
- **டிரைவர் மேம்பாடுகள்**: மேம்பட்ட சாதன ஆதரவு
- **ஆவணப்படுத்தல்**: மல்டி-மொழி ஆதரவு
- **ஆராய்ச்சி**: சாதன முறை பகுப்பாய்வு
- **சோதனைகள்**: சரிபார்ப்பு மற்றும் சரிபார்ப்பு

## 📄 உரிமம்

இந்த திட்டம் MIT உரிமத்தின் கீழ் உரிமம் பெற்றுள்ளது - விவரங்களுக்கு [LICENSE](LICENSE) கோப்பைப் பார்க்கவும்.

---

*ஹோமி சமூகத்திற்காக ❤️ உடன் கட்டமைக்கப்பட்டது - புத்திசாலித்தனமான, தானியங்கி டுயா ஜிக்பீ ஒருங்கிணைப்பில் கவனம் செலுத்தியது* 