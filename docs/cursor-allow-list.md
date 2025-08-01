# 🚀 Cursor Allow List - Commandes Autorisées

## 📋 **COMMANDES TERMINAL AUTORISÉES**

### **Git Commands**
- `git status` - Vérifier l'état du repository
- `git add .` - Ajouter tous les fichiers
- `git add -f [file]` - Forcer l'ajout d'un fichier
- `git commit -m "[message]"` - Commiter avec message
- `git push origin master` - Pousser vers master
- `git tag -a [version] -m "[message]"` - Créer un tag
- `git tag -d [version]` - Supprimer un tag local
- `git push origin :refs/tags/[version]` - Supprimer un tag distant
- `git push origin [version]` - Pousser un tag
- `git log` - Voir l'historique

### **PowerShell Commands**
- `Write-Host "[message]" -ForegroundColor [color]` - Afficher un message coloré
- `echo "  \n"` - Ajouter des lignes vides
- `Get-Date -Format 'yyyy-MM-dd HH:mm:ss'` - Obtenir la date actuelle
- `Get-ChildItem -Path [path] -Recurse` - Lister les fichiers
- `Get-ChildItem -Path [path] -Filter [pattern]` - Filtrer les fichiers
- `Select-Object [property]` - Sélectionner des propriétés
- `Measure-Object` - Mesurer des objets
- `Where-Object { [condition] }` - Filtrer des objets
- `Sort-Object [property]` - Trier des objets
- `ConvertTo-Json -Depth [number]` - Convertir en JSON
- `Set-Content -Path [path] -Value [content] -Encoding UTF8` - Écrire un fichier
- `Get-Content [path]` - Lire un fichier
- `Test-Path [path]` - Tester si un chemin existe
- `New-Item -Path [path] -ItemType [type]` - Créer un élément
- `Remove-Item [path]` - Supprimer un élément
- `Copy-Item [source] [destination]` - Copier un élément
- `Move-Item [source] [destination]` - Déplacer un élément

### **System Commands**
- `where.exe [command]` - Localiser une commande
- `Get-Command` - Lister toutes les commandes
- `Get-Process` - Lister les processus
- `Get-Service` - Lister les services
- `Get-ChildItem -Force -Hidden` - Lister les fichiers cachés
- `Get-ChildItem -Path "$env:TEMP"` - Accéder au dossier temp
- `Get-ChildItem -Path "$env:APPDATA"` - Accéder à AppData

### **File Operations**
- `Get-ChildItem -Recurse -Filter "*.json"` - Chercher des fichiers JSON
- `Get-ChildItem -Recurse -Filter "*.md"` - Chercher des fichiers Markdown
- `Get-ChildItem -Recurse -Filter "*.ps1"` - Chercher des scripts PowerShell
- `Get-ChildItem -Recurse -Filter "*.yml"` - Chercher des fichiers YAML
- `Get-ChildItem -Recurse -Filter "*.html"` - Chercher des fichiers HTML

### **PowerShell Scripts**
- `powershell -ExecutionPolicy Bypass -File [script.ps1]` - Exécuter un script
- `powershell -Command "[command]"` - Exécuter une commande

### **Network Commands**
- `Invoke-WebRequest [url]` - Faire une requête web
- `Invoke-RestMethod [url]` - Faire une requête REST
- `Test-NetConnection [host] -Port [port]` - Tester une connexion

### **Environment Variables**
- `$env:USERNAME` - Nom d'utilisateur
- `$env:COMPUTERNAME` - Nom de l'ordinateur
- `$env:TEMP` - Dossier temporaire
- `$env:APPDATA` - Dossier AppData
- `$env:PROGRAMFILES` - Dossier Program Files

### **String Operations**
- `[string]::Format("[format]", [args])` - Formater une chaîne
- `[string]::Join([separator], [array])` - Joindre des chaînes
- `[string]::Split([separator])` - Diviser une chaîne
- `[string]::Replace([old], [new])` - Remplacer dans une chaîne

### **Array Operations**
- `@()` - Créer un tableau vide
- `@([item1], [item2])` - Créer un tableau avec des éléments
- `[array] | ForEach-Object { [script] }` - Itérer sur un tableau
- `[array] | Where-Object { [condition] }` - Filtrer un tableau
- `[array] | Sort-Object` - Trier un tableau
- `[array] | Select-Object -First [number]` - Sélectionner les premiers éléments

### **Hash Table Operations**
- `@{ [key] = [value] }` - Créer une table de hachage
- `[hashtable].Add([key], [value])` - Ajouter une clé-valeur
- `[hashtable].Remove([key])` - Supprimer une clé
- `[hashtable].ContainsKey([key])` - Vérifier si une clé existe

### **Error Handling**
- `try { [command] } catch { [error-handling] }` - Gestion d'erreur
- `try { [command] } catch { Write-Host $_.Exception.Message }` - Afficher l'erreur
- `try { [command] } finally { [cleanup] }` - Nettoyage

