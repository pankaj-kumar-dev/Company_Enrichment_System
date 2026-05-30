'use strict';

const config = require('../config');

// Four-arg signature required by Express to recognize as error handler
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  if (status >= 500) {
    console.error('[error]', { status, path: req.path, message, stack: err.stack });
  }

  res.status(status).json({
    success: false,
    error: message,
    ...(config.isProduction ? {} : { stack: err.stack }),
  });
};

module.exports = errorHandler;
