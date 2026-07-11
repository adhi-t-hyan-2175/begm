const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Transaction = sequelize.define('Transaction', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  amount: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  currencyType: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Main', // 'Main', 'Bonus'
  },
  transactionType: {
    type: DataTypes.STRING,
    allowNull: false,
    // 'Deposit', 'Withdrawal', 'Topup', 'GameWin', 'GameLoss', 'Referral', 'CheckIn', 'Task'
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'Completed', // 'Pending', 'Completed', 'Failed'
  },
  description: {
    type: DataTypes.STRING,
  },
});

module.exports = Transaction;
