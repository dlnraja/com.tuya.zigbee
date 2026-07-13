#!/bin/bash
# scripts/validate-v5.sh
# Validation complète de stable-v5 (Zero-Defect Quality Gate)

echo "🛡️  DÉMARRAGE DE LA VALIDATION COMPLÈTE STABLE-V5..."
echo "====================================================="

# 1. Validation de la syntaxe JS
echo "🔍 1. Vérification de la syntaxe de tous les fichiers .js..."
node scripts/ci/STRICT_SYNTAX_GUARD.js
if [ $? -ne 0 ]; then
  echo "❌ Erreur de syntaxe JS détectée ! Arrêt."
  exit 1
fi
echo "✅ Syntaxe JS valide."

# 2. Exécution des tests unitaires
echo "🔍 2. Exécution des tests unitaires..."
node --test test/critical/manufacturerResolver.test.js
if [ $? -ne 0 ]; then
  echo "❌ Échec des tests unitaires !"
  exit 1
fi
echo "✅ Tests unitaires validés."

# 3. Validation de l'application Homey
echo "🔍 3. Exécution de la validation Homey (publish)..."
npx homey app validate --level publish
if [ $? -ne 0 ]; then
  echo "❌ Échec de la validation Homey !"
  exit 1
fi
echo "✅ Validation Homey réussie."

echo "====================================================="
echo "🎉 TOUS LES GATES SONT VALIDES ! STABLE-V5 EST PRÊTE."
