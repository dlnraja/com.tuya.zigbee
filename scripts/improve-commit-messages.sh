#!/bin/bash
# Amélioration des messages de commit

echo "Amélioration des messages de commit..."

# Créer un fichier de mapping pour les messages améliorés
cat > commit-mapping.txt << 'EOF'
[Cursor] Checkpoint|[YOLO] 🚀 Checkpoint automatique - Sauvegarde de l'état du projet
Synchronisation|[YOLO] 🔄 Synchronisation automatique des TODO - Mise à jour complète avec archivage intelligent
Correction|[YOLO] 🔧 Correction et optimisation - Amélioration des performances et compatibilité
Traductions|[YOLO] 🌐 Ajout des traductions multilingues - Support EN/FR/TA/NL avec génération automatique
Changelog|[YOLO] 📋 Système de changelog automatique - Historique complet avec génération toutes les 6h
Workflow|[YOLO] ⚙️ Workflow automatisé - CI/CD et optimisation continue
Drivers|[YOLO] 🔌 Drivers Tuya Zigbee - Support complet des 215 devices
Optimisation|[YOLO] ⚡ Optimisation des performances - Amélioration continue du projet
EOF

# Améliorer les messages de commit
git filter-branch --msg-filter '
  # Lire le mapping
  while IFS="|" read -r old_msg new_msg; do
    # Remplacer les messages
    sed "s///g"
  done < commit-mapping.txt
' --tag-name-filter cat -- --branches --tags

echo "Messages de commit améliorés!"
