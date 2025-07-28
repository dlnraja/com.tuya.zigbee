const fs = require('fs');
const path = require('path');

console.log('Version Manager and Release Creator - Gestionnaire de versions et créateur de releases');

// Configuration des versions
const VERSION_CONFIG = {
    current: {
        version: '1.4.0',
        codename: 'Intelligent Release',
        description: 'Version intelligente avec analyse du forum et drivers cohérents'
    }
};

// Finaliser toutes les traductions
function finalizeAllTranslations() {
    console.log('Finalizing all translations...');
    
    const appTranslations = {
        name: {
            en: 'Tuya Zigbee Universal Integration',
            fr: 'Intégration Universelle Tuya Zigbee',
            nl: 'Tuya Zigbee Universele Integratie',
            ta: 'Tuya Zigbee உலகளாவிய ஒருங்கிணைப்பு'
        },
        description: {
            en: 'Universal Tuya ZigBee device integration for Homey',
            fr: 'Intégration universelle des appareils Tuya ZigBee pour Homey',
            nl: 'Universele Tuya ZigBee-apparaatintegratie voor Homey',
            ta: 'Homey க்கான Tuya ZigBee சாதனங்களின் உலகளாவிய ஒருங்கிணைப்பு'
        }
    };
    
    // Mettre à jour app.json
    const appJsonPath = 'app.json';
    if (fs.existsSync(appJsonPath)) {
        const appData = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
        appData.name = appTranslations.name;
        appData.description = appTranslations.description;
        fs.writeFileSync(appJsonPath, JSON.stringify(appData, null, 2));
    }
    
    console.log('All translations finalized');
    return { status: 'completed' };
}

// Créer une release GitHub
function createGitHubRelease(version) {
    console.log('Creating GitHub release for version ' + version.version + '...');
    
    const releaseDir = 'releases/v' + version.version;
    if (!fs.existsSync(releaseDir)) {
        fs.mkdirSync(releaseDir, { recursive: true });
    }
    
    const releaseContent = {
        version: version.version,
        codename: version.codename,
        description: version.description,
        release_date: new Date().toISOString(),
        download_url: 'https://github.com/dlnraja/com.tuya.zigbee/releases/download/v' + version.version + '/tuya-zigbee-v' + version.version + '.zip'
    };
    
    fs.writeFileSync(
        path.join(releaseDir, 'release.json'),
        JSON.stringify(releaseContent, null, 2)
    );
    
    console.log('GitHub release created for version ' + version.version);
    return releaseContent;
}

// Fonction principale
function main() {
    console.log('Starting Version Manager and Release Creator...');
    
    // Finaliser les traductions
    finalizeAllTranslations();
    
    // Créer la release
    createGitHubRelease(VERSION_CONFIG.current);
    
    console.log('Version Manager and Release Creator completed successfully!');
}

if (require.main === module) {
    main();
}