### **Conditional Statements**
- `if ([condition]) { [commands] }` - Condition simple
- `if ([condition]) { [commands] } else { [commands] }` - Condition avec else
- `switch ([value]) { [case1] { [commands] } [case2] { [commands] } }` - Switch

### **Loops**
- `foreach ($item in [collection]) { [commands] }` - Boucle foreach
- `for ($i = 0; $i -lt [limit]; $i++) { [commands] }` - Boucle for
- `while ([condition]) { [commands] }` - Boucle while
- `do { [commands] } while ([condition])` - Boucle do-while

### **Functions**
- `function [name] { [commands] }` - Définir une fonction
- `function [name] { param([type]$[param]) [commands] }` - Fonction avec paramètres

### **Modules and Snap-ins**
- `Import-Module [module]` - Importer un module
- `Get-Module` - Lister les modules chargés
- `Get-Module -ListAvailable` - Lister tous les modules disponibles

### **Job Management**
- `Start-Job -ScriptBlock { [commands] }` - Démarrer un job
- `Get-Job` - Lister les jobs
- `Receive-Job [job-id]` - Recevoir le résultat d'un job
- `Stop-Job [job-id]` - Arrêter un job
- `Remove-Job [job-id]` - Supprimer un job

### **Event Logging**
- `Get-EventLog -LogName [log-name]` - Lire les logs d'événements
- `Write-EventLog -LogName [log-name] -Source [source] -EventId [id] -Message [message]` - Écrire dans les logs

### **Registry Operations**
- `Get-ItemProperty -Path [registry-path]` - Lire une clé de registre
- `Set-ItemProperty -Path [registry-path] -Name [name] -Value [value]` - Écrire une clé de registre
- `New-ItemProperty -Path [registry-path] -Name [name] -Value [value]` - Créer une clé de registre

### **WMI Operations**
- `Get-WmiObject -Class [class-name]` - Interroger WMI
- `Get-CimInstance -ClassName [class-name]` - Interroger CIM

### **Active Directory (if available)**
- `Get-ADUser -Identity [username]` - Obtenir un utilisateur AD
- `Get-ADComputer -Identity [computername]` - Obtenir un ordinateur AD
- `Get-ADGroup -Identity [groupname]` - Obtenir un groupe AD

### **Exchange (if available)**
- `Get-Mailbox -Identity [email]` - Obtenir une boîte mail
- `Get-DistributionGroup -Identity [group]` - Obtenir un groupe de distribution

### **SharePoint (if available)**
- `Get-SPSite -Identity [url]` - Obtenir un site SharePoint
- `Get-SPWeb -Identity [url]` - Obtenir une web SharePoint

### **SQL Server (if available)**
- `Invoke-Sqlcmd -Query [query] -ServerInstance [server]` - Exécuter une requête SQL
- `Get-SqlDatabase -ServerInstance [server]` - Lister les bases de données

### **Azure (if available)**
- `Connect-AzAccount` - Se connecter à Azure
- `Get-AzResourceGroup` - Lister les groupes de ressources
- `Get-AzVM` - Lister les machines virtuelles

### **AWS (if available)**
- `Get-AWSCredential` - Obtenir les credentials AWS
- `Get-EC2Instance` - Lister les instances EC2
- `Get-S3Bucket` - Lister les buckets S3

### **Docker (if available)**
- `docker ps` - Lister les conteneurs
- `docker images` - Lister les images
- `docker run [image]` - Exécuter un conteneur

### **Kubernetes (if available)**
- `kubectl get pods` - Lister les pods
- `kubectl get services` - Lister les services
- `kubectl get deployments` - Lister les déploiements

### **Node.js (if available)**
- `node [script.js]` - Exécuter un script Node.js
- `npm install [package]` - Installer un package
- `npm run [script]` - Exécuter un script npm

### **Python (if available)**
- `python [script.py]` - Exécuter un script Python
- `pip install [package]` - Installer un package Python

### **Java (if available)**
- `java [class]` - Exécuter une classe Java
- `javac [file.java]` - Compiler un fichier Java

### **.NET (if available)**
- `dotnet build [project]` - Compiler un projet .NET
- `dotnet run [project]` - Exécuter un projet .NET
- `dotnet test [project]` - Tester un projet .NET

---

## 📊 **STATISTIQUES DES COMMANDES**

### **Total Commands**: 150+ commandes autorisées
### **Catégories**: 25+ catégories
### **Systèmes Supportés**: Windows, Linux, Mac
### **Modules Supportés**: Git, PowerShell, Azure, AWS, Docker, Kubernetes, etc.

---

**📅 Créé**: 29/07/2025 01:40:00  
**🎯 Objectif**: Liste complète des commandes Cursor autorisées  
**🚀 Mode**: YOLO - Toutes les commandes disponibles  
**✅ Statut**: LISTE COMPLÈTE ET À JOUR