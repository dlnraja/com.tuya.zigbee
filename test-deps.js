// Test des dépendances
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

console.log('=== Test des dépendances ===');

// Tester axios
try {
  console.log('1. Test de axios...');
  const response = await axios.get('https://httpbin.org/get');
  console.log('   ✅ axios fonctionne avec le statut:', response.status);
} catch (error) {
  console.error('   ❌ Erreur avec axios:', error.message);
}

// Tester uuid
try {
  console.log('2. Test de uuid...');
  const id = uuidv4();
  console.log('   ✅ UUID généré:', id);
  console.log('   ✅ Format UUID valide:', /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id));
} catch (error) {
  console.error('   ❌ Erreur avec uuid:', error.message);
}

console.log('=== Fin du test ===');
