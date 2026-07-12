const supabase = require('../config/supabase');
const jwt = require('jsonwebtoken');

// ─── Auth Middleware — verifies Supabase Google OAuth JWT ─────────────────────
const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];

    // Verify the Supabase-issued JWT (works for Google OAuth sessions)
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Invalid or expired token' });
    }

    // Fetch the app profile from our users table
    const { data: profile } = await supabase
      .from('users')
      .select('id, email, nickname, role, status, vip_level, total_recharge')
      .eq('email', user.email)
      .maybeSingle();

    // Attach user info to request — shape preserved for all existing route handlers
    req.user = {
      id: profile?.id || user.id,
      email: profile?.email || user.email,
      role: profile?.role || 'user',
      status: profile?.status || 'Active',
    };

    next();
  } catch (error) {
    console.error('[Auth Middleware]', error.message);
    res.status(401).json({ success: false, error: 'Unauthorized: Invalid token' });
  }
};

// ─── Admin Auth Middleware ─────────────────────────────────────────────────────
const verifyAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.JWT_SECRET || 'super_secret_admin_key', (err, decoded) => {
      if (err) return res.status(401).json({ success: false, error: 'Unauthorized: Invalid token' });
      if (!decoded.admin) return res.status(403).json({ success: false, error: 'Forbidden: Admin access required' });
      req.user = decoded;
      next();
    });
  } catch (error) {
    console.error('[Admin Middleware]', error.message);
    res.status(401).json({ success: false, error: 'Unauthorized: Invalid token' });
  }
};

module.exports = { auth, verifyAdmin };
