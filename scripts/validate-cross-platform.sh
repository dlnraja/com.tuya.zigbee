# Script de validation cross-platform des auteurs Git
# Description: Vérifier que tous les commits ont le bon auteur sur tous les systèmes

echo "Validation cross-platform des auteurs Git..."

# Détecter le système d'exploitation
if [[ "" == "linux-gnu"* ]]; then
    OS="Linux"
elif [[ "" == "darwin"* ]]; then
    OS="macOS"
elif [[ "" == "msys" ]] || [[ "" == "cygwin" ]]; then
    OS="Windows"
else
    OS="Unknown"
fi

echo "Système: "

# Vérifier les commits avec l'ancien email
OLD_EMAIL="dylan.rajasekaram+myhomeyapp@gmail.com"
CORRECT_EMAIL="dylan.rajasekaram@gmail.com"
CORRECT_AUTHOR="dlnraja"

echo "Commits avec l'ancien email:"
git log --author="" --oneline

echo ""
echo "Commits avec le bon email:"
git log --author="" --oneline

echo ""
echo "Configuration Git actuelle:"
git config user.name
git config user.email

echo ""
echo "Validation cross-platform terminée!"
