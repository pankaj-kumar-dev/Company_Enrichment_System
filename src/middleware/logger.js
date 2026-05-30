'use strict';

const morgan = require('morgan');
const config = require('../config');

// 'combined' = Apache format, good for log aggregators in prod
// 'dev' = colorized, human-readable for local development
module.exports = morgan(config.isProduction ? 'combined' : 'dev');
