import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sourcesPath = path.join(__dirname, '../data/sources.csv');
const cacheDir = path.join(__dirname, '../analysis/sources_cache');

// Créer le dossier de cache si inexistant
if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true });
}

// Lire le fichier sources.csv
const sources = fs.readFileSync(sourcesPath, 'utf8')
  .split('\n')
  .slice(1) // Ignorer l'en-tête
  .filter(line => line.trim() !== '')
  .map(line => {
    const [name, url, type, language, country] = line.split(',');
    return { name, url, type, language, country };
  });

// Fonction pour récupérer une source
async function fetchSource(source) {
  try {
    const response = await axios.get(source.url, {
      headers: {
        'User-Agent': 'Tuya Zigbee Project Fetcher'
      },
      timeout: 10000
    });
    
    const filename = `${source.name.replace(/\s+/g, '_')}_${Date.now()}.html`;
    const filePath = path.join(cacheDir, filename);
    
    fs.writeFileSync(filePath, response.data);
    console.log(`Saved: ${filename}`);
    
    return {
      ...source,
      status: 'success',
      filePath
    };
  } catch (error) {
    console.error(`Failed to fetch ${source.url}: ${error.message}`);
    return {
      ...source,
      status: 'failed',
      error: error.message
    };
  }
}

// Exécuter le fetching pour toutes les sources
async function run() {
  const results = [];
  
  for (const source of sources) {
    console.log(`Fetching ${source.name}...`);
    const result = await fetchSource(source);
    results.push(result);
    
    // Respecter les limites de taux
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Sauvegarder le rapport
  const reportPath = path.join(__dirname, '../analysis/sources_fetch_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`Rapport sauvegardé: ${reportPath}`);
}

run().catch(console.error);
