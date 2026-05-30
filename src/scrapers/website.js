'use strict';

const cheerio = require('cheerio');
const { fetchHtml } = require('./utils/http');
const { cleanText, extractJsonLd, findOrganization } = require('./utils/parsers');

async function scrapeWebsite(domain) {
  const html = await fetchWithHttpsFallback(domain);
  const $ = cheerio.load(html);
  const org = findOrganization(extractJsonLd($));

  return {
    name: extractName($, org),
    description: extractDescription($, org),
    linkedinUrl: extractSocialUrl($, 'linkedin.com/company'),
    twitterUrl: extractSocialUrl($, 'twitter.com') || extractSocialUrl($, 'x.com'),
    facebookUrl: extractSocialUrl($, 'facebook.com'),
    emails: extractEmails($, html),
    phone: extractPhone($, org),
    address: extractAddress(org),
    foundedYear: parseYear(org?.foundingDate),
    techStack: extractTechStack($),
  };
}

async function fetchWithHttpsFallback(domain) {
  try {
    return await fetchHtml(`https://${domain}`);
  } catch (err) {
    // ECONNREFUSED / SSL errors — try plain http before giving up
    if (err.code === 'ECONNREFUSED' || err.code === 'ERR_TLS_CERT_ALTNAME_INVALID') {
      return fetchHtml(`http://${domain}`);
    }
    throw err;
  }
}

function extractName($, org) {
  return cleanText(
    org?.name ||
      $('meta[property="og:site_name"]').attr('content') ||
      $('meta[name="application-name"]').attr('content') ||
      ($('title').text() || '').split(/[|\-–]/)[0]
  );
}

function extractDescription($, org) {
  return cleanText(
    org?.description ||
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="description"]').attr('content')
  );
}

function extractSocialUrl($, pattern) {
  let found = null;
  $(`a[href*="${pattern}"]`).each((_, el) => {
    const href = $(el).attr('href') || '';
    if (!href.match(/\/(intent|share|login|signup|sharer|feed\/update)/)) {
      found = href.startsWith('http') ? href : `https://${href.replace(/^\/\//, '')}`;
      return false; // break cheerio loop
    }
  });
  return found;
}

function extractEmails($, html) {
  const emails = new Set();

  $('a[href^="mailto:"]').each((_, el) => {
    const email = $(el)
      .attr('href')
      .replace('mailto:', '')
      .split('?')[0]
      .trim()
      .toLowerCase();
    if (email.includes('@')) emails.add(email);
  });

  const emailRegex = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g;
  for (const [match] of html.matchAll(emailRegex)) {
    const e = match.toLowerCase();
    // Skip common false-positives embedded in JS/CSS
    if (!e.match(/example|sentry|wixpress|schema\.org|w3\.org|@domain\.|@your|noreply/i)) {
      emails.add(e);
    }
  }

  return [...emails].slice(0, 5);
}

function extractPhone($, org) {
  if (org?.telephone) return cleanText(org.telephone);
  let phone = null;
  $('a[href^="tel:"]').each((_, el) => {
    phone = $(el).attr('href').replace('tel:', '').trim();
    return false;
  });
  return phone;
}

function extractAddress(org) {
  if (!org?.address) return null;
  const a = org.address;
  return {
    street: a.streetAddress || null,
    city: a.addressLocality || null,
    state: a.addressRegion || null,
    postalCode: a.postalCode || null,
    country: a.addressCountry || null,
  };
}

function extractTechStack($) {
  const techs = new Set();

  $('script[src]').each((_, el) => {
    const src = ($(el).attr('src') || '').toLowerCase();
    if (src.includes('_next') || src.includes('react')) techs.add('React / Next.js');
    if (src.includes('vue')) techs.add('Vue');
    if (src.includes('angular')) techs.add('Angular');
    if (src.includes('jquery')) techs.add('jQuery');
    if (src.includes('googletagmanager') || src.includes('/gtm.js')) techs.add('Google Tag Manager');
    if (src.includes('intercom')) techs.add('Intercom');
    if (src.includes('segment.com') || src.includes('analytics.js')) techs.add('Segment');
    if (src.includes('hubspot') || src.includes('hs-scripts')) techs.add('HubSpot');
    if (src.includes('cdn.shopify')) techs.add('Shopify');
    if (src.includes('wp-content') || src.includes('wp-includes')) techs.add('WordPress');
  });

  const generator = $('meta[name="generator"]').attr('content');
  if (generator) techs.add(generator.split(' ')[0]);

  return [...techs];
}

function parseYear(raw) {
  if (!raw) return null;
  const year = parseInt(String(raw).slice(0, 4), 10);
  return year >= 1800 && year <= new Date().getFullYear() ? year : null;
}

module.exports = { scrapeWebsite };
