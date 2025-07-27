#!/bin/bash
# Script cross-platform de correction Git

# Configuration
CORRECT_AUTHOR="dlnraja"
CORRECT_EMAIL="dylan.rajasekaram@gmail.com"
OLD_EMAIL="dylan.rajasekaram+myhomeyapp@gmail.com"

echo "Correction des auteurs Git..."

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

echo "Système détecté: "

# Configuration Git
git config --global user.name ""
git config --global user.email ""

# Réécrire l'historique si nécessaire
if git log --author="" --oneline | head -1; then
    echo "Commits avec l'ancien email trouvés, réécriture en cours..."
    git filter-branch --env-filter "
        if [ \"\\" = \"\" ]
        then
            export GIT_AUTHOR_EMAIL=\"\"
            export GIT_AUTHOR_NAME=\"\"
        fi
        if [ \"\\" = \"\" ]
        then
            export GIT_COMMITTER_EMAIL=\"\"
            export GIT_COMMITTER_NAME=\"\"
        fi
    " --tag-name-filter cat -- --branches --tags
else
    echo "Aucun commit avec l'ancien email trouvé"
fi

echo "Correction terminée!"

