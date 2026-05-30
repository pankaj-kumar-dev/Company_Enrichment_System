'use strict';

const axios = require('axios');

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64; rv:126.0) Gecko/20100101 Firefox/126.0',
];

const RETRYABLE = new Set(['ECONNRESET', 'ETIMEDOUT', 'ECONNABORTED']);

function randomAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchHtml(url, options = {}, retries = 2) {
  const config = {
    timeout: 12000,
    maxRedirects: 5,
    responseType: 'text',
    headers: {
      'User-Agent': randomAgent(),
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      ...options.headers,
    },
    ...options,
  };

  try {
    const res = await axios.get(url, config);
    return res.data;
  } catch (err) {
    const shouldRetry =
      retries > 0 &&
      (RETRYABLE.has(err.code) || (err.response && err.response.status >= 500));

    if (shouldRetry) {
      await sleep(1000 * (3 - retries));
      return fetchHtml(url, options, retries - 1);
    }

    throw err;
  }
}

module.exports = { fetchHtml };
