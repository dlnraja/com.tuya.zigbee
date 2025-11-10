# 🔬 MCP + AI Integration Guide

## 📊 **Overview**

L'app Universal Tuya Zigbee est maintenant équipée d'une **DiagnosticAPI** intelligente qui permet l'intégration avec des agents IA via MCP (Model Context Protocol) pour:

- ✅ Monitoring temps réel des logs et erreurs
- ✅ Détection automatique des patterns d'erreurs
- ✅ Recommandations de fix générées par IA
- ✅ Export JSON structuré pour analyse IA
- ✅ Scoring de santé des devices

---

## 🚀 **3 Niveaux d'Intégration**

### **Niveau 1: Homey Diagnostic (Natif)**

L'app expose automatiquement les diagnostics via Homey:

```javascript
// Accessible via Homey Developer Tools
// Settings → Apps → Universal Tuya Zigbee → Send diagnostic report
```

**Format de sortie:**
- Logs système complets
- Statistiques DiagnosticAPI
- Top 5 erreurs avec fréquence
- Recommandations AI-ready
- Health scores par device

---

### **Niveau 2: API JavaScript (Direct)**

Accès programmatique depuis l'app:

```javascript
// Dans ton code Homey App
const app = Homey.ManagerApps.getApp({ id: 'com.dlnraja.tuya.zigbee' });
const diagnostics = app.getDiagnosticReport();

console.log(diagnostics);
// {
//   version: '1.0.0',
//   exported: '2025-11-06T22:30:00.000Z',
//   app: { id: 'com.dlnraja.tuya.zigbee', version: '4.9.300', uptime: 3600 },
//   diagnostics: { ... },
//   aiHints: { errorPatterns: [...], deviceIssues: [...] }
// }
```

**Cas d'usage:**
- Scripts de monitoring custom
- Integration dans d'autres apps Homey
- Automation flows avancés

---

### **Niveau 3: MCP Integration (External AI)**

#### **3.1 Homey MCP Server Setup**

1. **Installer MCP Server (si disponible)**
   ```bash
   npm install -g @athombv/mcp-server-homey
   ```

2. **Configurer Claude/GPT pour MCP**
   ```json
   {
     "mcp_servers": {
       "homey": {
         "url": "https://mcp.athom.com",
         "token": "YOUR_HOMEY_TOKEN"
       }
     }
   }
   ```

3. **Connecter Windsurf AI**
   ```
   Settings → MCP Servers → Add
   Name: Homey
   URL: https://mcp.athom.com
   Auth: Bearer YOUR_TOKEN
   ```

#### **3.2 Querying via MCP**

**Exemple de requête MCP:**

```javascript
// Via MCP Protocol
mcp.query({
  server: 'homey',
  method: 'app.getDiagnostics',
  params: {
    appId: 'com.dlnraja.tuya.zigbee',
    includeDeviceDetails: true
  }
})
```

**Réponse structurée:**
```json
{
  "generated": "2025-11-06T22:30:00.000Z",
  "uptime": 3600,
  "summary": {
    "totalLogs": 1500,
    "totalErrors": 12,
    "totalDevices": 45,
    "criticalErrors": 2,
    "recentErrors": 3
  },
  "topErrors": [
    {
      "id": "CLUSTER_MISSING_Does not exist",
      "category": "CLUSTER_MISSING",
      "severity": "HIGH",
      "message": "reporting failed (0 Does not exist (OnOffCluster))",
      "count": 8,
      "fix": "Check cluster presence before configureReporting, or remove reporting for this cluster"
    }
  ],
  "recommendations": [
    {
      "priority": "HIGH",
      "category": "CLUSTER_MISSING",
      "issue": "reporting failed (0 Does not exist (OnOffCluster))",
      "occurrences": 8,
      "affectedDevices": 3,
      "suggestedFix": "Check cluster presence before configureReporting, or remove reporting for this cluster"
    }
  ]
}
```

---

## 🧠 **AI Workflow: Auto-Diagnosis → Auto-Fix**

### **Étape 1: Agent IA se connecte via MCP**

```
AI Agent → MCP → Homey → Universal Tuya Zigbee → DiagnosticAPI
```

### **Étape 2: Récupération des diagnostics**

```javascript
const diagnostics = await mcp.query({
  server: 'homey',
  method: 'app.getDiagnostics',
  params: { appId: 'com.dlnraja.tuya.zigbee' }
});
```

### **Étape 3: Analyse IA**

L'IA reçoit:
- ✅ Patterns d'erreurs détectés automatiquement
- ✅ Catégories (CLUSTER, ZIGBEE, TIMING, BATTERY, etc.)
- ✅ Sévérité (CRITICAL, HIGH, MEDIUM)
- ✅ Suggestions de fix pré-générées
- ✅ Devices affectés
- ✅ Health scores

### **Étape 4: Génération de Fix**

L'IA peut:
1. **Analyser le pattern** (ex: "Does not exist OnOffCluster")
2. **Identifier la cause** (configureReporting sur button device)
3. **Générer le patch**:
   ```javascript
   // lib/MultiEndpointCommandListener.js
   - if (clusterName === 'onOff') {
   -   await cluster.configureReporting('onOff', 0, 300, 1);
   - }
   + // Buttons don't have reportable attributes
   ```
4. **Créer commit + push** via GitHub API
5. **Déclencher auto-publish** via GitHub Actions

### **Étape 5: Validation**

```javascript
// Après déploiement, l'IA vérifie:
const newDiagnostics = await mcp.query(...);
if (newDiagnostics.topErrors.length < diagnostics.topErrors.length) {
  console.log('✅ Fix validé - erreurs réduites!');
}
```

---

## 📝 **Error Pattern Detection**

