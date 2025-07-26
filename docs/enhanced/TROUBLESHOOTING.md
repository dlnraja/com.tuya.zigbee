# 🔧 Guide de Dépannage - Tuya Zigbee

## 🚨 Problèmes courants et solutions

### 1. Appareil non détecté
**Symptômes**: L'appareil n'apparaît pas dans la liste
**Solutions**:
- Vérifiez que l'appareil est en mode pairing
- Redémarrez l'appareil
- Vérifiez la distance (max 10m)
- Changez les piles si nécessaire

### 2. Connexion instable
**Symptômes**: L'appareil se déconnecte régulièrement
**Solutions**:
- Déplacez l'appareil plus près du Homey
- Ajoutez un répéteur Zigbee
- Vérifiez les interférences WiFi
- Mettez à jour le firmware

### 3. Batterie faible
**Symptômes**: Alertes de batterie fréquentes
**Solutions**:
- Remplacez les piles
- Vérifiez la qualité des piles
- Réduisez la fréquence de polling
- Recalibrez le capteur

### 4. Erreurs de mise à jour
**Symptômes**: Échec des mises à jour
**Solutions**:
- Vérifiez la connexion internet
- Redémarrez Homey
- Vérifiez l'espace disque
- Contactez le support

## 📊 Diagnostic

### Logs utiles
- **Application logs**: Settings > System > Logs
- **Driver logs**: Dans l'application Tuya Zigbee
- **Network logs**: Pour les problèmes de connexion

### Outils de diagnostic
- **Dashboard**: Monitoring temps réel
- **Terminal**: Scripts PowerShell de diagnostic
- **API**: Endpoints de diagnostic

## 🆘 Support avancé

### Informations à fournir
1. Version de Homey
2. Version de l'application
3. Type d'appareil
4. Logs d'erreur
5. Étapes de reproduction

### Contacts
- **GitHub Issues**: [Lien](https://github.com/dlnraja/com.tuya.zigbee/issues)
- **Documentation**: [README.md](../README.md)
- **Dashboard**: [Monitoring](../dashboard/)

---
*Généré automatiquement le 2025-07-24T23:08:11.584Z*
