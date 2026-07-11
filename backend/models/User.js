const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  username: DataTypes.STRING,
  phone: DataTypes.STRING,
  password_hash: DataTypes.STRING,
  level: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
  vipStatus: {
    type: DataTypes.STRING,
    defaultValue: 'Bronze',
  },
  referralCode: {
    type: DataTypes.STRING,
    unique: true,
  },
  referredBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  createdAt: DataTypes.DATE,
  updatedAt: DataTypes.DATE,
});

module.exports = User;
