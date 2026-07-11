require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const routes = require('./routes');
const { sequelize } = require('./models');

app.use(cors());
app.use(express.json());

// Health check route
app.get('/', (req, res) => {
  res.json({ message: 'Gambling Platform API is running', status: 'ok' });
});

// Routes
app.use('/api/auth', routes.auth);
app.use('/api/game', routes.game);
app.use('/api/user', routes.user);
app.use('/api/wallet', routes.wallet);
app.use('/api/admin', routes.admin);
app.use('/api/topup', routes.topup);
app.use('/api/community', routes.community);

// Sequelize is no longer needed, we use Supabase REST Client
// (async () => {
//   try {
//     await sequelize.authenticate();
//     await sequelize.sync({ alter: true });
//     console.log('Database connected and synced');
//   } catch (err) {
//     console.log('Database unavailable, running without DB:', err.message);
//   }
// })();

module.exports = app;
