const fs = require("fs"); const content = fs.readFileSync("drivers/_common/driver.compose.json", "utf8"); const fixed = content.replace(/"modelId": \[/, 
productId
:
[).replace(/"modelId": \[/, productId:
[); fs.writeFileSync("drivers/_common/driver.compose.json", fixed); console.log("✅ Driver _common corrigé !");
