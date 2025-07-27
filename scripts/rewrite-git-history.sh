#!/bin/bash
# Script de réécriture d'historique Git

# Configuration
CORRECT_AUTHOR="dlnraja"
CORRECT_EMAIL="dylan.rajasekaram@gmail.com"
OLD_EMAIL="dylan.rajasekaram+myhomeyapp@gmail.com"

echo "Réécriture de l'historique Git..."

# Réécrire l'historique pour changer l'email
git filter-branch --env-filter '
if [ "" = "" ]
then
    export GIT_AUTHOR_EMAIL=""
    export GIT_AUTHOR_NAME=""
fi
if [ "" = "" ]
then
    export GIT_COMMITTER_EMAIL=""
    export GIT_COMMITTER_NAME=""
fi
' --tag-name-filter cat -- --branches --tags

echo "Historique Git réécrit avec succès!"

