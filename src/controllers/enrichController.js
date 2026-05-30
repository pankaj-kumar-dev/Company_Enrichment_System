'use strict';

const enrichService = require('../services/enrichService');
const cache = require('../cache');

const DOMAIN_REGEX = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;

const enrichController = {
  async enrich(req, res, next) {
    try {
      const { domain } = req.body;
      const { data, fromCache } = await enrichService.enrich(domain);
      res.set('X-Cache', fromCache ? 'HIT' : 'MISS');
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  getCached(req, res) {
    const { domain } = req.params;

    if (!DOMAIN_REGEX.test(domain)) {
      return res.status(400).json({ success: false, error: 'Invalid domain format' });
    }

    const data = cache.get(domain);
    if (!data) {
      return res.status(404).json({ success: false, error: 'No cached result for this domain' });
    }

    res.set('X-Cache', 'HIT');
    res.status(200).json({ success: true, data });
  },
};

module.exports = enrichController;
