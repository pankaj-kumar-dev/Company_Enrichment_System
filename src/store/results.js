'use strict';

const fs = require('fs');
const path = require('path');

const RESULTS_FILE = path.join(process.cwd(), 'data', 'results.json');

// Returns all results. Never throws — returns [] on any read failure.
function read() {
  try {
    const raw = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'));
    return Array.isArray(raw) ? raw : [];
  } catch (_) {
    return [];
  }
}

// Upserts by website_name. Replaces existing record for same domain, appends if new.
function append(record) {
  try {
    const all = read();
    const idx = all.findIndex((r) => r.website_name === record.website_name);
    if (idx >= 0) {
      all[idx] = record;
    } else {
      all.push(record);
    }
    _write(all);
  } catch (err) {
    console.warn('[store] append failed:', err.message);
  }
}

function _write(arr) {
  fs.mkdirSync(path.dirname(RESULTS_FILE), { recursive: true });
  const tmp = RESULTS_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(arr, null, 2));
  fs.renameSync(tmp, RESULTS_FILE);
}

module.exports = { read, append };
