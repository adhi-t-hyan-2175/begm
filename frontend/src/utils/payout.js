export const getSelectionMultiplier = (selection) => {
  const sel = String(selection || '').toLowerCase();
  
  // Wheelocity (5x, 3x, 2x)
  if (sel.includes('5x') || sel.includes('five') || sel.includes('5 hits')) return 5;
  if (sel.includes('3x') || sel.includes('three') || sel.includes('3 hits')) return 3;
  if (sel.includes('2x') || sel.includes('two') || sel.includes('2 hits')) return 2;
  
  // Tie/Andar Bahar
  if (sel.includes('tie')) return 12; // Tie in Dice/etc is usually 12x or 14x
  if (sel.includes('andar') || sel.includes('bahar')) return 1.9;
  
  // Colors (Parity / Fast Parity / Sapre)
  if (sel.includes('violet')) return 4.5;
  if (sel.includes('green') || sel.includes('red')) return 1.9;
  
  // Size (Dice)
  if (sel.includes('small') || sel.includes('big') || sel.includes('large')) return 1.98;
  
  // Parity Numbers
  if (sel.includes('even') || sel.includes('odd')) return 1.9;
  if (sel.match(/^\d+$/)) return 9; // Number bets are usually 9x

  return 2; // Default
};

/**
 * Calculates unified payout metrics for any game.
 * @param {string|number} selection - The chosen betting option.
 * @param {number} contractAmount - The total amount the user selected (e.g. 10, 100).
 * @param {number} feePercent - The percentage taken as fee (default 2%).
 * @param {number} customMultiplier - An optional override multiplier.
 * @returns {Object} { contractAmount, betAmount, fee, multiplier, winningAmount, profit }
 */
export const calculatePayout = (selection, contractAmount, feePercent = 2, customMultiplier = null) => {
  const fee = Math.max(1, Math.round((contractAmount * feePercent) / 100));
  const betAmount = contractAmount - fee;
  const multiplier = customMultiplier !== null ? customMultiplier : getSelectionMultiplier(selection);

  // Math exactly mirrors BetCardModal original logic
  const winningAmount = Math.max(0, Math.round(contractAmount * multiplier - fee));
  const profit = winningAmount - contractAmount;

  return {
    contractAmount,
    betAmount,
    fee,
    multiplier,
    winningAmount,
    profit
  };
};
