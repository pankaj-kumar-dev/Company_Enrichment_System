'use strict';

const fs = require('fs');
const path = require('path');

const CACHE_FILE = path.join(process.cwd(), '.cache', 'enrichment.json');

let store = {};
let ttlMs = 7 * 24 * 60 * 60 * 1000;

function init(ttlHours) {
  ttlMs = ttlHours * 60 * 60 * 1000;
  _load();
}

function get(domain) {
  const entry = store[domain];
  if (!entry) return null;

  const stale = Date.now() - new Date(entry.cachedAt).getTime() > ttlMs;
  if (stale) {
    delete store[domain];
    _persist();
    return null;
  }

  return entry.data;
}

function set(domain, data) {
  store[domain] = { data, cachedAt: new Date().toISOString() };
  _persist();
}

function stats() {
  return { entries: Object.keys(store).length, ttlMs };
}

function _load() {
  try {
    store = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    console.log(`[cache] loaded ${Object.keys(store).length} entries from disk`);
  } catch (_) {
    store = {};
  }
}

function _persist() {
  try {
    fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
    // Write to tmp then rename — avoids corrupt file if process dies mid-write
    const tmp = CACHE_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(store, null, 2));
    fs.renameSync(tmp, CACHE_FILE);
  } catch (err) {
    console.warn('[cache] persist failed:', err.message);
  }
}

module.exports = { init, get, set, stats };
