const { sequelize } = require('./models');

(async () => {
  try {
    await sequelize.query(`INSERT OR REPLACE INTO sqlite_sequence (name, seq) VALUES ('Users', 7776);`);
    console.log('Sequence updated to 7777 for Users (SQLite)');
    process.exit(0);
  } catch (err) {
    console.error('Failed:', err);
    process.exit(1);
  }
})();
