const fs = require('fs');
const path = require('path');

console.log('=== Test du script update-drivers.js ===');
console.log('Répertoire courant:', process.cwd());
console.log('Node.js version:', process.version);

// Créer un fichier de log
const logFile = path.join(process.cwd(), 'test-update.log');
console.log(`Journalisation dans: ${logFile}`);

// Rediriger la sortie standard et d'erreur vers un fichier
const logStream = fs.createWriteStream(logFile, { flags: 'w' });
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

console.log = function() {
  const message = Array.from(arguments).join(' ');
  logStream.write(`[LOG] ${message}\n`);
  originalConsoleLog.apply(console, arguments);
};

console.error = function() {
  const message = Array.from(arguments).join(' ');
  logStream.write(`[ERROR] ${message}\n`);
  originalConsoleError.apply(console, arguments);
};

// Fonction pour nettoyer et quitter
function cleanup(exitCode = 0) {
  console.log('Nettoyage...');
  logStream.end();
  process.exit(exitCode);
}

// Gestion des erreurs non capturées
process.on('uncaughtException', (error) => {
  console.error('ERREUR NON CAPTURÉE:', error);
  cleanup(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('REJET NON GÉRÉ:', reason);
  cleanup(1);
});

// Démarrer le test
async function runTest() {
  try {
    console.log('=== DÉBUT DU TEST ===');
    
    // Tester l'accès au fichier update-drivers.js
    const updateScriptPath = path.join(__dirname, 'update-drivers.js');
    console.log(`Vérification du fichier: ${updateScriptPath}`);
    
    if (!fs.existsSync(updateScriptPath)) {
      throw new Error('Le fichier update-drivers.js est introuvable');
    }
    
    console.log('Fichier trouvé, tentative de chargement...');
    
    // Charger le fichier de manière asynchrone
    const scriptContent = fs.readFileSync(updateScriptPath, 'utf8');
    console.log('Taille du fichier:', scriptContent.length, 'caractères');
    
    // Vérifier la syntaxe avec eval
    console.log('Vérification de la syntaxe...');
    try {
      const script = new Function('module', 'exports', 'require', scriptContent);
      console.log('Syntaxe valide');
    } catch (syntaxError) {
      console.error('ERREUR DE SYNTAXE DANS LE SCRIPT:');
      console.error(syntaxError);
      throw syntaxError;
    }
    
    // Tester l'exécution du script
    console.log('\n=== TEST D\'EXÉCUTION ===');
    const { spawn } = require('child_process');
    
    return new Promise((resolve, reject) => {
      const child = spawn('node', ['--trace-warnings', updateScriptPath], {
        stdio: ['inherit', 'pipe', 'pipe'],
        cwd: process.cwd(),
        env: process.env
      });
      
      child.stdout.on('data', (data) => {
        const output = data.toString().trim();
        console.log(`[SCRIPT] ${output}`);
      });
      
      child.stderr.on('data', (data) => {
        const error = data.toString().trim();
        console.error(`[SCRIPT-ERROR] ${error}`);
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          console.log(`Script terminé avec le code de sortie: ${code}`);
          resolve();
        } else {
          console.error(`Script échoué avec le code de sortie: ${code}`);
          reject(new Error(`Code de sortie: ${code}`));
        }
      });
    });
    
  } catch (error) {
    console.error('ERREUR LORS DU TEST:');
    console.error(error);
    throw error;
  } finally {
    console.log('=== FIN DU TEST ===');
    cleanup(0);
  }
}

// Démarrer le test
runTest().catch(() => {
  process.exit(1);
});
