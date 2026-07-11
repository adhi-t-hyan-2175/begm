const Game = require('../models/Game');

const predictGame = async (gameId, winner) => {
  const game = await Game.findByPk(gameId);
  if (!game) {
    throw new Error('Game not found');
  }
  game.winner = winner;
  await game.save();
};

module.exports = { predictGame };
