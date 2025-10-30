# 📚 HOMEY CUSTOM PAIRING VIEWS - GUIDE OFFICIEL

**Source**: Homey Apps SDK Documentation  
**URL**: https://apps.developer.homey.app/advanced/custom-views/custom-pairing-views  
**Date**: 30 Oct 2025

---

## 🎯 STRUCTURE OFFICIELLE

### Emplacement des fichiers
```
/drivers/<driver_id>/pair/<view_id>.html
```

**Exemple**:
```
/drivers/usb_outlet_2port/pair/select-driver.html
```

---

## 📋 MANIFEST CONFIGURATION

### Dans `driver.compose.json`:
```json
{
  "name": { "en": "My Driver" },
  "class": "socket",
  "capabilities": ["onoff", "dim"],
  "pair": [
    {
      "id": "list_devices",
      "template": "list_devices",
      "navigation": {
        "next": "select_driver"
      }
    },
    {
      "id": "select_driver"
      // Custom view - pas de template
    },
    {
      "id": "add_devices",
      "template": "add_devices"
    }
  ]
}
```

---

## 🔧 BACK-END API (driver.js)

### Session Methods
```javascript
const Homey = require('homey');

class Driver extends Homey.Driver {
  async onPair(session) {
    
    // 1. Show specific view
    await session.showView("my_view");
    
    // 2. Navigate
    await session.nextView();
    await session.prevView();
    
    // 3. Close pairing
    await session.done();
    
    // 4. Listen to view changes
    session.setHandler("showView", async (viewId) => {
      console.log("View:", viewId);
    });
    
    // 5. Custom event handlers
    session.setHandler("my_event", async (data) => {
      // data from Homey.emit() in frontend
      return "Response data";
    });
    
    // 6. Emit to frontend
    const result = await session.emit("hello", "Data to frontend");
  }
  
  // Quick implementation for simple pairing
  async onPairListDevices() {
    return [
      {
        name: "Device Name",
        data: { id: "unique_id" },
        store: { address: "192.168.1.100" },
        settings: { pincode: "1234" }
      }
    ];
  }
}

module.exports = Driver;
```

---

## 🎨 FRONT-END API (HTML/JavaScript)

### Available Methods

#### 1. Emit Event to Backend
```javascript
Homey.emit("my_event", { foo: "bar" })
  .then(result => {
    console.log(result); // Response from backend
  });
```

#### 2. Receive Event from Backend
```javascript
Homey.on("hello", function(message) {
  Homey.alert(message);
  return "Response"; // Can return Promise
});
```

#### 3. Set Title & Subtitle
```javascript
Homey.setTitle(Homey.__("pair.title"));
Homey.setSubtitle(Homey.__("pair.subtitle"));
```

#### 4. Navigation
```javascript
Homey.showView("list_devices");
Homey.nextView();
Homey.prevView();
```

#### 5. Dialogs
```javascript
// Alert
await Homey.alert("Message");

// Confirm
const confirmed = await Homey.confirm("Are you sure?");

// Popup
await Homey.popup("popup_id");
```

#### 6. Loading Overlay
```javascript
Homey.showLoadingOverlay();
Homey.hideLoadingOverlay();
```

#### 7. Current View Info
```javascript
const viewId = await Homey.getViewId();
const zone = await Homey.getZone();
```

#### 8. Persistent Store (per view)
```javascript
await Homey.setStoreValue("key", "value");
const value = await Homey.getStoreValue("key");
```

#### 9. Close Pairing
```javascript
await Homey.done();
await Homey.close();
```

---

## 📦 DEVICE PAIRING DATA

### Structure complète:
```javascript
{
  // Required
  name: "My Device",
  data: {
    id: "unique_identifier" // MAC address, serial, etc.
  },
  
  // Optional
  store: {
    // Dynamic & persistent storage
    address: "192.168.1.100"
  },
  
  settings: {
    // User-modifiable settings
    pincode: "1234"
  },
  
  // Override driver manifest defaults
  icon: "/my_icon.svg", // relative to /drivers/<driver_id>/assets/
  capabilities: ["onoff", "target_temperature"],
  capabilitiesOptions: {
    target_temperature: {
      min: 5,
      max: 35
    }
  }
}
```

**Note**: Icons peuvent être dans `/userdata/` folder (Homey v12.3.0+)

---

## 🔄 PAIRING FLOW EXAMPLE

### Manifest
```json
{
  "pair": [
    {
      "id": "list_my_devices",
      "template": "list_devices",
      "navigation": {
        "next": "add_my_devices"
      }
    },
    {
      "id": "add_my_devices",
      "template": "add_devices"
    }
  ]
}
```

### Driver Implementation
```javascript
class Driver extends Homey.Driver {
  async onPairListDevices() {
    const devices = await DiscoverDevices();
    return devices.map(device => ({
      name: device.name,
      data: { id: device.mac },
      store: { ip: device.ip }
    }));
  }
}
```

---

## 🎯 NOTRE IMPLÉMENTATION vs OFFICIELLE

