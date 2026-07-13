// test-oauth.js — test OAuth refresh and Gmail API directly
// SECURITY: secrets are read from env vars, NOT hardcoded
const https = require('https');
const { URLSearchParams } = require('url');

const CLIENT_ID = process.env.GMAIL_CLIENT_ID || 'YOUR_CLIENT_ID';
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET || 'YOUR_CLIENT_SECRET';
const REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN || 'YOUR_REFRESH_TOKEN';

function post(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...headers }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function get(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: 'GET',
      headers
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.end();
  });
}

(async () => {
  console.log('=== TEST 1: REFRESH ACCESS TOKEN ===');
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: REFRESH_TOKEN,
    grant_type: 'refresh_token'
  });
  const refreshRes = await post('https://oauth2.googleapis.com/token', params.toString());
  console.log('Status:', refreshRes.status);
  console.log('Body:', refreshRes.body.substring(0, 500));
  
  if (refreshRes.status !== 200) {
    console.log('FAILED to refresh token');
    return;
  }
  
  const tokenData = JSON.parse(refreshRes.body);
  const accessToken = tokenData.access_token;
  console.log('Got access_token:', accessToken.substring(0, 30) + '...');
  console.log('Expires in:', tokenData.expires_in);
  
  console.log('\n=== TEST 2: LIST GMAIL MESSAGES ===');
  const listUrl = 'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=5';
  const listRes = await get(listUrl, { Authorization: 'Bearer ' + accessToken });
  console.log('Status:', listRes.status);
  console.log('Body:', listRes.body.substring(0, 1000));
  
  if (listRes.status === 200) {
    const data = JSON.parse(listRes.body);
    console.log('\nTotal messages (estimate):', data.resultSizeEstimate);
    if (data.messages) {
      console.log('Returned messages:', data.messages.length);
    }
  }
})();
