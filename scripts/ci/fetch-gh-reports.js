const { execSync } = require('child_process');

try {
  console.log('Fetching latest GitHub Actions failed reports...');
  
  // Get recent failed runs in JSON format
  const output = execSync('gh run list --limit 20 --status failure --json databaseId,name,conclusion,createdAt,url', { encoding: 'utf8' });
  const runs = JSON.parse(output);
  
  if (runs.length === 0) {
    console.log('✅ No recent failed GitHub Actions found.');
    process.exit(0);
  }

  console.log(`Found ${runs.length} failed workflows. Details:\n`);

  for (const run of runs) {
    console.log(`❌ Workflow: ${run.name}`);
    console.log(`   ID: ${run.databaseId}`);
    console.log(`   Date: ${new Date(run.createdAt).toLocaleString()}`);
    console.log(`   URL: ${run.url}`);
    
    // Attempt to fetch the failed step logs
    try {
      console.log(`   -- Logs Snippet --`);
      const log = execSync(`gh run view ${run.databaseId} --log-failed`, { encoding: 'utf8', stdio: 'pipe' });
      const logLines = log.split('\n').slice(-15).join('\n'); // Show last 15 lines of failure
      console.log(logLines);
    } catch (e) {
      console.log(`   (Logs not available or expired)`);
    }
    console.log('\n----------------------------------------\n');
  }

} catch (error) {
  console.error('Failed to fetch GitHub reports. Ensure "gh" CLI is installed and authenticated.');
  console.error(error.message);
}
