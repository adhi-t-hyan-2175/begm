const Game = require('../models/Game');
const Bet = require('../models/Bet');
const { calculateToken } = require('../services/token');

const placeBet = async (req, res) => {
  const { userId, gameId, betAmount, selectedOption } = req.body;
  const game = await Game.findByPk(gameId);
  const bet = await Bet.create({
    userId,
    gameId,
    amount: betAmount,
    selectedOption,
    status: 'pending',
  });

  res.json({ message: 'Bet placed successfully', bet });
};

const resolveBet = async (req, res) => {
  const { betId, winner } = req.body;
  const bet = await Bet.findByPk(betId);

  if (!bet) {
    return res.status(404).json({ message: 'Bet not found' });
  }

  if (bet.selectedOption === winner) {
    const reward = bet.amount * 2;
    bet.status = 'won';
    bet.reward = reward;
    await bet.save();
    res.json({ message: 'Bet won', reward });
  } else {
    bet.status = 'lost';
    await bet.save();
    res.json({ message: 'Bet lost' });
  }
};

module.exports = { placeBet, resolveBet };
