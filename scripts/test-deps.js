// Test des dépendances essentielles
import fs from 'fs-extra';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import chalk from 'chalk';
import { glob } from 'glob';

console.log(chalk.blue('=== Test des dépendances ==='));

// Tester fs-extra
try {
  await fs.writeFile('test-file.txt', 'Test de fs-extra');
  console.log(chalk.green('✅ fs-extra fonctionne correctement'));
  await fs.remove('test-file.txt');
} catch (error) {
  console.error(chalk.red('❌ Erreur avec fs-extra:'), error.message);
}

// Tester axios
try {
  const response = await axios.get('https://httpbin.org/get');
  console.log(chalk.green('✅ axios fonctionne correctement'), `(status: ${response.status})`);
} catch (error) {
  console.error(chalk.red('❌ Erreur avec axios:'), error.message);
}

// Tester uuid
try {
  const id = uuidv4();
  console.log(chalk.green('✅ uuid fonctionne correctement'), `(généré: ${id})`);
} catch (error) {
  console.error(chalk.red('❌ Erreur avec uuid:'), error.message);
}

// Tester chalk
try {
  console.log(chalk.green('✅ chalk fonctionne correctement'), '(ce message est en vert)');
} catch (error) {
  console.error(chalk.red('❌ Erreur avec chalk:'), error.message);
}

// Tester glob
try {
  const files = await glob('**/*.js', { ignore: 'node_modules/**' });
  console.log(chalk.green(`✅ glob fonctionne correctement (${files.length} fichiers .js trouvés)`));
} catch (error) {
  console.error(chalk.red('❌ Erreur avec glob:'), error.message);
}

console.log(chalk.blue('=== Fin du test ==='));
