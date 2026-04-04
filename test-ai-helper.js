require('dotenv').config();
const { callAI, splitTaskAndCombine } = require('./.github/scripts/ai-helper.js');

(async () => {
  console.log("=== Testing callAI ===");
  const res1 = await callAI("Hi! Say 'Integration OK'", "You are a tester. Obey user perfectly.", { maxTokens: 20 });
  console.log("callAI result:", res1);

  console.log("\n=== Testing splitTaskAndCombine ===");
  // Give it a long enough string to trigger split:
  let longText = "This is a very long text designed to trigger the split task capability. ".repeat(60); 
  
  const res2 = await splitTaskAndCombine(longText, "Count the number of times the word 'long' appears.", { maxTokens: 50 });
  console.log("splitTaskAndCombine result:", res2);

})();
