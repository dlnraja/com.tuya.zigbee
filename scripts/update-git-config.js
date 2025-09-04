const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const GIT_CONFIG = {
  name: 'dlnraja',
  email: 'dylan.rajasekaram@gmail.com',
  branch: 'main'
};

function runCommand(command, cwd = process.cwd()) {
  console.log(`Running: ${command}`);
  try {
    const output = execSync(command, { cwd, stdio: 'pipe' });
    console.log(output.toString().trim());
    return true;
  } catch (error) {
    console.error(`Error executing command: ${command}`);
    console.error(error.stderr?.toString() || error.message);
    return false;
  }
}

function updateGitConfig() {
  console.log('Updating Git configuration...');
  
  // Set global Git configuration
  if (!runCommand(`git config --global user.name "${GIT_CONFIG.name}"`)) {
    console.error('Failed to set global Git user name');
    return false;
  }
  
  if (!runCommand(`git config --global user.email "${GIT_CONFIG.email}"`)) {
    console.error('Failed to set global Git email');
    return false;
  }
  
  // Set local Git configuration
  if (!runCommand(`git config user.name "${GIT_CONFIG.name}"`)) {
    console.error('Failed to set local Git user name');
    return false;
  }
  
  if (!runCommand(`git config user.email "${GIT_CONFIG.email}"`)) {
    console.error('Failed to set local Git email');
    return false;
  }
  
  // Update the last commit's author if needed
  if (fs.existsSync(path.join(process.cwd(), '.git'))) {
    console.log('Updating last commit author...');
    runCommand(`git commit --amend --reset-author --no-edit`);
  }
  
  console.log('Git configuration updated successfully!');
  return true;
}

// Run the configuration update
if (updateGitConfig()) {
  console.log('\nGit configuration is now set to:');
  console.log(`Name:  ${GIT_CONFIG.name}`);
  console.log(`Email: ${GIT_CONFIG.email}`);
  console.log('\nYou can now continue with your work.');
} else {
  console.error('Failed to update Git configuration');
  process.exit(1);
}
