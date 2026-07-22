const fs = require('fs');
const path = require('path');

const dir = 'C:/Users/adith/OneDrive/Documents/gambb/frontend/src/pages';
const files = ['Parity.jsx', 'Sapre.jsx', 'Dice.jsx', 'Wheelocity.jsx', 'AndarBahar.jsx'];

files.forEach(f => {
  const file = path.join(dir, f);
  if (!fs.existsSync(file)) return;
  
  let content = fs.readFileSync(file, 'utf8');
  
  content = content.replace(
    /const { timeLeft, isBettingOpen, period, previousPeriod, formatTime, secondsIntoPeriod, status, realHistory } = useGlobalGame\(GAME\);/g,
    "const { timeLeft, isBettingOpen, period, round_id, previousPeriod, formatTime, secondsIntoPeriod, status, realHistory } = useGlobalGame(GAME);"
  );
  
  content = content.replace(
    /const handleConfirmBet = \(selection, amount\) => \{\s*setBetModalOpen\(false\);\s*const ok = placeBet\(GAME, period, selection, amount\);/g,
    `const handleConfirmBet = (selection, amount) => {
    if (!round_id) {
      alert('Connecting to game server... please wait.');
      return;
    }
    setBetModalOpen(false);
    const ok = placeBet(GAME, period, round_id, selection, amount);`
  );
  
  fs.writeFileSync(file, content);
  console.log('Updated ' + f);
});
