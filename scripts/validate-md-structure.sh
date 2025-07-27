# Script de validation de la structure des fichiers Markdown
# Description: Vérifier que tous les fichiers MD sont correctement organisés

echo "Validation de la structure des fichiers Markdown..."

# Vérifier les dossiers
if [ -d "docs" ]; then
    echo "Dossier docs trouve"
else
    echo "Dossier docs manquant"
fi

if [ -d "docs/todo" ]; then
    echo "Dossier docs/todo trouve"
else
    echo "Dossier docs/todo manquant"
fi

if [ -d "docs/locales" ]; then
    echo "Dossier docs/locales trouve"
else
    echo "Dossier docs/locales manquant"
fi

# Vérifier les fichiers TODO
echo ""
echo "Fichiers TODO dans docs/todo/:"
ls -la docs/todo/ 2>/dev/null || echo "Aucun fichier TODO trouve"

# Vérifier les fichiers de locales
echo ""
echo "Fichiers de locales dans docs/locales/:"
ls -la docs/locales/ 2>/dev/null || echo "Aucun fichier de locale trouve"

# Vérifier l'index
if [ -f "docs/INDEX.md" ]; then
    echo "Index des fichiers trouve: docs/INDEX.md"
else
    echo "Index des fichiers manquant"
fi

echo ""
echo "Validation de la structure terminee!"

