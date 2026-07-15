const supabase = require('../config/supabase');

const checkMaintenanceMode = async (req, res, next) => {
  try {
    // Exempt admin routes completely
    if (req.originalUrl.startsWith('/api/admin')) {
      return next();
    }

    // Exempt settings retrieval
    if (req.originalUrl === '/api/admin/settings') {
      return next();
    }

    const { data: settings, error } = await supabase
      .from('platform_settings')
      .select('maintenance_mode')
      .eq('id', 1)
      .single();

    if (error) {
      console.error('Maintenance Check Error:', error);
      return next();
    }

    if (settings && settings.maintenance_mode === 'On') {
      return res.status(503).json({
        success: false,
        message: 'System is currently under maintenance. Please try again later.'
      });
    }

    next();
  } catch (error) {
    console.error('Maintenance Middleware Error:', error);
    next();
  }
};

module.exports = checkMaintenanceMode;
