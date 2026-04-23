const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const CURTAIN_MOTOR_LARGE = path.join(ROOT, 'drivers', 'curtain_motor', 'assets', 'images', 'large.png');

function log(msg) {
  console.log(`[RECURSIVE-VALIDATOR] ${msg}`);
}

async function runRecursiveValidation(maxRetries = 5) {
  let attempt = 0;
  let success = false;

  while (attempt < maxRetries && !success) {
    attempt++;
    log(`Attempt ${attempt}/${maxRetries}...`);

    const result = spawnSync('npx', ['homey', 'app', 'validate', '--level', 'publish'], { 
      encoding: 'utf8',
      shell: true 
    });

    if (result.status === 0) {
      log(' Validation successful!');
      success = true;
      break;
    }

    const output = result.stdout + result.stderr;
    const filteredOutput = output.split('\n')
      .filter(line => !line.includes('Added Driver') && !line.includes('Added FlowCard'))
      .join('\n');

    log(' Validation failed.');

    // Look for Invalid image errors (using filtered output for regex)
    const imageErrorMatch = filteredOutput.match(/Invalid image drivers\.([^\.]+)\.([^\s:]+)/);
    if (imageErrorMatch) {
      const driverName = imageErrorMatch[1];
      const imageType = imageErrorMatch[2]; // e.g., 'large' or 'small'
      log(` Detected invalid image for driver: ${driverName} (${imageType})`);
      
      const dstDir = path.join(ROOT, 'drivers', driverName, 'assets', 'images');
      const filename = imageType === 'small' ? 'small.png' : 'large.png'      ;
      const dst = path.join(dstDir, filename);
      
      const templateFilename = imageType === 'small' ? 'small.png' : 'large.png'      ;
      const templatePath = path.join(ROOT, 'drivers', 'curtain_motor', 'assets', 'images', templateFilename);

      if (!fs.existsSync(dstDir)) {
        fs.mkdirSync(dstDir, { recursive: true });
      }

      log(` Fixing ${driverName} ${filename} by copying template from curtain_motor...`);
      try {
        if (!fs.existsSync(templatePath)) {
            log(` Template not found at ${templatePath}`);
            break;
        }
        fs.copyFileSync(templatePath, dst);
        log(` Fixed ${driverName} ${filename}.`);
        continue; // Retry
      } catch (err) {
        log(` Failed to fix ${driverName}: ${err.message}`);
        break;
      }
    }

    // Look for Duplicate Flow Card errors
    const duplicateFlowMatch = filteredOutput.match(/Found multiple Flow card ([^ ]+) with the id "([^"]+)"/);
    if (duplicateFlowMatch) {
      const type = duplicateFlowMatch[1]; // triggers/conditions/actions
      const cardId = duplicateFlowMatch[2];
      log(` Detected duplicate Flow card ${type} ID: "${cardId}"`);
      log(` Searching for occurrences in drivers...`);
      
      // We don't auto-fix this yet because it's risky, but we report it clearly
      log(` Manual intervention required for duplicate ID: ${cardId}`);
    }

    // Check for other common errors
    if (filteredOutput.includes('Validation Error') || filteredOutput.includes('Found multiple Flow card')) {
      log(' A critical Validation Error occurred.');
      log('------- Filtered Output Start -------');
      console.log(filteredOutput);
      log('------- Filtered Output End -------');
    } else {
      log(' No auto-fixable image error detected. Output:');
      console.log(filteredOutput);
    }
    break;
  }

  if (!success) {
    log(' Validation failed after all attempts.');
    process.exit(1);
  }
}

runRecursiveValidation().catch(err => {
  console.error(err);
  process.exit(1);
});
