const { execSync } = require('child_process');

// Get git hash with fallback
const getGitHash = () => {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return 'no-git-info';
  }
};

let commitJson = {
  hash: JSON.stringify(getGitHash()),
  version: JSON.stringify(process.env.npm_package_version),
};

// ASCII animation
const animation = `
▜ ▘       ▌   ▘▜  ▌    
▐ ▌▛▌▛▌▛▌ ▛▌▌▌▌▐ ▛▌█▌▛▘
▐▖▌▌▌▙▌▙▌ ▙▌▙▌▌▐▖▙▌▙▖▌ 
     ▄▌                
`;

console.log(animation);
console.log(`
★═══════════════════════════════════════════════════════════════★
          Welcome to Cedzlabs Tools Fullstack Builder
   Build with Stack Blaze + Bolt.new for blazing fast results!
★═══════════════════════════════════════════════════════════════★
`);
console.log('📍 Current Version Tag:', `v${commitJson.version}`);
console.log('📍 Current Commit Version:', commitJson.hash);
console.log('  For more info, visit: https://cedzlabs.com');
console.log('★═══════════════════════════════════════════════════════════════★');
