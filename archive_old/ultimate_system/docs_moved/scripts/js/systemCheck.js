// Cross-platform Node.js port of scripts/system-check.bat
// Logs system diagnostics to system-check.log and prints a summary

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

const LOGFILE = path.resolve('system-check.log');
const TEMP_NODE_SCRIPT = path.resolve('test-node.js');

function log(msg = '') {
  fs.appendFileSync(LOGFILE, msg + os.EOL);
}

function section(title) {
  log('');
  log('=== ' + title + ' ===');
}

function nowStr() {
  return new Date().toISOString();
}

function print(msg) {
  console.log(msg);
}

function runCommand(cmd) {
  try {
    const out = execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { ok: true, out: out.trim() };
  } catch (e) {
    return { ok: false, err: e.message, out: (e.stdout || e.stderr || '').toString() };
  }
}

(function main() {
  fs.writeFileSync(LOGFILE, '=== Début du diagnostic système ===' + os.EOL);
  log('Date: ' + nowStr());
  log('');

  print('=== Vérification du système ===');
  print('Vérification du système...');

  section('Informations système');
  log(`OS: ${os.type()} ${os.release()} (${os.platform()} ${os.arch()})`);
  log(`Hostname: ${os.hostname()}`);
  log(`CPU: ${os.cpus()[0]?.model || 'Unknown'} (${os.cpus().length} cores)`);
  log(`Total RAM: ${(os.totalmem() / (1024**3)).toFixed(2)} GB`);

  section("Variables d'environnement");
  log(`PATH=${process.env.PATH || ''}`);

  // Node.js check
  print('Vérification de Node.js...');
  section('Node.js');
  const nodeVer = runCommand('node -v');
  if (nodeVer.ok) {
    log('Node.js version: ' + nodeVer.out);
    print(`✅ Node.js est installé (version: ${nodeVer.out})`);
  } else {
    log("❌ Node.js n'est pas installé ou n'est pas dans le PATH");
    print("❌ Node.js n'est pas installé ou n'est pas dans le PATH");
  }

  // npm check
  section('npm');
  const npmVer = runCommand('npm -v');
  if (npmVer.ok) {
    log('npm version: ' + npmVer.out);
    print(`✅ npm est installé (version: ${npmVer.out})`);
  } else {
    log("❌ npm n'est pas installé ou n'est pas dans le PATH");
    print("❌ npm n'est pas installé ou n'est pas dans le PATH");
  }

  // FS access
  section("Test d'accès au système de fichiers");
  print("Test d'accès au système de fichiers...");
  try {
    fs.writeFileSync('test-file.txt', 'Ceci est un test');
    if (fs.existsSync('test-file.txt')) {
      log('✅ Test d\'écriture réussi');
      print('✅ Test d\'écriture réussi');
      fs.unlinkSync('test-file.txt');
    } else {
      log("❌ Impossible d'écrire dans le répertoire courant");
      print("❌ Impossible d'écrire dans le répertoire courant");
    }
  } catch (e) {
    log("❌ Erreur d'écriture: " + e.message);
    print("❌ Erreur d'écriture: " + e.message);
  }

  // Node execution test
  section("Test d'exécution Node.js");
  print("Test d'exécution Node.js...");
  try {
    fs.writeFileSync(
      TEMP_NODE_SCRIPT,
      [
        "console.log('Test réussi!');",
        "console.log('Node.js version:', process.version);",
        "console.log('Répertoire:', process.cwd());",
      ].join(os.EOL)
    );
    const execRes = runCommand(`node "${TEMP_NODE_SCRIPT}"`);
    if (execRes.ok) {
      log(execRes.out);
      print('✅ Test d\'exécution Node.js réussi');
    } else {
      log('❌ Erreur lors de l\'exécution du script Node.js');
      log(execRes.err || execRes.out);
      print('❌ Erreur lors de l\'exécution du script Node.js');
    }
  } catch (e) {
    log('❌ Exception: ' + e.message);
    print('❌ Exception: ' + e.message);
  } finally {
    try { if (fs.existsSync(TEMP_NODE_SCRIPT)) fs.unlinkSync(TEMP_NODE_SCRIPT); } catch {}
  }

  log('');
  log('=== Fin du diagnostic ===');
  log('Date: ' + nowStr());

  print('');
  print('=== Résumé du diagnostic ===');
  try {
    const content = fs.readFileSync(LOGFILE, 'utf8');
    const lines = content.split(/\r?\n/).filter(l => l.startsWith('✅') || l.startsWith('❌'));
    lines.forEach(l => console.log(l));
  } catch {}
  print('');
  print('Le rapport complet a été enregistré dans: ' + LOGFILE);
})();
