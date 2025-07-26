#!/bin/bash
echo "TUYA ZIGBEE PROJECT - QUICK START"
echo "================================"
echo "1. Validation des drivers..."
bash scripts/linux/validate-all-drivers.sh
echo "2. Amélioration des drivers..."
bash scripts/linux/enhance-all-drivers.sh
echo "3. Test des workflows..."
bash scripts/linux/test-workflows.sh
echo "PROJET TERMINÉ AVEC SUCCÈS!"
