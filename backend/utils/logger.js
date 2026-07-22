const logger = {
  log: (level, payload) => {
    const timestamp = new Date().toISOString();
    
    // Default payload structure if a string is provided instead of an object
    if (typeof payload === 'string') {
      payload = { action: payload };
    }

    const {
      user_id = 'N/A',
      game = 'System',
      round_id = 'N/A',
      action = 'Unknown',
      status = 'INFO',
      ...rest
    } = payload;

    const logEntry = {
      timestamp,
      level,
      user_id,
      game,
      round_id,
      action,
      status,
      ...rest
    };

    const logString = `[${timestamp}] [${level}] [${game}] [Round: ${round_id}] [User: ${user_id}] [Status: ${status}] - ${action} ${Object.keys(rest).length ? JSON.stringify(rest) : ''}`;

    if (level === 'ERROR') {
      console.error(logString);
    } else if (level === 'WARN') {
      console.warn(logString);
    } else if (level === 'DEBUG') {
      if (process.env.NODE_ENV !== 'production') {
        console.debug(logString);
      }
    } else {
      console.log(logString);
    }
  },

  info: (payload) => logger.log('INFO', payload),
  warn: (payload) => logger.log('WARN', payload),
  error: (payload) => logger.log('ERROR', payload),
  debug: (payload) => logger.log('DEBUG', payload)
};

module.exports = logger;