### ❌ Ce qu'on fait actuellement (INCORRECT):

```
Structure actuelle:
/pairing/select-driver.html        ❌ Mauvais emplacement
/pairing/select-driver.js          ❌ Backend devrait être dans driver.js
/pairing/select-driver-client.js   ❌ Pas nécessaire
```

### ✅ Ce qu'on devrait faire (CORRECT):

```
Structure officielle:
/drivers/<driver_id>/pair/select-driver.html  ✅ BON
/drivers/<driver_id>/driver.js avec onPair()  ✅ BON
```

---

## 🔧 CORRECTIONS À APPLIQUER

### 1. Déplacer fichiers
```bash
# Pour CHAQUE driver qui a besoin de custom pairing:
/pairing/select-driver.html 
  → /drivers/<driver_id>/pair/select-driver.html
```

### 2. Intégrer backend dans driver.js
```javascript
// drivers/<driver_id>/driver.js
const Homey = require('homey');

class Driver extends Homey.Driver {
  
  async onPair(session) {
    // Handler for listing devices
    session.setHandler('list_devices', async () => {
      const discovered = await this.discoverDevices();
      const candidates = await this.findMatchingDrivers(discovered);
      
      if (candidates.length > 1) {
        // Show custom view if multiple matches
        await session.showView('select_driver');
        
        // Send candidates to frontend
        await session.emit('candidates', candidates);
        await session.emit('device_info', discovered);
      }
      
      return discovered;
    });
    
    // Handler for driver selection
    session.setHandler('driver_selected', async (driverId) => {
      this.selectedDriver = driverId;
      return { success: true };
    });
  }
  
  async onPairListDevices() {
    // Simple implementation
    return await this.discoverDevices();
  }
}
```

### 3. Frontend HTML simplifié
```html
<!-- /drivers/<driver_id>/pair/select-driver.html -->
<!DOCTYPE html>
<html>
<head>
    <title>Select Driver</title>
</head>
<body>
    <div id="drivers"></div>
    <button id="continueBtn" onclick="confirmSelection()">Continue</button>
    
    <script>
        let selectedDriver = null;
        
        // Receive candidates from backend
        Homey.on('candidates', (candidates) => {
            displayDrivers(candidates);
        });
        
        // Receive device info
        Homey.on('device_info', (info) => {
            displayDeviceInfo(info);
        });
        
        function selectDriver(driver) {
            selectedDriver = driver;
        }
        
        async function confirmSelection() {
            if (!selectedDriver) return;
            
            const result = await Homey.emit('driver_selected', selectedDriver.id);
            
            if (result.success) {
                Homey.nextView();
            }
        }
        
        function displayDrivers(candidates) {
            // Render UI
        }
    </script>
</body>
</html>
```

---

## 📋 SYSTEM TEMPLATES DISPONIBLES

Homey fournit des templates prêts à l'emploi:

1. **list_devices** - Liste de devices découverts
2. **add_devices** - Ajouter devices sélectionnés
3. **oauth2_login** - Authentification OAuth2
4. **credentials_login** - Login username/password
5. **pincode** - Saisie code PIN
6. **loading** - Écran de chargement
7. **done** - Confirmation finale

**Docs**: https://apps.developer.homey.app/the-basics/devices/pairing/system-views/

---

## ✅ CHECKLIST IMPLÉMENTATION

- [ ] Déplacer HTML vers `/drivers/<driver_id>/pair/`
- [ ] Intégrer backend dans `driver.js` avec `onPair(session)`
- [ ] Utiliser `Homey.emit()` / `Homey.on()` pour communication
- [ ] Supprimer fichiers `/pairing/` root
- [ ] Tester avec `homey app run`
- [ ] Vérifier navigation fonctionne
- [ ] Valider avec `homey app validate`

---

## 🚀 AVANTAGES APPROCHE OFFICIELLE

1. ✅ **Standardisé** - Suit conventions Homey
2. ✅ **Maintenable** - Backend/frontend séparés proprement
3. ✅ **Testable** - Peut être testé avec Homey CLI
4. ✅ **Documenté** - Documentation officielle disponible
5. ✅ **Compatible** - Fonctionne avec tous SDK versions
6. ✅ **Performant** - Optimisé par Homey runtime

---

## 📚 RESSOURCES

- **Custom Pairing Views**: https://apps.developer.homey.app/advanced/custom-views/custom-pairing-views
- **Pairing Basics**: https://apps.developer.homey.app/the-basics/devices/pairing
- **System Views**: https://apps.developer.homey.app/the-basics/devices/pairing/system-views/
- **Driver API**: https://apps-sdk-v3.developer.homey.app/Driver.html

---

## 🎯 ACTION IMMÉDIATE

**Pour corriger notre implémentation**:

1. Créer `/drivers/usb_outlet_2port/pair/select-driver.html`
2. Adapter code selon API officielle
3. Intégrer handlers dans `driver.js`
4. Tester localement
5. Commit + push

**Estimated time**: 30 minutes  
**Priority**: HIGH (conformité SDK3)
