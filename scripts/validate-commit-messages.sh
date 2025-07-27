# Script de validation des messages de commit
# Description: Vérifier que tous les messages de commit sont améliorés

echo "Validation des messages de commit..."

# Vérifier les messages avec l'ancien format
echo "Messages avec l'ancien format:"
git log --oneline | grep "\[Cursor\]" | head -10

echo ""
echo "Messages avec le nouveau format:"
git log --oneline | grep "\[YOLO\]" | head -10

echo ""
echo "Validation terminée!"

