const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration de test
const TEST_URL = 'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/devices/tuya.js';
const OUTPUT_FILE = path.join(process.cwd(), 'test-output.txt');

async function testFetch() {
  console.log('Début du test de récupération...');
  
  try {
    console.log(`Tentative de récupération depuis: ${TEST_URL}`);
    const response = await axios.get(TEST_URL, {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/plain'
      }
    });
    
    console.log('Réponse reçue !');
    console.log(`Taille des données: ${response.data.length} caractères`);
    
    // Écrire les 1000 premiers caractères dans un fichier
    fs.writeFileSync(OUTPUT_FILE, response.data.substring(0, 1000));
    console.log(`Extrait des données enregistré dans: ${OUTPUT_FILE}`);
    
  } catch (error) {
    console.error('ERREUR lors de la récupération:');
    console.error('Message:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
    } else if (error.request) {
      console.error('Aucune réponse reçue');
    } else {
      console.error('Erreur de configuration:', error.message);
    }
  }
}

// Exécuter le test
testFetch().then(() => {
  console.log('Test terminé');});
