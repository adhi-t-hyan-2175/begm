require('dotenv').config();
const { sequelize } = require('./models');

(async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connected');
    
    // Create tables
    await sequelize.sync({ alter: true });
    console.log('Tables synced');

    // Alter sequence
    try {
      await sequelize.query('ALTER SEQUENCE "Users_id_seq" RESTART WITH 7777;');
      console.log('Sequence updated to 7777 for Users_id_seq');
    } catch (e) {
      console.log('Could not update Users_id_seq, trying users_id_seq');
      try {
        await sequelize.query('ALTER SEQUENCE "users_id_seq" RESTART WITH 7777;');
        console.log('Sequence updated to 7777 for users_id_seq');
      } catch (e2) {
        console.log('Failed to update sequence:', e2.message);
      }
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Failed to sync:', err);
    process.exit(1);
  }
})();
