'use strict';

const express = require('express');
const validate = require('../middleware/validate');
const enrichController = require('../controllers/enrichController');

const router = express.Router();

const enrichSchema = {
  domain: validate.compose(
    validate.required('domain'),
    validate.string('domain'),
    (val) => {
      if (!val) return null; // already caught by required
      const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
      return domainRegex.test(val) ? null : 'domain must be a valid domain (e.g. example.com)';
    }
  ),
};

router.post('/', validate(enrichSchema), enrichController.enrich);
router.get('/:domain', enrichController.getCached);

module.exports = router;
