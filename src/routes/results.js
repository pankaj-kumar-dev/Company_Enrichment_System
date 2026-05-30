'use strict';

const express = require('express');
const resultsStore = require('../store/results');

const router = express.Router();

router.get('/', (req, res) => {
  const data = resultsStore.read();
  res.status(200).json(data);
});

module.exports = router;
