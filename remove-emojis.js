const fs = require('fs');
const path = require('path');

function removeEmojis(str) {
  // Regex to match emojis
  return str.replace(/\p{Extended_Pictographic}/gu, '');
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js') || fullPath.endsWith('.css')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      const original = content;
      content = removeEmojis(content);
      if (content !== original) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log('Removed emojis from:', fullPath);
      }
    }
  }
}

const targetDir = path.join(__dirname, 'frontend', 'src');
console.log('Scanning for emojis in:', targetDir);
processDirectory(targetDir);
console.log('Done.');
