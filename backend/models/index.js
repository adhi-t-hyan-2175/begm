const sequelize = require('../config/db');
const User = require('./User');
const Wallet = require('./Wallet');
const Game = require('./Game');
const Bet = require('./Bet');
const Log = require('./Log');
const TopupProduct = require('./TopupProduct');
const TopupOrder = require('./TopupOrder');
const Transaction = require('./Transaction');
const Task = require('./Task');
const UserTask = require('./UserTask');

// Define associations
User.hasOne(Wallet, { foreignKey: 'userId' });
Wallet.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Bet, { foreignKey: 'userId' });
Bet.belongsTo(User, { foreignKey: 'userId' });

Game.hasMany(Bet, { foreignKey: 'gameId' });
Bet.belongsTo(Game, { foreignKey: 'gameId' });

User.hasMany(Log, { foreignKey: 'userId' });
Log.belongsTo(User, { foreignKey: 'userId' });

// New Associations
User.hasMany(Transaction, { foreignKey: 'userId' });
Transaction.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(TopupOrder, { foreignKey: 'userId' });
TopupOrder.belongsTo(User, { foreignKey: 'userId' });

TopupProduct.hasMany(TopupOrder, { foreignKey: 'productId' });
TopupOrder.belongsTo(TopupProduct, { foreignKey: 'productId' });

User.hasMany(UserTask, { foreignKey: 'userId' });
UserTask.belongsTo(User, { foreignKey: 'userId' });

Task.hasMany(UserTask, { foreignKey: 'taskId' });
UserTask.belongsTo(Task, { foreignKey: 'taskId' });

module.exports = { 
  sequelize, 
  User, 
  Wallet, 
  Game, 
  Bet, 
  Log,
  TopupProduct,
  TopupOrder,
  Transaction,
  Task,
  UserTask
};
