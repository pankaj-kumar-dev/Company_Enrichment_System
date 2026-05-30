'use strict';

const config = require('../config');

const NETWORK_ERROR_MESSAGES = {
  ENOTFOUND: 'Could not reach that website. Check the URL and try again.',
  ECONNREFUSED: 'Connection refused by the target website.',
  ECONNRESET: 'Connection was reset by the target website.',
  ETIMEDOUT: 'Request timed out. The website may be slow or unreachable.',
  ECONNABORTED: 'Request timed out. The website may be slow or unreachable.',
  CERT_HAS_EXPIRED: 'The website has an expired SSL certificate.',
  ERR_TLS_CERT_ALTNAME_INVALID: 'The website has an invalid SSL certificate.',
};

// Four-arg signature required by Express to recognize as error handler
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const code = err.code || (err.cause && err.cause.code);
  const friendlyMessage = code && NETWORK_ERROR_MESSAGES[code];
  const message = friendlyMessage || err.message || 'Internal Server Error';

  if (status >= 500) {
    console.error('[error]', { status, path: req.path, message: err.message, stack: err.stack });
  }

  res.status(status).json({
    success: false,
    error: message,
    ...(config.isProduction ? {} : { stack: err.stack }),
  });
};

module.exports = errorHandler;
