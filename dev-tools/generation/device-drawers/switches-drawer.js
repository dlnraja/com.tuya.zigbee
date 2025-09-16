/**
 * SWITCHES DRAWER MODULE
 * Génère des images spécifiques aux switches selon standards Johan Bendz
 */

class SwitchesDrawer {
    constructor(standards) {
        this.standards = standards;
        this.switchColors = standards.colorPalette.switches; // ['#4CAF50', '#8BC34A']
    }

    async drawOnCanvas(ctx, driverName, features, dimensions, standards) {
        const { width, height } = dimensions;
        const buttonCount = features.buttonCount || 1;
        
        // Background blanc professionnel
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);
        
        // Base du switch
        const margin = width * 0.15;
        const switchRect = {
            x: margin,
            y: margin,
            width: width - (margin * 2),
            height: height - (margin * 2)
        };
        
        // Gradient pour la base
        const gradient = ctx.createLinearGradient(
            switchRect.x, switchRect.y, 
            switchRect.x + switchRect.width, switchRect.y + switchRect.height
        );
        gradient.addColorStop(0, '#F8F8F8');
        gradient.addColorStop(1, '#E8E8E8');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(switchRect.x, switchRect.y, switchRect.width, switchRect.height);
        
        // Bordure du switch
        ctx.strokeStyle = this.switchColors[0];
        ctx.lineWidth = Math.max(1, width / 50);
        ctx.strokeRect(switchRect.x, switchRect.y, switchRect.width, switchRect.height);
        
        // Dessiner les boutons selon le nombre
        if (buttonCount > 0 && buttonCount <= 6) {
            this.drawMultipleButtons(ctx, buttonCount, switchRect, driverName);
        } else {
            this.drawSingleButton(ctx, switchRect);
        }
        
