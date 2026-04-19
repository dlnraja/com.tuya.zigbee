const fs = require('fs');
const file = '.github/scripts/fetch-gmail-diagnostics.js';
let content = fs.readFileSync(file, 'utf8');

// The main script should also verify that the sender domain is allowed just to be double safe
if (!content.includes('const ALLOWED_DOMAINS =')) {
  const allowedLogic = `
    const ALLOWED_DOMAINS = ['athom.com', 'homey.app', 'github.com'];
    res = res.filter(r => {
      if (!r.from) return false;
      return ALLOWED_DOMAINS.some(domain => r.from.toLowerCase().includes(domain));
    });
`;
  
  // Find where we process the result of IMAP read
  const target = "let res=await imap.readViaIMAP({";
  
  // We need to inject the filter right after res is returned
  // The actual line is: let res=await imap.readViaIMAP({afterDate:d});
  content = content.replace(
    "let res=await imap.readViaIMAP({afterDate:d});\n    if(!res)res=[];",
    "let res=await imap.readViaIMAP({afterDate:d});\n    if(!res)res=[];\n" + allowedLogic
  );
  
  fs.writeFileSync(file, content);
  console.log(' Added domain verification filter to fetch-gmail-diagnostics.js');
} else {
  console.log('Domain verification already present in fetch-gmail-diagnostics.js');
}
