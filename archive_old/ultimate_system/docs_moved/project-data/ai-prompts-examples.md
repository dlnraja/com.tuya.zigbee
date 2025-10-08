# 🤖 PROMPTS D'EXEMPLE POUR GÉNÉRATION D'IMAGES IA

## 🎨 DALL-E 3 / GPT-4 Vision

### Smart Switch 3 Gang (250x175px - large)
```
Professional smart wall switch with exactly 3 round buttons arranged horizontally, 
white matte plastic housing, minimalist design, no brand logos, clean geometric 
shapes, soft LED indicators, white background, Homey SDK3 style, unbranded, 
high contrast for AI recognition, 250x175 pixels, PNG format
```

### Motion Sensor PIR (75x75px - small)
```
White PIR motion sensor dome, honeycomb pattern on black lens, compact design, 
soft LED status indicator, no branding, minimalist professional style, 
white transparent background, optimized for OpenCV recognition, 75x75 pixels, 
Johan Bendz inspired design
```

### Smart Plug Energy Monitor (500x350px - xlarge)
```
White smart plug with EU power outlets, energy monitoring display, LED ring 
indicator, cylindrical compact design, no brand text or logos, professional 
unbranded appearance, white background, high contrast geometric shapes, 
500x350 pixels, Homey SDK3 compliant
```

## 🎯 MIDJOURNEY PROMPTS

### Style général:
```
--style raw --stylize 100 --quality 2 --v 6
```

### Switch 2 Gang:
```
professional white smart light switch, 2 circular buttons, minimalist design, 
unbranded, matte plastic, soft shadows, white background --ar 10:7 --style raw 
--stylize 100
```

### Temperature Sensor:
```
compact white temperature sensor, LCD display, ventilation grilles, rectangular 
housing, professional unbranded design, white background --ar 1:1 --style raw
```

## 🖥️ STABLE DIFFUSION

### Base prompt:
```
professional smart home device, white plastic housing, minimalist unbranded 
design, clean geometric shapes, white background, product photography, 
high contrast, no logos, Homey style
```

### Paramètres recommandés:
- Steps: 50-80
- CFG Scale: 7-12
- Sampler: DPM++ 2M Karras
- Size: Exact Homey dimensions

## 📐 SPÉCIFICATIONS TECHNIQUES PAR TAILLE

### SMALL (75x75px) - Icône driver
- **Usage**: Liste des drivers dans Homey
- **Détail**: Minimal, forme reconnaissable
- **Exemple**: Silhouette simple du device

### LARGE (250x175px) - Carte device  
- **Usage**: Carte du device dans l'app
- **Détail**: Modéré, éléments clés visibles
- **Exemple**: Vue 3/4 avec détails principaux

### XLARGE (500x350px) - Page détails
- **Usage**: Page de configuration du device
- **Détail**: Maximum, tous éléments visibles  
- **Exemple**: Vue détaillée, haute qualité

## ✅ VALIDATION DES RÉSULTATS

### Checklist post-génération:
1. **Dimensions exactes** - Vérifier avec un éditeur d'image
2. **Poids fichier** - Optimiser si > 50KB avec TinyPNG
3. **Transparence** - PNG avec fond transparent ou blanc pur
4. **Contraste** - Tester avec WCAG contrast checker
5. **Reconnaissance** - Tester avec OpenCV/Google Vision
6. **Style** - Comparer avec autres drivers pour cohérence
7. **Branding** - Aucun logo ou texte de marque visible

### Outils de validation:
- **WebAIM Contrast Checker**: https://webaim.org/resources/contrastchecker/
- **TinyPNG**: https://tinypng.com/
- **Google Vision API**: Test de reconnaissance d'objets
- **OpenCV Python**: Test de détection de contours

---
*Prompts optimisés pour Homey SDK3 + Johan Bendz + Reconnaissance IA*
