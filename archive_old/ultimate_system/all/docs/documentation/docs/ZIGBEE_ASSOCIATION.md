# Modes d'association Zigbee

## Binding
Le binding permet de lier directement deux appareils Zigbee pour qu'ils communiquent sans passer par le coordinateur.

### Exemple de code pour configurer un binding :
```javascript
async bind(endpoint, targetEp, clusterId) {
  try {
    await this.zclNode.endpoints[endpoint].bind(clusterId, targetEp);
    this.log(`Binding réussi pour le cluster ${clusterId} avec l'endpoint ${targetEp}`);
  } catch (error) {
    this.error(`Échec du binding pour le cluster ${clusterId}:`, error);
  }
}
```

## Groupes
Les groupes permettent à plusieurs appareils de recevoir des commandes simultanément.

### Exemple de code pour ajouter un appareil à un groupe :
```javascript
async addToGroup(groupId, endpoint) {
  try {
    await this.zclNode.endpoints[endpoint].groups.add(groupId);
    this.log(`Appareil ajouté au groupe ${groupId}`);
  } catch (error) {
    this.error(`Échec de l'ajout au groupe ${groupId}:`, error);
  }
}
```

## Scènes
Les scènes permettent de sauvegarder et de rappeler l'état de plusieurs appareils.

### Exemple de code pour enregistrer une scène :
```javascript
async storeScene(groupId, sceneId, endpoint) {
  try {
    await this.zclNode.endpoints[endpoint].scenes.storeScene(groupId, sceneId);
    this.log(`Scène ${sceneId} enregistrée pour le groupe ${groupId}`);
  } catch (error) {
    this.error(`Échec de l'enregistrement de la scène ${sceneId}:`, error);
  }
}
```
