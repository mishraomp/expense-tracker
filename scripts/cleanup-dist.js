const fs = require('fs');
const path = require('path');

function rm(dir) {
  if (!fs.existsSync(dir)) return;
  for (const file of fs.readdirSync(dir)) {
    const p = path.join(dir, file);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      rm(p);
    } else {
      if (file.endsWith('.map')) fs.unlinkSync(p);
    }
  }
}

rm(path.join(__dirname, '..', 'backend', 'dist'));
console.log('Cleanup complete');
