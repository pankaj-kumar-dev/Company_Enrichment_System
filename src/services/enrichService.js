'use strict';

const { orchestrate } = require('../scrapers');
const gemini = require('../ai/gemini');
const { shape } = require('../ai/schema');
const cache = require('../cache');
const config = require('../config');

cache.init(config.cacheTtlHours);

// Deduplicates concurrent requests for the same domain — only one scrape+AI call in flight at a time.
const pending = new Map();

const enrichService = {
  async enrich(domain) {
    const cached = cache.get(domain);
    if (cached) return { data: cached, fromCache: true };

    if (pending.has(domain)) return pending.get(domain);

    const promise = _run(domain)
      .then((data) => {
        cache.set(domain, data);
        pending.delete(domain);
        return { data, fromCache: false };
      })
      .catch((err) => {
        pending.delete(domain);
        throw err;
      });

    pending.set(domain, promise);
    return promise;
  },
};

async function _run(domain) {
  const scraped = await orchestrate(domain);
  const aiFields = await gemini.enrich(scraped);
  return shape(domain, scraped, aiFields);
}

// Worker-pool pattern — runs at most `limit` domains concurrently.
async function _withConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let idx = 0;

  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await fn(items[i]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

enrichService.bulkEnrich = async function (domains) {
  return _withConcurrency(domains, config.bulkConcurrency, async (domain) => {
    try {
      const { data, fromCache } = await enrichService.enrich(domain);
      return { domain, success: true, fromCache, data };
    } catch (err) {
      return { domain, success: false, error: err.message };
    }
  });
};

module.exports = enrichService;
