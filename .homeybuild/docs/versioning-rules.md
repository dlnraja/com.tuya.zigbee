# 📋 Règles de Versioning - Tuya Zigbee Project

## 🎯 **PRINCIPE DE VERSIONING**

### **Format de Version**
```
MAJOR.MINOR.PATCH-BUILD
```

### **Exemples**
- `1.0.0-001` - Version initiale
- `1.1.0-002` - Nouvelles fonctionnalités
- `1.1.1-003` - Corrections de bugs
- `2.0.0-004` - Changements majeurs

---

## 📊 **RÈGLES DE VERSIONING**

### **MAJOR (Changements Majeurs)**
- ✅ **Nouveaux drivers** - Ajout de nouveaux types d'appareils
- ✅ **Changements d'API** - Modifications de l'interface
- ✅ **Incompatibilités** - Changements non rétrocompatibles
- ✅ **Architecture** - Refonte majeure du système

### **MINOR (Nouvelles Fonctionnalités)**
- ✅ **Nouveaux appareils** - Support de nouveaux modèles
- ✅ **Nouvelles capacités** - Fonctionnalités supplémentaires
- ✅ **Améliorations** - Optimisations et performances
- ✅ **Compatibilité** - Support de nouveaux fabricants

### **PATCH (Corrections)**
- ✅ **Bugs fixes** - Corrections d'erreurs
- ✅ **Stabilité** - Améliorations de la stabilité
- ✅ **Sécurité** - Corrections de sécurité
- ✅ **Documentation** - Mises à jour de la documentation

### **BUILD (Build Number)**
- ✅ **Commits** - Numéro de commit automatique
- ✅ **Date** - Date de build (YYYYMMDD)
- ✅ **Heure** - Heure de build (HHMM)
- ✅ **Séquence** - Numéro séquentiel

---

## 🔧 **AUTOMATISATION DU VERSIONING**

### **Script de Versioning**
```powershell
# Script de versioning automatique
function Update-Version {
    param(
        [string]$Type = "patch",
        [string]$Message = ""
    )
    
    # Lecture de la version actuelle
    $currentVersion = Get-Content "version.txt"
    $versionParts = $currentVersion.Split(".")
    
    # Mise à jour selon le type
    switch ($Type) {
        "major" { $versionParts[0] = [int]$versionParts[0] + 1; $versionParts[1] = 0; $versionParts[2] = 0 }
        "minor" { $versionParts[1] = [int]$versionParts[1] + 1; $versionParts[2] = 0 }
        "patch" { $versionParts[2] = [int]$versionParts[2] + 1 }
    }
    
    # Génération du build number
    $buildNumber = Get-Date -Format "yyyyMMdd-HHmm"
    $newVersion = "$($versionParts[0]).$($versionParts[1]).$($versionParts[2])-$buildNumber"
    
    # Sauvegarde de la nouvelle version
    $newVersion | Out-File "version.txt"
    
    return $newVersion
}
```

### **Intégration Git**
```bash
# Commit avec versioning automatique
git add .
git commit -m "🔧 Version $NEW_VERSION - $MESSAGE"
git tag "v$NEW_VERSION"
git push origin master
git push origin "v$NEW_VERSION"
```

---

## 📋 **CHECKLIST DE VERSIONING**

### **✅ Avant Release**
- [ ] Tests complets passés
- [ ] Documentation mise à jour
- [ ] Changelog complété
- [ ] Version mise à jour
- [ ] Build testé

### **✅ Pendant Release**
- [ ] Tag Git créé
- [ ] Release GitHub créée
- [ ] Notes de version rédigées
- [ ] Assets attachés
- [ ] Notification envoyée

### **✅ Après Release**
- [ ] Tests post-release
- [ ] Monitoring activé
- [ ] Feedback collecté
- [ ] Documentation mise à jour
- [ ] Planning prochaine version

---

## 📊 **HISTORIQUE DES VERSIONS**

### **Version 1.0.0-001 (29/07/2025)**
- ✅ **Initialisation** - Structure de base
- ✅ **Drivers Tuya Zigbee** - Switch et Light
- ✅ **Architecture Homey SDK 3** - Conformité
- ✅ **Mode Tuya uniquement** - Spécialisation
- ✅ **Support multi-langue** - EN, FR, TA, NL

### **Version 1.1.0-002 (Planifiée)**
- 🔄 **Nouveaux drivers** - Sensors et Locks
- 🔄 **Améliorations** - Performance optimisée
- 🔄 **Nouveaux appareils** - Support étendu
- 🔄 **Automatisation** - Scripts avancés

### **Version 2.0.0-003 (Planifiée)**
- 🔄 **Architecture majeure** - Refonte complète
- 🔄 **Nouveaux protocoles** - Extensions
- 🔄 **API nouvelle** - Interface modernisée
- 🔄 **Dashboard** - Interface temps réel

---

## 🎯 **OBJECTIFS DE VERSIONING**

### **Qualité**
- ✅ **Tests automatisés** - Validation complète
- ✅ **Stabilité** - Fonctionnement garanti
- ✅ **Performance** - Optimisation continue
- ✅ **Sécurité** - Protection maximale

### **Transparence**
- ✅ **Changelog détaillé** - Historique complet
- ✅ **Notes de version** - Explications claires
- ✅ **Documentation** - Guides mis à jour
- ✅ **Communication** - Information utilisateurs

### **Efficacité**
- ✅ **Automatisation** - Processus optimisé
- ✅ **Rapidité** - Déploiement rapide
- ✅ **Fiabilité** - Moins d'erreurs
- ✅ **Maintenance** - Gestion simplifiée

---

## 📝 **TEMPLATE DE RELEASE**

### **Titre**
```
🔧 Tuya Zigbee Project v1.0.0-001
```

### **Description**
```
🎯 Version initiale du projet Tuya Zigbee

✅ Nouvelles fonctionnalités:
- Drivers Tuya Zigbee Switch et Light
- Architecture conforme Homey SDK 3
- Mode Tuya uniquement activé
- Support multi-langue (EN, FR, TA, NL)

🔧 Améliorations:
- Performance optimisée
- Stabilité améliorée
- Documentation complète

🐛 Corrections:
- Bugs mineurs corrigés
- Compatibilité Homey v5.0.0+

📦 Installation:
1. Télécharger la release
2. Installer via Homey
3. Configurer les appareils Tuya Zigbee
4. Profiter du contrôle local

📄 Documentation: https://github.com/dlnraja/com.tuya.zigbee
```

---

*Dernière mise à jour : 29/07/2025 04:30:00*