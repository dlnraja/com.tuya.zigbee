#!/usr/bin/env node

console.log('🚀 PUSH SIMPLE VERS GITHUB v3.4.1...');

const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

async function simplePush() {
  try {
    // Vérifier le statut Git
    console.log('🔍 Vérification du statut Git...');
    execSync('git status', { stdio: 'inherit' });

    // Ajouter tous les fichiers
    console.log('📁 Ajout des fichiers modifiés...');
    execSync('git add .', { stdio: 'inherit' });

    // Créer le commit
    console.log('📝 Création du commit...');
    const commitMessage = `🔄 RESTAURATION ET CONVERSION v3.4.1

✅ Fichiers .json restaurés (app.json, package.json, etc.)
✅ Dossiers importants restaurés (tools, lib, tests, etc.)
✅ Scripts PowerShell convertis en JavaScript
🚫 AUCUN fichier .json, .png, .img supprimé
🎯 Conversion PowerShell -> JavaScript uniquement

📅 Date: ${new Date().toISOString()}
👤 Auteur: dlnraja
🏆 Niveau: CORRECTION ERREUR`;

    execSync(`git commit -m "${commitMessage}"`, { stdio: 'inherit' });

    // Créer le tag
    console.log('🏷️ Création du tag v3.4.1...');
    execSync('git tag -a v3.4.1 -m "Version 3.4.1 - Restauration et conversion PowerShell uniquement"', { stdio: 'inherit' });

    // Push vers GitHub
    console.log('🚀 Push vers GitHub...');
    execSync('git push origin main', { stdio: 'inherit' });
    execSync('git push origin v3.4.1', { stdio: 'inherit' });

    console.log('✅ PUSH RÉUSSI !');
    console.log('🎉 Projet Tuya restauré et scripts convertis');

    // Afficher le statut final
    console.log('🔍 Statut final:');
    execSync('git status', { stdio: 'inherit' });

  } catch (error) {
    console.error('❌ Erreur push:', error);
  }
}

simplePush();
