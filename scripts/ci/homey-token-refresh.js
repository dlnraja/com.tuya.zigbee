#!/usr/bin/env node
'use strict';

/**
 * Homey account-token refresher for CI.
 *
 * The Homey Apps API (publish/promote) accepts the long-lived HOMEY_PAT from
 * the developer portal, but the Athom ACCOUNT API (/user/me, Homey list,
 * live device diagnostics) requires an OAuth user token. Those expire after
 * ~1 hour, so CI keeps the long-lived REFRESH token in the HOMEY_REFRESH_TOKEN
 * secret and exchanges it at run time.
 *
 * This script:
 *   1. exchanges HOMEY_REFRESH_TOKEN for a fresh access token;
 *   2. exports it as HOMEY_ACCOUNT_TOKEN via $GITHUB_ENV (subsequent steps
 *      and .github/scripts/homey-device-diagnostics.js pick it up);
 *   3. writes the ROTATED refresh token back to the HOMEY_REFRESH_TOKEN
 *      secret via `gh secret set` (Athom rotates refresh tokens on every
 *      exchange — without the write-back the chain dies after one run).
 *
 * Required env: HOMEY_REFRESH_TOKEN. Optional: GH_PAT (secret write-back).
 * The OAuth client id/secret are the public Homey CLI credentials bundled in
 * the published `homey` npm package (node_modules/homey/config).
 */

const fs = require('fs');
const { execFileSync } = require('child_process');
const { ATHOM_API_CLIENT_ID, ATHOM_API_CLIENT_SECRET } = require('homey/config');

async function refreshHomeyToken() {
  const refreshToken = process.env.HOMEY_REFRESH_TOKEN;
  if (!refreshToken) {
    console.log('HOMEY_REFRESH_TOKEN not set — skipping account-token refresh');
    return null;
  }

  const basic = Buffer.from(`${ATHOM_API_CLIENT_ID}:${ATHOM_API_CLIENT_SECRET}`).toString('base64');
  const res = await fetch('https://api.athom.com/oauth2/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }).toString(),
  });
  const body = await res.json().catch(() => ({}));

  if (!res.ok || !body.access_token) {
    console.log(`::warning::Homey token refresh failed (${res.status}): ${body.error_description || body.error || 'unknown error'}`);
    console.log('::warning::Rotate the HOMEY_REFRESH_TOKEN secret: run `npx homey login` locally, then store the new refresh token.');
    return null;
  }

  if (process.env.GITHUB_ENV) {
    fs.appendFileSync(process.env.GITHUB_ENV, `HOMEY_ACCOUNT_TOKEN=${body.access_token}\n`);
  }
  console.log(`Homey account token refreshed (valid ${body.expires_in}s) and exported as HOMEY_ACCOUNT_TOKEN`);

  // Athom rotates the refresh token on every exchange — persist the new one
  // or the next run starts with a dead token.
  if (body.refresh_token && process.env.GH_PAT) {
    try {
      execFileSync('gh', ['secret', 'set', 'HOMEY_REFRESH_TOKEN'], {
        input: body.refresh_token,
        env: { ...process.env, GH_TOKEN: process.env.GH_PAT },
        stdio: ['pipe', 'inherit', 'inherit'],
      });
      console.log('Rotated HOMEY_REFRESH_TOKEN secret updated');
    } catch (e) {
      console.log(`::warning::Could not write back rotated HOMEY_REFRESH_TOKEN: ${e.message}`);
    }
    // Local dev: keep the Homey CLI session (athom-cli settings) in sync so a
    // local refresh does not kill the CLI login (and vice versa).
    try {
      const settingsPath = process.env.APPDATA
        && require('path').join(process.env.APPDATA, 'athom-cli', 'settings.json');
      if (settingsPath && fs.existsSync(settingsPath)) {
        const s = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        if (s.homeyApi && s.homeyApi.token) {
          s.homeyApi.token = {
            token_type: body.token_type,
            access_token: body.access_token,
            refresh_token: body.refresh_token,
            expires_in: body.expires_in,
            grant_type: 'refresh_token',
          };
          fs.writeFileSync(settingsPath, JSON.stringify(s, null, 2));
          console.log('Local athom-cli session synced with rotated token');
        }
      }
    } catch (_e) { /* local sync is best-effort */ }
  } else if (body.refresh_token) {
    console.log('::warning::GH_PAT not set — rotated refresh token NOT persisted; next run may fail');
  }

  return body.access_token;
}

module.exports = { refreshHomeyToken };

if (require.main === module) {
  refreshHomeyToken().catch((e) => {
    console.log(`::warning::homey-token-refresh crashed: ${e.message}`);
  });
}
