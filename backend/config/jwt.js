const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-admin-secret';

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      phone: user.phone,
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

const generateAdminToken = (admin) => {
  return jwt.sign(
    {
      role: 'admin',
      username: admin.username,
    },
    JWT_SECRET,
    { expiresIn: '8h' }
  );
};

const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

module.exports = { generateToken, generateAdminToken, verifyToken };
