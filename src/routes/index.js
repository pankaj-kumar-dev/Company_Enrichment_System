'use strict';

const express = require('express');
const healthRoutes = require('./health');
const enrichRoutes = require('./enrich');
const resultsRoutes = require('./results');

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/enrich', enrichRoutes);
router.use('/results', resultsRoutes);

module.exports = router;
