const fs = require('fs');
let content = fs.readFileSync('c:/Users/adith/OneDrive/Documents/gambb/frontend/src/pages/Admin.jsx', 'utf8');

const replacements = {
  'â‚¹': '₹',
  'âš™ï¸ ': '⚙️',
  'ðŸ“Š': '📊',
  'ðŸŽ®': '🎮',
  'âž•': '➕',
  'âž–': '➖',
  'ðŸ‘¥': '👥',
  'ðŸ“¡': '📡',
  'ðŸ’¡': '💡',
  'âœ“': '✓',
  'ðŸ’°': '💰',
  'â€¦': '...'
};

for (const [bad, good] of Object.entries(replacements)) {
  content = content.split(bad).join(good);
}

fs.writeFileSync('c:/Users/adith/OneDrive/Documents/gambb/frontend/src/pages/Admin.jsx', content);
console.log('Fixed UTF-8 issues in Admin.jsx');
