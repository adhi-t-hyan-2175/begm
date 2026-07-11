const { Sequelize } = require('sequelize');

let sequelize;

if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('YOUR_PROJECT_REF')) {
  // Use Supabase connection URI directly
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false, // Required for Supabase
      },
      connectTimeout: 5000,
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  });
} else {
  // Fallback to SQLite
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './database.sqlite',
    logging: false
  });
}

sequelize.connected = false;

module.exports = sequelize;
