import fs from 'fs';
import path from 'path';

const filesToInclude = [
  'backend/server.js',
  'backend/controllers/bookingController.js',
  'backend/controllers/authController.js',
  'backend/middleware/authMiddleware.js',
  'backend/models/Booking.js',
  'frontend/src/context/AuthContext.jsx',
  'frontend/src/pages/MapView.jsx',
  'frontend/src/pages/FranchiseDashboard.jsx',
  'frontend/src/pages/AdminDashboard.jsx'
];

let markdownContent = '# CHAPTER 10: APPENDIX - CORE SOURCE CODE\n\n';
markdownContent += 'The following section contains the raw, unedited source code for the core mathematical engines, security middleware, and React frontend components that power the ParkPilot ecosystem.\n\n';

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
console.log('\n✅ DONE! I have generated Source_Code_Appendix.md in your Park X Zone folder!');
