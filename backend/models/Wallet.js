const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Wallet = sequelize.define('Wallet', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: DataTypes.INTEGER,
  balance: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
  bonusBalance: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
  createdAt: DataTypes.DATE,
  updatedAt: DataTypes.DATE,
});

module.exports = Wallet;
