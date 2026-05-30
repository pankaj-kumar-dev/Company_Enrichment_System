'use strict';

const healthController = {
  check(req, res) {
    res.status(200).json({
      success: true,
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
    });
  },
};

module.exports = healthController;
