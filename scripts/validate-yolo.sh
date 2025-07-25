# Script de validation YOLO MODE
# Description: Vérifier que le mode YOLO est activé avec auto-approve et auto-continue

echo "🔍 Validation YOLO MODE..."

# Vérifier la configuration YOLO
if [ -f "package.json" ]; then
    echo "✅ package.json trouvé"
    
    # Vérifier la configuration YOLO
    if grep -q '"yolo"' package.json; then
        echo "✅ Configuration YOLO trouvée"
        
        # Vérifier auto-approve
        if grep -q '"auto-approve": true' package.json; then
            echo "✅ Auto-approve: Enabled"
        else
            echo "❌ Auto-approve: Disabled"
        fi
        
        # Vérifier auto-continue
        if grep -q '"auto-continue": true' package.json; then
            echo "✅ Auto-continue: Enabled"
        else
            echo "❌ Auto-continue: Disabled"
        fi
        
        # Vérifier delay
        if grep -q '"delay": 0.1' package.json; then
            echo "✅ Delay: 0.1 secondes"
        else
            echo "❌ Delay: Incorrect"
        fi
        
        # Vérifier startup
        if grep -q '"startup": "enabled"' package.json; then
            echo "✅ Startup: Enabled"
        else
            echo "❌ Startup: Disabled"
        fi
        
    else
        echo "❌ Configuration YOLO non trouvée"
    fi
else
    echo "❌ package.json non trouvé"
fi

echo ""
echo "🚀 YOLO MODE VALIDATION COMPLETE"
