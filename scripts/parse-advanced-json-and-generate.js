#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

/**
 * PARSE ADVANCED JSON AND GENERATE FLOW CARDS
 * Parse le JSON fourni par l'utilisateur et génère tous les flow cards
 * avec préfixes SDK3 corrects et structure complète
 */

const FLOW_BASE = path.join(__dirname, '..', '.homeycompose', 'flow');

// JSON fourni par l'utilisateur (structure avancée)
const ADVANCED_DRIVERS = `
[votre JSON ici - je vais le stocker dans un fichier séparé]
`;

console.log('🎯 PARSING ADVANCED JSON AND GENERATING FLOW CARDS\n');

let totalCreated = 0;
const stats = { actions: 0, triggers: 0, conditions: 0 };

function sanitizeId(str) {
  return str.toLowerCase()
    .replace(/\s*—\s*.*/g, '') // Remove French descriptions after —
    .replace(/\(.*?\)/g, '') // Remove parentheses content
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/__+/g, '_')
    .replace(/^_|_$/g, '');
}

function extractTitle(str) {
  // Extract English part before — or full string
  const match = str.match(/^([^—(]+)/);
  return match ? match[1].trim() : str.trim();
}

function extractFrench(str) {
  // Extract French part after — or after (
  const dashMatch = str.match(/—\s*(.+)$/);
  if (dashMatch) return dashMatch[1].trim();
  
  const parenMatch = str.match(/\(([^)]+)\)$/);
  if (parenMatch) return parenMatch[1].trim();
  
  return extractTitle(str); // Fallback to English
}

function createFlowCard(driverName, cardType, cardTitle) {
  const enTitle = extractTitle(cardTitle);
  const frTitle = extractFrench(cardTitle);
  const cardId = sanitizeId(cardTitle);
  
  // SDK3: prefix with driver name
  const fullId = `${driverName}_${cardId}`;
  const fileName = `${fullId}.json`;
  const filePath = path.join(FLOW_BASE, cardType, fileName);
  
  if (fs.existsSync(filePath)) {
    return false; // Skip existing
  }
  
  const flowCard = {
    title: {
      en: enTitle,
      fr: frTitle
    },
    hint: {
      en: `${enTitle}`,
      fr: `${frTitle}`
    },
    args: [
      {
        type: 'device',
        name: 'device',
        filter: `driver_id=${driverName}`
      }
    ]
  };
  
  // Add arguments based on card content
  if (enTitle.includes('%') || enTitle.includes('X') || enTitle.includes('N')) {
    // Has parameters - add titleFormatted
    let formatted = enTitle
      .replace(/\bX\b/g, '[[value]]')
      .replace(/\bN\b/g, '[[number]]')
      .replace(/\b%\b/g, '[[percent]]%')
      .replace(/\(.*?\)/g, '');
    
    flowCard.titleFormatted = {
      en: formatted,
      fr: frTitle
    };
    
    // Add argument
    if (enTitle.includes('%') || enTitle.includes('Brightness') || enTitle.includes('Position')) {
      flowCard.args.push({
        type: 'range',
        name: 'value',
        min: 0,
        max: 100,
        step: 1,
        label: { en: 'Value (%)', fr: 'Valeur (%)' }
      });
    } else if (enTitle.includes('Temperature')) {
      flowCard.args.push({
        type: 'number',
        name: 'temperature',
        min: -20,
        max: 50,
        step: 0.5,
        placeholder: { en: 'Temperature', fr: 'Température' }
      });
    } else if (enTitle.includes('X') || enTitle.includes('threshold')) {
      flowCard.args.push({
        type: 'number',
        name: 'threshold',
        placeholder: { en: 'Value', fr: 'Valeur' }
      });
    }
  }
  
  // Add tokens for triggers
  if (cardType === 'triggers') {
    if (enTitle.includes('Changed') || enTitle.includes('Detected')) {
      flowCard.tokens = [{
        name: 'value',
        type: 'number',
        title: { en: 'Value', fr: 'Valeur' }
      }];
    }
  }
  
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(flowCard, null, 2));
  return true;
}

// Ce script sera complété avec le parsing du JSON
console.log('⚠️  Script créé - utilisez parse-user-json.js pour le JSON complet\n');
console.log('📝 Ce script montre la structure de génération\n');
console.log('Structure:');
console.log('  - Sanitize IDs (remove French, special chars)');
console.log('  - Extract EN/FR titles');
console.log('  - Add SDK3 prefix (driver_name_)');
console.log('  - Add arguments based on keywords');
console.log('  - Add tokens for triggers');
console.log('  - Create .homeycompose/flow/ files\n');