        // Indicateurs spéciaux
        if (driverName.includes('wireless')) {
            this.addWirelessIndicator(ctx, dimensions);
        }
        if (driverName.includes('touch')) {
            this.addTouchIndicator(ctx, dimensions);
        }
        if (driverName.includes('battery') || driverName.includes('cr2032')) {
            this.addBatteryIndicator(ctx, dimensions);
        }
    }

    drawMultipleButtons(ctx, count, switchRect, driverName) {
        const { x, y, width, height } = switchRect;
        const padding = 8;
        
        if (count <= 2) {
            // Disposition verticale
            const buttonHeight = (height - (padding * (count + 1))) / count;
            const buttonWidth = width - (padding * 2);
            
            for (let i = 0; i < count; i++) {
                const btnY = y + padding + (i * (buttonHeight + padding));
                const btnRect = {
                    x: x + padding,
                    y: btnY,
                    width: buttonWidth,
                    height: buttonHeight
                };
                this.draw3DButton(ctx, btnRect, i + 1);
            }
        } else if (count <= 4) {
            // Disposition 2x2
            const cols = 2;
            const rows = Math.ceil(count / cols);
            const buttonWidth = (width - (padding * 3)) / cols;
            const buttonHeight = (height - (padding * (rows + 1))) / rows;
            
            for (let i = 0; i < count; i++) {
                const col = i % cols;
                const row = Math.floor(i / cols);
                const btnRect = {
                    x: x + padding + (col * (buttonWidth + padding)),
                    y: y + padding + (row * (buttonHeight + padding)),
                    width: buttonWidth,
                    height: buttonHeight
                };
                this.draw3DButton(ctx, btnRect, i + 1);
            }
        } else {
            // Disposition 3x2 pour 5-6 boutons
            const cols = 3;
            const rows = Math.ceil(count / cols);
            const buttonWidth = (width - (padding * 4)) / cols;
            const buttonHeight = (height - (padding * (rows + 1))) / rows;
            
            for (let i = 0; i < count; i++) {
                const col = i % cols;
                const row = Math.floor(i / cols);
                const btnRect = {
                    x: x + padding + (col * (buttonWidth + padding)),
                    y: y + padding + (row * (buttonHeight + padding)),
                    width: buttonWidth,
                    height: buttonHeight
                };
                this.draw3DButton(ctx, btnRect, i + 1);
            }
        }
    }

    drawSingleButton(ctx, switchRect) {
        const { x, y, width, height } = switchRect;
        const buttonSize = Math.min(width, height) * 0.6;
        const btnRect = {
            x: x + (width - buttonSize) / 2,
            y: y + (height - buttonSize) / 2,
            width: buttonSize,
            height: buttonSize
        };
        
        this.draw3DButton(ctx, btnRect, 1);
    }

    draw3DButton(ctx, rect, buttonNumber) {
        const { x, y, width, height } = rect;
        
        // Ombre
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.fillRect(x + 2, y + 2, width, height);
        
        // Corps du bouton
        const buttonGradient = ctx.createLinearGradient(x, y, x, y + height);
        buttonGradient.addColorStop(0, this.switchColors[0]);
        buttonGradient.addColorStop(1, this.switchColors[1]);
        
        ctx.fillStyle = buttonGradient;
        ctx.fillRect(x, y, width, height);
        
        // Bordure
        ctx.strokeStyle = this.switchColors[1];
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, width, height);
        
        // Highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(x + 1, y + 1, width - 2, 3);
        
        // Numéro du bouton si assez grand
        if (width > 20 && height > 20) {
            ctx.fillStyle = 'white';
            ctx.font = `${Math.min(width, height) / 3}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(buttonNumber.toString(), x + width/2, y + height/2);
        }
    }

    addWirelessIndicator(ctx, dimensions) {
        const { width, height } = dimensions;
        const size = Math.min(width, height) * 0.15;
        const x = width - size - 5;
        const y = 5;
        
        // Ondes WiFi stylisées
        ctx.strokeStyle = this.switchColors[0];
        ctx.lineWidth = 2;
        
        for (let i = 0; i < 3; i++) {
            const radius = (i + 1) * 4;
            ctx.beginPath();
            ctx.arc(x + size/2, y + size, radius, Math.PI, 0, false);
            ctx.stroke();
        }
    }

    addTouchIndicator(ctx, dimensions) {
        const { width, height } = dimensions;
        const size = 8;
        const x = 5;
        const y = 5;
        
        // Icône tactile (empreinte stylisée)
        ctx.fillStyle = this.switchColors[0];
        ctx.beginPath();
        ctx.arc(x + size/2, y + size/2, size/2, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.fillStyle = 'white';
        ctx.font = `${size}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✋', x + size/2, y + size/2);
    }

    addBatteryIndicator(ctx, dimensions) {
        const { width, height } = dimensions;
        const batteryWidth = 12;
        const batteryHeight = 6;
        const x = width - batteryWidth - 5;
        const y = height - batteryHeight - 5;
        
        // Corps de la batterie
        ctx.fillStyle = this.switchColors[0];
        ctx.fillRect(x, y, batteryWidth - 2, batteryHeight);
        
        // Borne positive
        ctx.fillRect(x + batteryWidth - 2, y + 1, 2, batteryHeight - 2);
        
        // Niveau de charge
        ctx.fillStyle = '#00FF00';
        ctx.fillRect(x + 1, y + 1, (batteryWidth - 4) * 0.8, batteryHeight - 2);
    }

    generateSVG(driverName, features, dimensions) {
        const { width, height } = dimensions;
        const buttonCount = features.buttonCount || 1;
        
        let buttonsHTML = '';
        
        if (buttonCount > 0 && buttonCount <= 6) {
            buttonsHTML = this.generateButtonsSVG(buttonCount, width, height);
        } else {
            buttonsHTML = this.generateSingleButtonSVG(width, height);
        }
        
        return `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="switchBase" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#F8F8F8;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#E8E8E8;stop-opacity:1" />
                </linearGradient>
                <linearGradient id="buttonGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:${this.switchColors[0]};stop-opacity:1" />
                    <stop offset="100%" style="stop-color:${this.switchColors[1]};stop-opacity:1" />
                </linearGradient>
            </defs>
            
            <!-- Background -->
            <rect width="100%" height="100%" fill="white"/>
            
            <!-- Switch base -->
            <rect x="15%" y="15%" width="70%" height="70%" fill="url(#switchBase)" stroke="${this.switchColors[0]}" stroke-width="2" rx="5"/>
            
            <!-- Buttons -->
            ${buttonsHTML}
            
            <!-- Indicators -->
            ${driverName.includes('wireless') ? this.generateWirelessIndicatorSVG(width, height) : ''}
            ${driverName.includes('touch') ? this.generateTouchIndicatorSVG(width, height) : ''}
            ${(driverName.includes('battery') || driverName.includes('cr2032')) ? this.generateBatteryIndicatorSVG(width, height) : ''}
        </svg>`;
    }

    generateButtonsSVG(count, totalWidth, totalHeight) {
        const baseX = totalWidth * 0.15;
        const baseY = totalHeight * 0.15;
        const baseWidth = totalWidth * 0.7;
        const baseHeight = totalHeight * 0.7;
        const padding = 8;
        
        let buttons = '';
        
        if (count <= 2) {
            const buttonHeight = (baseHeight - (padding * (count + 1))) / count;
            const buttonWidth = baseWidth - (padding * 2);
            
            for (let i = 0; i < count; i++) {
                const y = baseY + padding + (i * (buttonHeight + padding));
                buttons += `
                <rect x="${baseX + padding}" y="${y}" width="${buttonWidth}" height="${buttonHeight}" 
                      fill="url(#buttonGrad)" stroke="${this.switchColors[1]}" stroke-width="1" rx="3"/>
                <rect x="${baseX + padding + 1}" y="${y + 1}" width="${buttonWidth - 2}" height="3" 
                      fill="rgba(255,255,255,0.3)" rx="2"/>
                ${buttonWidth > 20 ? `<text x="${baseX + padding + buttonWidth/2}" y="${y + buttonHeight/2}" 
                      text-anchor="middle" dominant-baseline="middle" fill="white" 
                      font-family="Arial" font-size="${Math.min(buttonWidth, buttonHeight)/3}">${i + 1}</text>` : ''}
                `;
            }
        } else if (count <= 4) {
            const cols = 2;
            const rows = Math.ceil(count / cols);
            const buttonWidth = (baseWidth - (padding * 3)) / cols;
            const buttonHeight = (baseHeight - (padding * (rows + 1))) / rows;
            
            for (let i = 0; i < count; i++) {
                const col = i % cols;
                const row = Math.floor(i / cols);
                const x = baseX + padding + (col * (buttonWidth + padding));
                const y = baseY + padding + (row * (buttonHeight + padding));
                
                buttons += `
                <rect x="${x}" y="${y}" width="${buttonWidth}" height="${buttonHeight}" 
                      fill="url(#buttonGrad)" stroke="${this.switchColors[1]}" stroke-width="1" rx="3"/>
                <rect x="${x + 1}" y="${y + 1}" width="${buttonWidth - 2}" height="3" 
                      fill="rgba(255,255,255,0.3)" rx="2"/>
                ${buttonWidth > 15 ? `<text x="${x + buttonWidth/2}" y="${y + buttonHeight/2}" 
                      text-anchor="middle" dominant-baseline="middle" fill="white" 
                      font-family="Arial" font-size="${Math.min(buttonWidth, buttonHeight)/3}">${i + 1}</text>` : ''}
                `;
            }
        } else {
            const cols = 3;
            const rows = Math.ceil(count / cols);
            const buttonWidth = (baseWidth - (padding * 4)) / cols;
            const buttonHeight = (baseHeight - (padding * (rows + 1))) / rows;
            
            for (let i = 0; i < count; i++) {
                const col = i % cols;
                const row = Math.floor(i / cols);
                const x = baseX + padding + (col * (buttonWidth + padding));
                const y = baseY + padding + (row * (buttonHeight + padding));
                
                buttons += `
                <rect x="${x}" y="${y}" width="${buttonWidth}" height="${buttonHeight}" 
                      fill="url(#buttonGrad)" stroke="${this.switchColors[1]}" stroke-width="1" rx="2"/>
                <rect x="${x + 1}" y="${y + 1}" width="${buttonWidth - 2}" height="2" 
                      fill="rgba(255,255,255,0.3)" rx="1"/>
                ${buttonWidth > 12 ? `<text x="${x + buttonWidth/2}" y="${y + buttonHeight/2}" 
                      text-anchor="middle" dominant-baseline="middle" fill="white" 
                      font-family="Arial" font-size="${Math.min(buttonWidth, buttonHeight)/4}">${i + 1}</text>` : ''}
                `;
            }
        }
        
        return buttons;
    }

    generateSingleButtonSVG(totalWidth, totalHeight) {
        const baseX = totalWidth * 0.15;
        const baseY = totalHeight * 0.15;
        const baseWidth = totalWidth * 0.7;
        const baseHeight = totalHeight * 0.7;
        
        const buttonSize = Math.min(baseWidth, baseHeight) * 0.6;
        const buttonX = baseX + (baseWidth - buttonSize) / 2;
        const buttonY = baseY + (baseHeight - buttonSize) / 2;
        
        return `
        <rect x="${buttonX}" y="${buttonY}" width="${buttonSize}" height="${buttonSize}" 
              fill="url(#buttonGrad)" stroke="${this.switchColors[1]}" stroke-width="1" rx="5"/>
        <rect x="${buttonX + 1}" y="${buttonY + 1}" width="${buttonSize - 2}" height="3" 
              fill="rgba(255,255,255,0.3)" rx="2"/>
        `;
    }

    generateWirelessIndicatorSVG(width, height) {
        const size = Math.min(width, height) * 0.15;
        const x = width - size - 5;
        const y = 5;
        
        return `
        <g stroke="${this.switchColors[0]}" stroke-width="2" fill="none">
            <path d="M ${x + size/2 - 4} ${y + size} A 4 4 0 0 1 ${x + size/2 + 4} ${y + size}"/>
            <path d="M ${x + size/2 - 8} ${y + size} A 8 8 0 0 1 ${x + size/2 + 8} ${y + size}"/>
            <path d="M ${x + size/2 - 12} ${y + size} A 12 12 0 0 1 ${x + size/2 + 12} ${y + size}"/>
        </g>
        `;
    }

    generateTouchIndicatorSVG(width, height) {
        const size = 8;
        const x = 5;
        const y = 5;
        
        return `
        <circle cx="${x + size/2}" cy="${y + size/2}" r="${size/2}" fill="${this.switchColors[0]}"/>
        <text x="${x + size/2}" y="${y + size/2 + 1}" text-anchor="middle" dominant-baseline="middle" 
              fill="white" font-family="Arial" font-size="${size}">✋</text>
        `;
    }

    generateBatteryIndicatorSVG(width, height) {
        const batteryWidth = 12;
        const batteryHeight = 6;
        const x = width - batteryWidth - 5;
        const y = height - batteryHeight - 5;
        
        return `
        <g>
            <rect x="${x}" y="${y}" width="${batteryWidth - 2}" height="${batteryHeight}" fill="${this.switchColors[0]}"/>
            <rect x="${x + batteryWidth - 2}" y="${y + 1}" width="2" height="${batteryHeight - 2}" fill="${this.switchColors[0]}"/>
            <rect x="${x + 1}" y="${y + 1}" width="${(batteryWidth - 4) * 0.8}" height="${batteryHeight - 2}" fill="#00FF00"/>
        </g>
        `;
    }
}

module.exports = SwitchesDrawer;
