const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'lib', 'functions');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.ts'));

const ids = new Set();
let dup = false;

for (const file of files) {
  const content = fs.readFileSync(path.join(dir, file), 'utf-8');
  const matches = content.match(/id:\s*"([^"]+)"/g);
  if (matches) {
    for (const match of matches) {
      const id = match.split('"')[1];
      if (ids.has(id)) {
        console.log(`DUPLICATE ID: ${id} in file ${file}`);
        dup = true;
      }
      ids.add(id);
    }
  }
}

if (!dup) {
  console.log("No duplicates found.");
}
