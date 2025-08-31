// Simple script to check Git configuration
const { exec } = require('child_process');

console.log('Checking Git configuration...\n');

// Function to run a command and return the output
function runCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing command: ${command}`);
        console.error(stderr);
        reject(error);
        return;
      }
      resolve(stdout.trim());
    });
  });
}

// Check Git configuration
async function checkGitConfig() {
  try {
    // Check if Git is installed
    const gitVersion = await runCommand('git --version');
    console.log(`✅ ${gitVersion}`);
    
    // Get Git user name
    try {
      const userName = await runCommand('git config user.name');
      console.log(`✅ Git User Name: ${userName}`);
    } catch (e) {
      console.log('❌ Git User Name not set');
    }
    
    // Get Git user email
    try {
      const userEmail = await runCommand('git config user.email');
      console.log(`✅ Git User Email: ${userEmail}`);
    } catch (e) {
      console.log('❌ Git User Email not set');
    }
    
    // Check if we're in a Git repository
    try {
      const gitDir = await runCommand('git rev-parse --git-dir');
      console.log(`✅ Inside Git repository: ${gitDir}`);
      
      // Get current branch
      try {
        const branch = await runCommand('git branch --show-current');
        console.log(`✅ Current branch: ${branch}`);
      } catch (e) {
        console.log('❌ Could not determine current branch');
      }
    } catch (e) {
      console.log('❌ Not inside a Git repository');
    }
    
  } catch (error) {
    console.error('❌ Git is not installed or not in PATH');
    process.exit(1);
  }
}

// Run the check
checkGitConfig().catch(console.error);
