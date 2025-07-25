# Script de validation du renommage de l'application
# Description: Vérifier que le renommage a été effectué correctement

echo "Validation du renommage de l'application..."

# Vérifier app.json
if grep -q "universal.tuya.zigbee.device" app.json; then
    echo "app.json: Renommage valide"
else
    echo "app.json: Renommage manquant"
fi

# Vérifier package.json
if grep -q "universal.tuya.zigbee.device" package.json; then
    echo "package.json: Renommage valide"
else
    echo "package.json: Renommage manquant"
fi

# Vérifier README.md
if grep -q "Universal TUYA Zigbee Device" README.md; then
    echo "README.md: Renommage valide"
else
    echo "README.md: Renommage manquant"
fi

# Vérifier les fichiers de documentation
echo ""
echo "Verification des fichiers de documentation..."
find docs/ -name "*.md" -type f -exec grep -l "universal.tuya.zigbee.device" {} \; | wc -l | xargs echo "Fichiers de documentation mis a jour:"

# Vérifier les workflows
echo ""
echo "Verification des workflows..."
find .github/workflows/ -name "*.yml" -type f -exec grep -l "universal.tuya.zigbee.device" {} \; | wc -l | xargs echo "Workflows mis a jour:"

echo ""
echo "Validation du renommage terminee!"
