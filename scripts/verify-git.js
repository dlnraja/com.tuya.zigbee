const { execSync } = require('child_process');

function checkGitConfig() {
  try {
    // Check if Git is installed
    execSync('git --version', { stdio: 'pipe' });
    
    // Get Git configuration
    const name = execSync('git config user.name', { stdio: 'pipe' }).toString().trim();
    const email = execSync('git config user.email', { stdio: 'pipe' }).toString().trim();
    
    console.log('Git Configuration:');
    console.log(`  User Name: ${name || 'Not set'}`);
    console.log(`  User Email: ${email || 'Not set'}`);
    
    if (name && email) {
      console.log('\n✅ Git is properly configured!');
      return true;
    } else {
      console.log('\n❌ Git configuration is incomplete.');
      return false;
    }
  } catch (error) {
    console.error('❌ Git is not installed or not in PATH');
    console.error(error.message);
    return false;
  }
}

// Run the check
if (checkGitConfig()) {
  console.log('\nYou can now proceed with your work.');
} else {
  console.log('\nPlease configure Git with the following commands:');
  console.log('git config --global user.name "dlnraja"');
  console.log('git config --global user.email "dylan.rajasekaram@gmail.com"');
  process.exit(1);
}
