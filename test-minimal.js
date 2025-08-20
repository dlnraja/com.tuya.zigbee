const { execSync } = require('child_process');

try {
  console.log('Testing Homey CLI...');
  const result = execSync('powershell -Command "homey --version"', { 
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 10000
  });
  console.log('Homey version:', result.trim());
  console.log('::END::TEST::OK');
} catch (error) {
  console.error('Error:', error.message);
  console.log('::END::TEST::FAIL');
}
