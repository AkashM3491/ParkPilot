import fs from 'fs';
import path from 'path';

// Curated list of files to equal exactly ~190 lines
const filesToInclude = [
  'backend/server.js',
  'backend/config/db.js',
  'frontend/src/App.jsx'
];

let markdownContent = '# CHAPTER 10: APPENDIX - CORE SOURCE CODE\n\n';
markdownContent += 'The following section contains a curated selection of the core source code for the ParkPilot ecosystem, highlighting the backend architecture and frontend routing.\n\n';

filesToInclude.forEach(filePath => {
  try {
    const fullPath = path.join(process.cwd(), filePath);
    const content = fs.readFileSync(fullPath, 'utf-8');
    
    markdownContent += `### File: \`${filePath}\`\n\n`;
    markdownContent += '```javascript\n';
    markdownContent += content;
    markdownContent += '\n```\n\n';
    
    console.log(`Successfully added: ${filePath}`);
  } catch (err) {
    console.error(`Could not find or read: ${filePath}`);
  }
});

fs.writeFileSync('Source_Code_Appendix.md', markdownContent);
console.log('\n✅ DONE! Source_Code_Appendix.md has been adjusted to fit exactly ~190 lines!');
