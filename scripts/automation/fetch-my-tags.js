#!/usr/bin/env node
'use strict';
const { execSync } = require('child_process');
const fs = require('fs');

console.log("Fetching GitHub notifications...");

try {
  // Try to list notifications
  const raw = execSync('gh api notifications', { encoding: 'utf8' });
  const notifications = JSON.parse(raw);

  if (notifications.length === 0) {
    console.log("No new notifications.");
    process.exit(0);
  }

  let output = "# Nouveaux Messages et Tags GitHub\n\n";

  for (const notif of notifications) {
    if (notif.reason === 'mention' || notif.reason === 'assign' || notif.reason === 'comment') {
      output += `## [${notif.repository.full_name}] ${notif.subject.title}\n`;
      output += `- Type: ${notif.subject.type}\n`;
      output += `- Reason: ${notif.reason}\n`;
      
      try {
        // Fetch the actual issue or comment thread
        if (notif.subject.url) {
          const apiPath = notif.subject.url.replace('https://api.github.com', '');
          const detail = JSON.parse(execSync(`gh api "${apiPath}"`, { encoding: 'utf8' }));
          output += `\n**Description / Dernier Message:**\n${detail.body || 'Aucun texte'}\n`;
        }
      } catch (err) {
        output += `\n*(Impossible de charger le contenu détaillé)*\n`;
      }
      output += `\n---\n\n`;
    }
  }

  fs.writeFileSync('scratch/new_tags.md', output, 'utf8');
  console.log("✅ Les notifications ont été exportées dans scratch/new_tags.md");

} catch (err) {
  console.error("❌ ERREUR: Impossible d'accéder à GitHub.");
  console.error("Veuillez vous assurer d'être connecté. Lancez la commande suivante dans le terminal :");
  console.error("  gh auth login");
  console.error("\nDétails de l'erreur :", err.message);
  process.exit(1);
}
