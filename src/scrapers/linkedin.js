'use strict';

const cheerio = require('cheerio');
const { fetchHtml } = require('./utils/http');
const { cleanText, extractJsonLd } = require('./utils/parsers');

async function scrapeLinkedIn(linkedinUrl) {
  const url = linkedinUrl.startsWith('http') ? linkedinUrl : `https://${linkedinUrl}`;

  const html = await fetchHtml(url, {
    headers: {
      // LinkedIn serves richer public data when these are set
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      Referer: 'https://www.google.com/',
    },
  });

  const $ = cheerio.load(html);
  const jsonLdArray = extractJsonLd($);
  const org = jsonLdArray.find(
    (item) => item['@type'] === 'Organization' || item['@type'] === 'Corporation'
  );

  return {
    name: cleanText(
      org?.name ||
        ($('meta[property="og:title"]').attr('content') || '').split('|')[0].split(' - ')[0]
    ),
    description: cleanText(
      org?.description ||
        $('meta[property="og:description"]').attr('content') ||
        $('meta[name="description"]').attr('content')
    ),
    industry: cleanText(org?.industry || null),
    employeeCount: parseEmployeeCount(org?.numberOfEmployees?.value || ''),
    headquarters: cleanText(
      (org?.address?.addressLocality
        ? [org.address.addressLocality, org.address.addressCountry].filter(Boolean).join(', ')
        : null)
    ),
    foundedYear: org?.foundingDate ? parseInt(String(org.foundingDate).slice(0, 4), 10) : null,
  };
}

function parseEmployeeCount(raw) {
  if (!raw) return null;
  const str = String(raw).replace(/,/g, '');

  // Handle "1001-5000" ranges → return midpoint
  const range = str.match(/(\d+)-(\d+)/);
  if (range) return Math.round((parseInt(range[1]) + parseInt(range[2])) / 2);

  const n = parseInt(str);
  return isNaN(n) ? null : n;
}

module.exports = { scrapeLinkedIn };
