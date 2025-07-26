#!/bin/bash

# ==========================================
# TUYA ZIGBEE PROJECT - DEPLOY
# ==========================================
# Version: 1.0.1
# Date: 2025-07-26
# Homey Deployment Script
# ==========================================

set -e  # Exit on any error

echo "🚀 TUYA ZIGBEE PROJECT - DEPLOY"
echo "================================"
echo "📅 Date: $(date)"
echo "🎯 Objectif: Déploiement sur Homey"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Step 1: Clean npm cache before deployment
print_status "1. Nettoyage du cache npm avant déploiement..."
npm cache clean --force
print_success "Cache npm nettoyé"

# Step 2: Build project
print_status "2. Build du projet..."
npm run build
print_success "Projet compilé"

# Step 3: Check Homey CLI
print_status "3. Vérification de Homey CLI..."
if ! command -v homey &> /dev/null; then
    print_error "Homey CLI non installé"
    exit 1
fi
print_success "Homey CLI disponible"

# Step 4: Login to Homey
print_status "4. Connexion à Homey..."
homey login
print_success "Connecté à Homey"

# Step 5: Install app on Homey
print_status "5. Installation de l'application sur Homey..."
homey app install
print_success "Application installée sur Homey"

# Step 6: Clean npm cache after deployment
print_status "6. Nettoyage final du cache npm..."
npm cache clean --force
print_success "Cache final nettoyé"

echo ""
echo "✅ DÉPLOIEMENT TERMINÉ AVEC SUCCÈS!"
echo "===================================="
echo "🎯 Application déployée sur Homey"
echo "📊 Status: Actif et optimisé"
echo "📚 Documentation: https://apps.developer.homey.app/"
echo ""
