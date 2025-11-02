# 🔴 PROBLÈMES RESTANTS À INVESTIGUER

D'après votre message:

## 1. ❌ Switch 2-gang toujours pas bon
**Status**: À investiguer
- Quel est le problème exact?
- Ne s'appaire pas?
- Ne répond pas aux commandes?
- Crashe?

## 2. ❌ Driver universel n'est pas visible dans la liste
**Status**: À vérifier si driver "universal" existe
- Devrait y avoir un dossier `drivers/universal/`
- Devrait être dans app.json

## 3. ❌ Flows ne fonctionnent pas
**Status**: À investiguer
- Quels flows spécifiquement?
- Erreur dans les logs?
- Flow triggers/conditions/actions?

## 4. ❌ Trop de flows bizarres qui ne devraient pas être là
**Status**: À nettoyer
- Quels flows? Screenshots?
- Flows créés automatiquement?
- Flow cards en double?

## 5. ❌ Aucune info batterie pour tous les drivers
**Status**: DEVRAIT ÊTRE FIXÉ avec v4.9.215
- TuyaEF00Manager émet maintenant events dp-4 (battery)
- À retester après déploiement

## 6. ❌ Aucune data qui remonte (null partout)
**Status**: DEVRAIT ÊTRE FIXÉ avec v4.9.215
- TuyaEF00Manager EventEmitter corrigé
- À retester après déploiement

---

**ATTENDRE**: v4.9.215 se déploie dans 5-15 min
**ENSUITE**: Retester et rapporter quels problèmes persistent
