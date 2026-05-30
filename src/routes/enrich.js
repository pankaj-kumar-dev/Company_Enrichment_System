'use strict';

const express = require('express');
const validate = require('../middleware/validate');
const enrichController = require('../controllers/enrichController');

const router = express.Router();

const DOMAIN_REGEX = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;

const validateUrl = validate.compose(
  validate.required('url'),
  validate.string('url'),
  (val) => {
    if (!val) return null;
    try {
      const u = new URL(val);
      if (!['http:', 'https:'].includes(u.protocol)) return 'url must use http or https';
      return null;
    } catch (_) {
      return 'url must be a valid URL (e.g. https://example.com)';
    }
  }
);

const enrichSchema = {
  url: validateUrl,
  companyName: validate.string('companyName'), // optional hint
};

const bulkSchema = {
  domains: validate.array(
    'domains',
    (val) => {
      if (typeof val !== 'string') return 'each domain must be a string';
      return DOMAIN_REGEX.test(val) ? null : `invalid domain: ${val}`;
    },
    20
  ),
};

router.post('/', validate(enrichSchema), enrichController.enrich);
router.post('/bulk', validate(bulkSchema), enrichController.enrichBulk);
router.get('/:domain', enrichController.getCached);

module.exports = router;
