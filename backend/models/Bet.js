const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Bet = sequelize.define('Bet', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: DataTypes.INTEGER,
  gameId: DataTypes.INTEGER,
  amount: DataTypes.FLOAT,
  selectedOption: DataTypes.STRING,
  status: DataTypes.STRING,
  reward: DataTypes.FLOAT,
  createdAt: DataTypes.DATE,
  updatedAt: DataTypes.DATE,
});

module.exports = Bet;
