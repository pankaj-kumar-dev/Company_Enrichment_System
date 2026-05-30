'use strict';

const enrichService = require('../services/enrichService');
const cache = require('../cache');
const resultsStore = require('../store/results');

const DOMAIN_REGEX = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;

const enrichController = {
  async enrich(req, res, next) {
    try {
      const { url } = req.body;
      const domain = new URL(url).hostname.replace(/^www\./, '');
      const { data, fromCache } = await enrichService.enrich(domain);
      if (!fromCache) resultsStore.append(data);
      res.set('X-Cache', fromCache ? 'HIT' : 'MISS');
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  },

  async enrichBulk(req, res, next) {
    try {
      const { domains } = req.body;
      const results = await enrichService.bulkEnrich(domains);
      const succeeded = results.filter((r) => r.success).length;
      res.status(200).json({
        success: true,
        meta: { total: domains.length, succeeded, failed: domains.length - succeeded },
        results,
      });
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
