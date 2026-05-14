const fs = require('fs');
const path = require('path');

function replaceInDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      replaceInDir(fullPath);
    } else if (fullPath.endsWith('.jsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Replace single quote strings containing the URL
      content = content.replace(/'http:\/\/localhost:5000\/([^']+)'/g, '`${import.meta.env.VITE_API_URL}/$1`');
      
      // Replace backtick strings containing the URL
      content = content.replace(/`http:\/\/localhost:5000\/([^`]+)`/g, '`${import.meta.env.VITE_API_URL}/$1`');

      fs.writeFileSync(fullPath, content);
    }
  }
}

replaceInDir(path.join(__dirname, 'frontend', 'src'));
console.log('URLs replaced successfully!');
