#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const privacy = require('./privacy-redactor');

// Target ID to search for
const TARGET_ID = '5f100d21-0df6-42f8-a57c-fe6a09285819';
const OUTPUT_DIR = path.join(__dirname, '..', '..', 'diagnostics');
const OUTPUT_FILE = path.join(OUTPUT_DIR, `target-report-${TARGET_ID}.json`);

async function refreshAccessToken(clientId, clientSecret, refreshToken) {
  console.log('Refreshing Gmail OAuth2 Access Token...');
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token'
  });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });

  if (!res.ok) {
    const errText = privacy.redact(await res.text());
    throw new Error(`Failed to refresh access token: ${res.status} ${errText}`);
  }

  const data = await res.json();
  return data.access_token;
}

async function searchMessages(accessToken, query) {
  console.log(`Searching Gmail messages for query: "${query}"...`);
  const url = `https://www.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}`;
  
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!res.ok) {
    const errText = privacy.redact(await res.text());
    throw new Error(`Failed to search messages: ${res.status} ${errText}`);
  }

  const data = await res.json();
  return data.messages || [];
}

async function getMessage(accessToken, messageId) {
  console.log(`Fetching message details for ID: ${messageId}...`);
  const url = `https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`;
  
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!res.ok) {
    const errText = privacy.redact(await res.text());
    throw new Error(`Failed to fetch message ${messageId}: ${res.status} ${errText}`);
  }

  return res.json();
}

function decodePart(part) {
  let body = '';
  if (part.body && part.body.data) {
    const base64 = part.body.data.replace(/-/g, '+').replace(/_/g, '/');
    body += Buffer.from(base64, 'base64').toString('utf8');
  }
  if (part.parts) {
    for (const subPart of part.parts) {
      body += decodePart(subPart);
    }
  }
  return body;
}

function extractMessageBody(message) {
  const payload = message.payload;
  if (!payload) return '';
  return decodePart(payload);
}

async function main() {
  const clientId = String(process.env.GMAIL_CLIENT_ID || '').trim();
  const clientSecret = String(process.env.GMAIL_CLIENT_SECRET || '').trim();
  const refreshToken = String(process.env.GMAIL_REFRESH_TOKEN || '').trim();

  if (!clientId || !clientSecret || !refreshToken) {
    console.error('Error: Gmail OAuth2 credentials (GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN) are missing in the environment.');
    process.exit(1);
  }

  try {
    const accessToken = await refreshAccessToken(clientId, clientSecret, refreshToken);
    console.log('Access token retrieved successfully.');

    const messages = await searchMessages(accessToken, TARGET_ID);
    if (messages.length === 0) {
      console.log(`No Gmail messages found matching query "${TARGET_ID}".`);
      process.exit(1);
    }

    console.log(`Found ${messages.length} message(s). Retrieving first message...`);
    const msgDetails = await getMessage(accessToken, messages[0].id);
    
    const bodyText = extractMessageBody(msgDetails);
    
    // Save raw/extracted message content
    const reportData = {
      messageId: msgDetails.id,
      threadId: msgDetails.threadId,
      snippet: msgDetails.snippet,
      date: msgDetails.internalDate ? new Date(parseInt(msgDetails.internalDate)).toISOString() : null,
      headers: msgDetails.payload?.headers || [],
      extractedBody: bodyText
    };

    const safeReportData = privacy.redactObject(reportData);
    privacy.assertNoLeaks(safeReportData, OUTPUT_FILE);
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(safeReportData, null, 2));
    console.log(`Success! Diagnostic report saved to ${OUTPUT_FILE}`);
  } catch (error) {
    console.error('Fatal execution error:', error.message);
    process.exit(1);
  }
}

main();
