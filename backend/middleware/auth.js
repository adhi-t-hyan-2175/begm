const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'gambb_super_secret_jwt_2175';

// Normal Auth Middleware
const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, phone }
    
    next();
  } catch (error) {
    console.error('[Auth Middleware]', error.message);
    res.status(401).json({ success: false, error: 'Unauthorized: Invalid token' });
  }
};

// Admin Auth Middleware
const verifyAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check for admin role
    if (decoded.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Forbidden: Admin access required' });
    }

    req.user = decoded;
    next();
  } catch (error) {
    console.error('[Admin Middleware]', error.message);
    res.status(401).json({ success: false, error: 'Unauthorized: Invalid token' });
  }
};

module.exports = { auth, verifyAdmin };
