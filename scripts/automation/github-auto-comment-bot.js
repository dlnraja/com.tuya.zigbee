#!/usr/bin/env node

/**
 * 💬 GITHUB AUTO-COMMENT BOT v1.0.0
 *
 * Bot pour écrire automatiquement des commentaires sur les issues de Johan
 * Utilise seulement GITHUB_TOKEN standard pour écrire les commentaires
 * Comme vous l'avez déjà fait manuellement par le passé
 */

const fs = require('fs').promises;

class GitHubAutoCommentBot {
  constructor() {
    this.config = {
      githubToken: process.env.GITHUB_TOKEN,
      johanRepo: 'JohanBendz/com.tuya.zigbee',
      dlnrajaRepo: 'dlnraja/com.tuya.zigbee',
      apiBase: 'https://api.github.com'
    };

    this.processedComments = new Set();
  }

  /**
   * 📝 Logger simple
   */
  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level}] ${message}`);
    if (data) console.log(JSON.stringify(data, null, 2));
  }

  /**
   * 💬 Écrire un commentaire automatique sur une issue de Johan
   * Exactement comme vous l'avez fait manuellement
   */
  async postAutomaticComment(issueNumber, deviceInfo) {
    const commentBody = this.generateCommentMessage(deviceInfo);

    const url = `${this.config.apiBase}/repos/${this.config.johanRepo}/issues/${issueNumber}/comments`;

    try {
      this.log('INFO', `💬 Posting automatic comment on Johan issue #${issueNumber}...`);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `Bearer ${this.config.githubToken}`,
          'User-Agent': 'dlnraja-tuya-automation/1.0',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          body: commentBody
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`GitHub API error ${response.status}: ${errorText}`);
      }

      const result = await response.json();

      this.log('SUCCESS', `✅ Comment posted successfully on issue #${issueNumber}`, {
        commentId: result.id,
        commentUrl: result.html_url
      });

      this.processedComments.add(issueNumber);
      return true;

    } catch (error) {
      this.log('ERROR', `❌ Failed to post comment on issue #${issueNumber}`, error);
      return false;
    }
  }

  /**
   * ✍️ Générer le message de commentaire automatique
   * Dans le même style que vos commentaires manuels précédents
   */
  generateCommentMessage(deviceInfo) {
    const { manufacturerName, productId, deviceName, driverName } = deviceInfo;

    return `🤖 **DEVICE AUTOMATICALLY INTEGRATED!**

Hi! I've automatically detected and integrated your device request into my Tuya Zigbee app.

**Device Details:**
- **Manufacturer ID:** \`${manufacturerName || 'N/A'}\`
- **Product ID:** \`${productId || 'N/A'}\`
- **Device Name:** ${deviceName || 'Unknown Device'}
- **Driver:** ${driverName || 'auto-detected'}

**✅ STATUS: COMPLETED**
Your device has been automatically added to my repository and will be available in the next app update.

**📦 Download Link:**
🔗 **https://github.com/dlnraja/com.tuya.zigbee**

**🔄 Automatic Integration System:**
This device was detected and integrated through my automated GitHub monitoring system. The system:
- Monitors Johan's repository for new device requests
- Automatically parses Zigbee fingerprints
- Integrates devices into appropriate drivers
- Builds and deploys updates automatically
- Posts confirmation comments (like this one!)

No manual intervention needed - everything is automated! 🚀

**Questions?** Feel free to open an issue in my repository if you need any support.

---
*This comment was generated automatically by the dlnraja Tuya integration system.*`;
  }

  /**
   * 🔍 Vérifier si un commentaire a déjà été posté sur cette issue
   */
  async hasAlreadyCommented(issueNumber) {
    try {
      const url = `${this.config.apiBase}/repos/${this.config.johanRepo}/issues/${issueNumber}/comments`;

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'dlnraja-tuya-automation/1.0'
        }
      });

      if (!response.ok) {
        return false; // En cas d'erreur, on assume qu'on n'a pas commenté
      }

      const comments = await response.json();

      // Chercher un commentaire de notre bot
      const hasOurComment = comments.some(comment =>
        comment.body?.includes('dlnraja Tuya integration system') ||
        comment.body?.includes('DEVICE AUTOMATICALLY INTEGRATED') ||
        comment.user?.login === 'dlnraja' // Si c'est votre username GitHub
      );

      if (hasOurComment) {
        this.log('INFO', `💬 Already commented on issue #${issueNumber} - skipping`);
      }

      return hasOurComment;

    } catch (error) {
      this.log('WARN', `⚠️ Could not check existing comments on issue #${issueNumber}`, error);
      return false; // En cas d'erreur, on essaie de commenter quand même
    }
  }

  /**
   * 📧 Poster des commentaires sur plusieurs issues automatiquement
   */
  async postCommentsForProcessedDevices(processedDevices) {
    if (!this.config.githubToken) {
      this.log('ERROR', '❌ GITHUB_TOKEN is required to post comments');
      return [];
    }

    if (!processedDevices || processedDevices.length === 0) {
      this.log('INFO', '📝 No processed devices to comment on');
      return [];
    }

    const results = [];

    for (const deviceData of processedDevices) {
      try {
        const { issueNumber, deviceInfo } = deviceData;

        // Vérifier si on a déjà commenté
        const alreadyCommented = await this.hasAlreadyCommented(issueNumber);
        if (alreadyCommented) {
          results.push({ issueNumber, status: 'skipped', reason: 'already_commented' });
          continue;
        }

        // Attendre un peu entre chaque commentaire pour éviter rate limiting
        if (results.length > 0) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2 secondes
        }

        const success = await this.postAutomaticComment(issueNumber, deviceInfo);

        results.push({
          issueNumber,
          status: success ? 'success' : 'failed',
          deviceInfo
        });

      } catch (error) {
        this.log('ERROR', `❌ Error processing comment for device`, error);
        results.push({
          issueNumber: deviceData.issueNumber,
          status: 'error',
          error: error.message
        });
      }
    }

    this.log('SUCCESS', `📧 Comment posting completed: ${results.length} processed`, {
      successful: results.filter(r => r.status === 'success').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      failed: results.filter(r => r.status === 'failed').length
    });

    return results;
  }

  /**
   * 🎯 Interface publique pour intégration avec le monitor principal
   */
  static async postCommentsForDevices(processedDevices) {
    const bot = new GitHubAutoCommentBot();
    return await bot.postCommentsForProcessedDevices(processedDevices);
  }
}

module.exports = GitHubAutoCommentBot;

// Interface CLI
if (require.main === module) {
  const bot = new GitHubAutoCommentBot();

  // Exemple d'utilisation depuis la ligne de commande
  const testDevices = [
    {
      issueNumber: 1234, // Numéro d'issue de test
      deviceInfo: {
        manufacturerName: '_TZ3000_example123',
        productId: 'TS0011',
        deviceName: 'Test Smart Switch',
        driverName: 'plug_smart'
      }
    }
  ];

  bot.postCommentsForProcessedDevices(testDevices)
    .then(results => {
      console.log('✅ Test completed:', results);
    })
    .catch(error => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}
