'use strict';

function cleanText(str) {
  if (!str) return null;
  const cleaned = String(str).replace(/\s+/g, ' ').trim();
  return cleaned || null;
}

function extractJsonLd($) {
  const results = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html());
      results.push(data);
    } catch (_err) {
      // malformed — skip
    }
  });
  return results;
}

// Finds the first Organization/Corporation/LocalBusiness node across all JSON-LD blocks
function findOrganization(jsonLdArray) {
  const orgTypes = new Set(['Organization', 'Corporation', 'LocalBusiness', 'Company']);

  for (const item of jsonLdArray) {
    const nodes = Array.isArray(item['@graph']) ? item['@graph'] : [item];
    for (const node of nodes) {
      const type = node['@type'];
      const typeList = Array.isArray(type) ? type : [type];
      if (typeList.some((t) => orgTypes.has(t))) return node;
    }
  }

  return null;
}

module.exports = { cleanText, extractJsonLd, findOrganization };
