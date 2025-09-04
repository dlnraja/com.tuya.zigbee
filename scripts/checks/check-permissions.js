#!/usr/bin/env node
'use strict';

/**
 * 🔄 Script converti automatiquement
 * Original: PS1
 * Converti le: 2025-09-03T20:43:34.393Z
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 🔄 Script converti automatiquement de PS1 vers JavaScript
// ⚠️ Vérification manuelle recommandée

# Script de vérification des permissions PowerShell
console.log "=== Vérification des permissions PowerShell ===" -ForegroundColor Green

# 1. Vérifier la politique d'exécution actuelle
$executionPolicy = Get-ExecutionPolicy
console.log "`n1. Politique d'exécution actuelle: $executionPolicy"

# 2. Vérifier les permissions de l'utilisateur actuel
$currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
$isAdmin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
console.log "`n2. Utilisateur actuel: $($currentUser.Name)"
console.log "   Exécution en tant qu'administrateur: $isAdmin"

# 3. Vérifier les permissions du répertoire
$currentDir = Get-Location
console.log "`n3. Vérification des permissions du répertoire: $currentDir"

try {
    $acl = Get-Acl -Path $currentDir
    $access = $acl.Access | // Where-Object equivalent { $_.IdentityReference -eq $currentUser.Name }
    
    if ($access) {
        console.log "   Permissions pour $($currentUser.Name):"
        $access | // ForEach-Object equivalent {
            console.log "   - $($_.FileSystemRights)"
        }
    } else {
        console.log "   Aucune permission spécifique trouvée pour $($currentUser.Name)" -ForegroundColor Yellow
    }
} catch {
    console.log "   Erreur lors de la vérification des permissions: $_" -ForegroundColor Red
}

# 4. Tester l'exécution d'une commande simple
console.log "`n4. Test d'exécution de commande:"
try {
    $testFile = "$env:TEMP\test_permission_$(new Date() -Format 'yyyyMMdd_HHmmss').txt"
    "Test d'écriture: $(new Date() -Format 'yyyy-MM-dd HH:mm:ss')" | Out-File -FilePath $testFile -Encoding utf8 -Force
    
    if (fs.existsSync $testFile) {
        $content = fs.readFileSync -Path $testFile -Raw
        console.log "   Commande exécutée avec succès!" -ForegroundColor Green
        console.log "   Fichier créé: $testFile"
        console.log "   Contenu: $($content.Trim())"
        fs.rmSync -Path $testFile -Force -ErrorAction SilentlyContinue
    } else {
        console.log "   Échec de la création du fichier de test" -ForegroundColor Red
    }
} catch {
    console.log "   Erreur lors du test d'exécution: $_" -ForegroundColor Red
}

# 5. Vérifier les variables d'environnement
console.log "`n5. Variables d'environnement:"
console.log "   - NODE_PATH: $($env:NODE_PATH ?? 'Non défini')"
console.log "   - PATH contient Node.js: $($env:PATH -like '*node*')"

console.log "`n=== Fin de la vérification ===" -ForegroundColor Green
