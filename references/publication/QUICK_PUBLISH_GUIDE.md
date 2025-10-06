# Comment publier maintenant

**Contexte**: tous les enrichissements et validations sont terminés. Suivez l'une des méthodes ci-dessous pour publier immédiatement.

---

## Méthode 1 · Script automatique (recommandé)

```powershell
pwsh -File tools\direct_publish.ps1
```

Répondez aux invites Homey CLI lorsque cela est demandé.

---

## Méthode 2 · Homey CLI direct

```powershell
homey app publish
```

Prompts suggérés :
- Uncommitted changes ? → `y`
- Version type ? → `patch` (ou `minor`)
- Changelog ? → `Master 10x enrichment complete`
- Confirm ? → `y`

---

## Authentification

En cas d'erreur `Authentication failed` :

```powershell
homey whoami
```

Si vous n'êtes pas connecté :

```powershell
homey login
```

Puis relancez la publication.

---

## Ce qui a déjà été fait

- 10 cycles d'enrichissement (2829 IDs)
- 10 cycles de scraping (1621 IDs)
- Validation Homey : PASS
- Version locale : `1.1.1`
- Commit `6812ec972` poussé sur `master`
- Scripts de publication prêts

---

## Statistiques finales

| Élément              | Valeur |
|----------------------|--------|
| Drivers enrichis     | 163/163 (100 %) |
| IDs totaux           | 2829+ |
| IDs scrapés          | 1621 |
| Base d'IDs uniques   | 84 |
| Validation           | PASS |
| Version              | 1.1.1 |

---

## Liens utiles

- [Dashboard Homey](https://tools.developer.homey.app/apps)
- [Référentiel GitHub](https://github.com/dlnraja/com.tuya.zigbee)
- [GitHub Actions](https://github.com/dlnraja/com.tuya.zigbee/actions)

---

## Pourquoi GitHub Actions ne publie pas

Dernière version Homey App Store : `2.1.24` (5 oct 2025)
Version locale : `1.1.1`

Causes possibles :
- Secret `HOMEY_TOKEN` expiré
- Workflows GitHub Actions mal configurés
- Prompts interactifs bloquant l'automatisation

**Solution :** publier manuellement via les méthodes ci-dessus.
