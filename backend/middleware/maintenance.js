const supabase = require('../config/supabase');

const maintenanceMiddleware = async (req, res, next) => {
  // Allow admin routes always
  if (req.path.startsWith('/api/admin') || req.path.startsWith('/admin')) {
    return next();
  }

  try {
    const { data: settings } = await supabase.from('admin_settings').select('maintenance_mode').eq('id', 1).single();
    
    if (settings && settings.maintenance_mode === 'On') {
      return res.status(503).json({
        success: false,
        error: 'Website Under Maintenance',
        message: 'We are currently improving the platform. Please try again later.'
      });
    }
  } catch (err) {
    console.error('[Maintenance Middleware Error]:', err.message);
  }

  next();
};

module.exports = maintenanceMiddleware;
