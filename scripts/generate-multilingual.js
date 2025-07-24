const fs = require('fs');
const path = require('path');

const languages = ['en', 'fr', 'ta', 'nl', 'de', 'es', 'it', 'pt', 'pl', 'ru'];

function generateMultilingualDocs() {
    const templates = {
        'en': {
            title: 'Tuya Zigbee Project',
            description: 'Complete Homey integration for Tuya Zigbee devices',
            installation: 'Installation',
            configuration: 'Configuration',
            support: 'Support'
        },
        'fr': {
            title: 'Projet Tuya Zigbee',
            description: 'Intégration complète Homey pour les appareils Tuya Zigbee',
            installation: 'Installation',
            configuration: 'Configuration',
            support: 'Support'
        },
        'ta': {
            title: 'Tuya Zigbee திட்டம்',
            description: 'Tuya Zigbee சாதனங்களுக்கான முழுமையான Homey ஒருங்கிணைப்பு',
            installation: 'நிறுவல்',
            configuration: 'கட்டமைப்பு',
            support: 'ஆதரவு'
        },
        'nl': {
            title: 'Tuya Zigbee Project',
            description: 'Volledige Homey integratie voor Tuya Zigbee apparaten',
            installation: 'Installatie',
            configuration: 'Configuratie',
            support: 'Ondersteuning'
        },
        'de': {
            title: 'Tuya Zigbee Projekt',
            description: 'Vollständige Homey Integration für Tuya Zigbee Geräte',
            installation: 'Installation',
            configuration: 'Konfiguration',
            support: 'Support'
        },
        'es': {
            title: 'Proyecto Tuya Zigbee',
            description: 'Integración completa de Homey para dispositivos Tuya Zigbee',
            installation: 'Instalación',
            configuration: 'Configuración',
            support: 'Soporte'
        },
        'it': {
            title: 'Progetto Tuya Zigbee',
            description: 'Integrazione completa Homey per dispositivi Tuya Zigbee',
            installation: 'Installazione',
            configuration: 'Configurazione',
            support: 'Supporto'
        },
        'pt': {
            title: 'Projeto Tuya Zigbee',
            description: 'Integração completa Homey para dispositivos Tuya Zigbee',
            installation: 'Instalação',
            configuration: 'Configuração',
            support: 'Suporte'
        },
        'pl': {
            title: 'Projekt Tuya Zigbee',
            description: 'Kompletna integracja Homey dla urządzeń Tuya Zigbee',
            installation: 'Instalacja',
            configuration: 'Konfiguracja',
            support: 'Wsparcie'
        },
        'ru': {
            title: 'Проект Tuya Zigbee',
            description: 'Полная интеграция Homey для устройств Tuya Zigbee',
            installation: 'Установка',
            configuration: 'Конфигурация',
            support: 'Поддержка'
        }
    };
    
    languages.forEach(lang => {
        const langDir = path.join('docs', lang);
        if (!fs.existsSync(langDir)) {
            fs.mkdirSync(langDir, { recursive: true });
        }
        
        const template = templates[lang] || templates['en'];
        const readmeContent = `# ${template.title}

${template.description}

## ${template.installation}

## ${template.configuration}

## ${template.support}

`;
        
        fs.writeFileSync(path.join(langDir, 'README.md'), readmeContent);
        console.log(`✅ Generated documentation for ${lang}`);
    });
}

generateMultilingualDocs(); 