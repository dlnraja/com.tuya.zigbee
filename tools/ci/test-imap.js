// test-imap.js — test Gmail IMAP with App Password directly
const tls = require('tls');
const { Socket } = require('tls');

const EMAIL = 'senetmarne@gmail.com';
const APP_PASSWORD = process.env.GMAIL_APP_PASSWORD_TEST || 'NOT_SET'; // would need actual password

function imapCommand(socket, cmd, wait = 500) {
  return new Promise((resolve, reject) => {
    let data = '';
    const onData = (chunk) => { data += chunk.toString(); };
    socket.on('data', onData);
    socket.write(cmd + '\r\n');
    setTimeout(() => {
      socket.removeListener('data', onData);
      resolve(data);
    }, wait);
  });
}

(async () => {
  if (APP_PASSWORD === 'NOT_SET') {
    console.log('No GMAIL_APP_PASSWORD provided via env, using placeholder test');
    console.log('This test would need the actual app password to work');
    return;
  }

  console.log('=== TEST GMAIL IMAP ===');
  console.log('Email:', EMAIL);
  console.log('Password length:', APP_PASSWORD.length);

  const socket = tls.connect(993, 'imap.gmail.com', { rejectUnauthorized: false }, () => {
    console.log('Connected to imap.gmail.com:993');
  });

  socket.on('error', (err) => {
    console.log('Connection error:', err.message);
  });

  let allData = '';
  socket.on('data', (chunk) => { allData += chunk.toString(); });

  // Wait for server greeting
  await new Promise(r => setTimeout(r, 1000));
  console.log('Server greeting:', allData.substring(0, 200));

  // Send LOGIN
  console.log('\n=== LOGIN ===');
  const loginCmd = `A1 LOGIN "${EMAIL}" "${APP_PASSWORD}"`;
  socket.write(loginCmd + '\r\n');
  await new Promise(r => setTimeout(r, 2000));
  console.log('LOGIN response:', allData.substring(0, 500));

  // Send LOGOUT
  socket.write('A2 LOGOUT\r\n');
  await new Promise(r => setTimeout(r, 500));
  socket.end();
})();