La DiagnosticAPI détecte automatiquement ces patterns:

| Pattern | Catégorie | Fix Suggéré |
|---------|-----------|-------------|
| `expected_cluster_id_number` | CLUSTER_ID | Use CLUSTER.* constants |
| `Does not exist.*Cluster` | CLUSTER_MISSING | Check presence before reporting |
| `Zigbee est en cours de démarrage` | TIMING | Add 2s initialization delay |
| `Could not read battery` | BATTERY | Add retry logic |
| `reporting failed` | REPORTING | Verify attribute exists |
| `MODULE_NOT_FOUND` | MODULE | Add graceful fallback |
| `Timeout.*Expected Response` | TIMEOUT | Increase timeout or add retry |

---

## 🔧 **Integration Examples**

### **Example 1: Windsurf AI Auto-Monitor**

```javascript
// Windsurf AI script
async function monitorAndFix() {
  while (true) {
    const diag = await homey.getDiagnosticReport();
    
    if (diag.diagnostics.summary.criticalErrors > 0) {
      console.log('🚨 Critical errors detected!');
      
      for (const error of diag.diagnostics.topErrors) {
        if (error.severity === 'CRITICAL') {
          const fix = await ai.generateFix(error);
          await github.createPullRequest(fix);
        }
      }
    }
    
    await sleep(300000); // Check every 5 min
  }
}
```

### **Example 2: ChatGPT via MCP**

```
User: "Check my Homey for Zigbee errors"

ChatGPT via MCP:
1. Connects to Homey
2. Queries DiagnosticAPI
3. Finds: "8x OnOffCluster errors on buttons"
4. Suggests: "Remove configureReporting for button devices"
5. User: "Apply fix"
6. ChatGPT: Creates PR on GitHub
```

### **Example 3: Claude Code Integration**

```python
# Claude avec MCP
import mcp_client

homey = mcp_client.connect('homey', token=os.environ['HOMEY_TOKEN'])
diag = homey.query('app.getDiagnostics', appId='com.dlnraja.tuya.zigbee')

for error in diag['diagnostics']['topErrors']:
    if error['count'] >= 5:
        fix = generate_fix(error)
        apply_to_github(fix)
```

---

## 🛠️ **API Reference**

### **getDiagnosticReport()**

```javascript
/**
 * Get full diagnostic report
 * @returns {Object} AI-ready diagnostic data
 */
app.getDiagnosticReport()
```

**Returns:**
```json
{
  "version": "1.0.0",
  "exported": "ISO8601 timestamp",
  "app": {
    "id": "com.dlnraja.tuya.zigbee",
    "version": "4.9.300",
    "uptime": 3600
  },
  "diagnostics": {
    "generated": "ISO8601",
    "uptime": 3600,
    "summary": {
      "totalLogs": 1500,
      "totalErrors": 12,
      "totalDevices": 45,
      "criticalErrors": 2,
      "recentErrors": 3
    },
    "topErrors": [],
    "devices": [],
    "recommendations": []
  },
  "aiHints": {
    "errorPatterns": [],
    "deviceIssues": []
  }
}
```

### **diagnosticAPI.addLog()**

```javascript
/**
 * Add log entry (used internally)
 * @param {string} level - INFO, WARN, ERROR, DEBUG
 * @param {string} category - ZIGBEE, CLUSTER, DEVICE, etc.
 * @param {string} message - Log message
 * @param {string} device - Device name (optional)
 * @param {Object} meta - Additional metadata (optional)
 */
diagnosticAPI.addLog(level, category, message, device, meta)
```

### **diagnosticAPI.getErrors()**

```javascript
/**
 * Get all errors sorted by frequency
 * @returns {Array} Error objects
 */
diagnosticAPI.getErrors()
```

### **diagnosticAPI.getDevices()**

```javascript
/**
 * Get all monitored devices with health scores
 * @returns {Array} Device objects with healthScore
 */
diagnosticAPI.getDevices()
```

---

## 🔐 **Security Considerations**

1. **Token Management**
   - Never commit Homey tokens to Git
   - Use environment variables
   - Rotate tokens regularly

2. **MCP Access Control**
   - Read-only by default
   - Write operations require explicit permission
   - Audit all AI-generated changes

3. **Rate Limiting**
   - Max 1000 logs in buffer (circular)
   - Old logs auto-pruned after 24h
   - API calls throttled to prevent abuse

---

## 🚀 **Next Steps**

1. **Deploy v4.9.300** avec DiagnosticAPI
2. **Test Homey diagnostic report** → Vérifier données MCP
3. **Setup MCP server** (si disponible)
4. **Connect Windsurf AI** → Test auto-monitoring
5. **Enable auto-fix workflow** → Supervision initiale
6. **Monitor & iterate** → Améliorer patterns détection

---

## 📚 **Resources**

- **Homey MCP Server**: https://homey.app/mcp (si disponible)
- **Model Context Protocol**: https://modelcontextprotocol.io
- **DiagnosticAPI Source**: `lib/diagnostics/DiagnosticAPI.js`
- **Integration Example**: `tools/smart-monitor.js`
- **GitHub Repo**: https://github.com/dlnraja/com.tuya.zigbee

---

## ✅ **Status**

- ✅ DiagnosticAPI créée et intégrée
- ✅ app.js hooks configurés
- ✅ onDiagnostic() enrichi
- ✅ Error patterns définis
- ✅ AI recommendations implémentées
- ⏳ Homey MCP Server (attente disponibilité)
- ⏳ Windsurf AI MCP connector (à tester)

---

**Résumé:** Oui, Windsurf AI **PEUT** utiliser MCP pour dumper les logs et corriger automatiquement les bugs, grâce à l'intégration DiagnosticAPI! 🚀
