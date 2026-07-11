const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const TopupProduct = sequelize.define('TopupProduct', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  diamonds: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  normalPrice: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  specialPrice: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  }
});

module.exports = TopupProduct;
