const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const TopupOrder = sequelize.define('TopupOrder', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  ffUid: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  productId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  mainAmountPaid: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
  bonusAmountPaid: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'Pending', // Pending, Processing, Completed, Cancelled
  },
});

module.exports = TopupOrder;
