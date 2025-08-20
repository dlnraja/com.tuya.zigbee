#!/usr/bin/env node
'use strict';

'use strict';

const https = require('https');
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const SOURCES_DIR = path.join(ROOT, 'scripts', 'sources');
const EXTERNAL_DIR = path.join(SOURCES_DIR, 'external');
const FORUMS_DIR = path.join(EXTERNAL_DIR, 'forums');
const REPORTS_DIR = path.join(EXTERNAL_DIR, 'reports');

// Sources de forums à analyser
const FORUM_SOURCES = {
    'homey-community': {
        url: 'https://community.homey.app',
        sections: [
            't/tuya/',
            't/zigbee/',
            't/drivers/',
            't/development/'
        ],
        keywords: ['tuya', 'zigbee', 'driver', 'device', 'compatibility']
    },
    'tuya-developer': {
        url: 'https://developer.tuya.com',
        sections: [
            'en/docs/iot/',
            'en/docs/zigbee/',
            'en/docs/device-management/'
        ],
        keywords: ['zigbee', 'protocol', 'cluster', 'device', 'fingerprint']
    },
    'zigbee-alliance': {
        url: 'https://zigbeealliance.org',
        sections: [
            'developers/',
            'specifications/',
            'certification/'
        ],
        keywords: ['tuya', 'device', 'certification', 'specification']
    }
};

// Fonction pour faire une requête HTTPS
function makeRequest(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        });
        req.on('error', reject);
        req.setTimeout(15000, () => req.destroy());
    });
}

// Fonction pour extraire les informations d'une page de forum
function extractForumInfo(html, keywords) {
    const content = html.toLowerCase();
    const foundKeywords = keywords.filter(keyword => content.includes(keyword.toLowerCase()));
    
    // Extraire les titres de sujets
    const topicMatches = html.match(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>/gi) || [];
    const topics = topicMatches.map(match => match.replace(/<[^>]+>/g, '').trim()).slice(0, 10);
    
    // Extraire les liens
    const linkMatches = html.match(/<a[^>]+href = "([^"]+)"[^>]*>([^<]+)<\/a>/gi) || [];
    const links = linkMatches.map(match => {
        const hrefMatch = match.match(/href = "([^"]+)"/);
        const textMatch = match.match(/>([^<]+)</);
        return {
            href: hrefMatch ? hrefMatch[1] : '',
            text: textMatch ? textMatch[1].trim() : ''
        };
    }).slice(0, 20);
    
    // Extraire les dates
    const dateMatches = html.match(/\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}/g) || [];
    const dates = [...new Set(dateMatches)].slice(0, 5);
    
    return {
        foundKeywords,
        topics: topics.filter(t => t.length > 10),
        links: links.filter(l => l.href && l.text.length > 5),
        dates: dates,
        contentLength: html.length
    };
}

// Fonction pour scraper un forum
async function scrapeForum(forumName, forumConfig) {
    console.log(`🔍 Scraping du forum: ${forumName}`);
    
    const results = {
        forum: forumName,
        url: forumConfig.url,
        sections: {},
        summary: {
            totalKeywordsFound: 0,
            totalTopics: 0,
            totalLinks: 0,
            totalErrors: 0
        }
    };
    
    for (const section of forumConfig.sections) {
        try {
            console.log(`  📂 Section: ${section}`);
            const fullUrl = `${forumConfig.url}/${section}`;
            
            const html = await makeRequest(fullUrl);
            const extractedInfo = extractForumInfo(html, forumConfig.keywords);
            
            results.sections[section] = {
                url: fullUrl,
                ...extractedInfo,
                scrapedAt: new Date().toISOString()
            };
            
            results.summary.totalKeywordsFound += extractedInfo.foundKeywords.length;
            results.summary.totalTopics += extractedInfo.topics.length;
            results.summary.totalLinks += extractedInfo.links.length;
            
            // Pause pour éviter d'être bloqué
            await new Promise(resolve => setTimeout(resolve, 2000));
            
        } catch (error) {
            console.log(`    ❌ Erreur pour la section ${section}:`, error.message);
            results.sections[section] = {
                url: `${forumConfig.url}/${section}`,
                error: error.message,
                scrapedAt: new Date().toISOString()
            };
            results.summary.totalErrors++;
        }
    }
    
    return results;
}

// Fonction pour scraper tous les forums
async function scrapeAllForums() {
    console.log('🚀 Début du scraping des forums...');
    
    const results = {};
    const startTime = Date.now();
    
    for (const [forumName, forumConfig] of Object.entries(FORUM_SOURCES)) {
        console.log(`\n📊 Traitement du forum: ${forumName}`);
        results[forumName] = await scrapeForum(forumName, forumConfig);
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Sauvegarder les résultats
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(REPORTS_DIR, `forum-scraping-${timestamp}.json`);
    
    const report = {
        timestamp: new Date().toISOString(),
        duration: `${duration}ms`,
        totalForums: Object.keys(results).length,
        results,
        summary: {
            totalKeywordsFound: Object.values(results).reduce((sum, forum) => 
                sum + forum.summary.totalKeywordsFound, 0),
            totalTopics: Object.values(results).reduce((sum, forum) => 
                sum + forum.summary.totalTopics, 0),
            totalLinks: Object.values(results).reduce((sum, forum) => 
                sum + forum.summary.totalLinks, 0),
            totalErrors: Object.values(results).reduce((sum, forum) => 
                sum + forum.summary.totalErrors, 0)
        }
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n✅ Rapport des forums sauvegardé: ${reportPath}`);
    
    return report;
}

// Fonction principale
async function main() {
    try {
        // Créer les dossiers nécessaires
        [SOURCES_DIR, EXTERNAL_DIR, FORUMS_DIR, REPORTS_DIR].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
        
        console.log('📁 Dossiers créés avec succès');
        
        // Lancer le scraping
        const report = await scrapeAllForums();
        
        console.log('\n🎉 Scraping des forums terminé avec succès !');
        console.log(`📊 Résumé: ${report.summary.totalForums} forums analysés`);
        console.log(`🔑 Mots-clés trouvés: ${report.summary.totalKeywordsFound}`);
        console.log(`📝 Sujets trouvés: ${report.summary.totalTopics}`);
        console.log(`🔗 Liens trouvés: ${report.summary.totalLinks}`);
        console.log(`❌ Erreurs: ${report.summary.totalErrors}`);
        console.log(`⏱️ Durée: ${report.duration}`);
        
    } catch (error) {
        console.error('❌ Erreur lors du scraping des forums:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { scrapeAllForums, scrapeForum };
