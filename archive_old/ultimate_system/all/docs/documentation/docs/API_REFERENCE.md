# Référence de l'API

## Endpoints

### `GET /api/devices`
Liste tous les appareils connectés

**Réponse**
```json
{
  "devices": [
    {
      "id": "device_123",
      "name": "Interrupteur Salon",
      "type": "switch",
      "status": "online"
    }
  ]
}
```

### `POST /api/devices/:id/command`
Envoie une commande à un appareil

**Paramètres**
- `command` (string) - Commande à exécuter (on/off/dim)
- `value` (number) - Valeur optionnelle (pour le variateur)

**Exemple**
```json
{
  "command": "dim",
  "value": 75
}
```

## Codes d'erreur
- `400` - Requête invalide
- `404` - Appareil non trouvé
- `500` - Erreur serveur
