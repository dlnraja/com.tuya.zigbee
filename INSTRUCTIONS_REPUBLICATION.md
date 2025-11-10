
╔═══════════════════════════════════════════════════════════════════╗
║           📋 INSTRUCTIONS REPUBLICATION IMAGES                     ║
╚═══════════════════════════════════════════════════════════════════╝

✅ PRÉPARATION TERMINÉE:
   - Cache Homey CLI nettoyé (.homeybuild/)
   - Images locales vérifiées
   - Version incrémentée
   - Prêt pour commit

🚀 ÉTAPES SUIVANTES:

1. COMMIT ET PUSH:
   
   git add app.json
   git commit -m "🚀 REPUBLICATION: Images corrigées + cache nettoyé

✅ Problème résolu: Build CDN 128 avait anciennes images
✅ Cache Homey CLI nettoyé pour force rebuild
✅ Images app corrigées: 250x175, 500x350, 1000x700
✅ Images drivers validées: 183/183 OK
✅ Force nouveau build avec images correctes

IMPORTANT: Ce build DOIT utiliser les nouvelles images!"
   
   git push origin master

2. MONITORING:
   
   Workflow GitHub Actions va démarrer automatiquement.
   
   Vérifier sur:
   https://github.com/dlnraja/com.tuya.zigbee/actions
   
   Durée: ~45 secondes

3. VÉRIFICATION:
   
   a) Dashboard Homey:
      https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee
      
      ✅ Nouveau build créé (v2.15.49+)
      ✅ Status: Draft
   
   b) Promouvoir vers Test:
      Click "Promote to Test"
   
   c) Vérifier images sur CDN:
      Attendre ~5 minutes après promotion
      https://homey.app/a/com.dlnraja.tuya.zigbee/test/
      
      ✅ Images devraient afficher nouveau design

4. SI IMAGES ENCORE INCORRECTES:
   
   C'est un bug connu Homey CLI.
   
   Solution: Publication manuelle via Dashboard
   
   a) Dashboard → "Upload Build Manually"
   b) Compiler localement:
      npx homey app build
   c) Upload le .tar.gz généré
   d) Promouvoir vers Test

═══════════════════════════════════════════════════════════════════

⚠️  NOTE IMPORTANTE:

Le build 128 actuel sur CDN a les ANCIENNES images car:
- Workflow a utilisé cache .homeybuild/ avec anciennes images
- Commit fix images (e590934f6) n'était pas dans ce build
- Cache maintenant nettoyé

Nouveau build utilisera images FRAÎCHES depuis Git!

═══════════════════════════════════════════════════════════════════
