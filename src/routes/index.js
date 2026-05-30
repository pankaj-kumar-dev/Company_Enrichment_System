'use strict';

const express = require('express');
const healthRoutes = require('./health');
const enrichRoutes = require('./enrich');

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/enrich', enrichRoutes);

module.exports = router;
