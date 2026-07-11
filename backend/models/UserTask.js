const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const UserTask = sequelize.define('UserTask', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  taskId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'Pending', // 'Pending', 'Completed'
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  }
});

module.exports = UserTask;
