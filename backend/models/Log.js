const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Log = sequelize.define('Log', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: DataTypes.INTEGER,
  action: DataTypes.STRING,
  ipAddress: DataTypes.STRING,
  createdAt: DataTypes.DATE,
  updatedAt: DataTypes.DATE,
});

module.exports = Log;
