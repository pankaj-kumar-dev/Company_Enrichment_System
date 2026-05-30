'use strict';

const cheerio = require('cheerio');
const { fetchHtml } = require('./utils/http');
const { cleanText, extractJsonLd, findOrganization } = require('./utils/parsers');

const ABOUT_PATHS   = ['/about', '/about-us', '/company'];
const CONTACT_PATHS = ['/contact', '/contact-us'];

async function scrapeWebsite(domain) {
  const baseUrl = `https://${domain}`;
  const homepageHtml = await fetchWithHttpsFallback(domain);

  // Fetch about + contact in parallel while we parse homepage
  const [aboutHtml, contactHtml] = await Promise.all([
    fetchFirstSuccessful(baseUrl, ABOUT_PATHS),
    fetchFirstSuccessful(baseUrl, CONTACT_PATHS),
  ]);

  const $ = cheerio.load(homepageHtml);
  const org = findOrganization(extractJsonLd($));

  // Merge emails from all pages, dedup, cap at 5
  const emails = mergeEmails(
    extractEmailsFromHtml(homepageHtml),
    aboutHtml   ? extractEmailsFromHtml(aboutHtml)   : [],
    contactHtml ? extractEmailsFromHtml(contactHtml) : []
  );

  // Take first phone found: schema.org → tel: link → regex across all pages
  const phone =
    extractPhoneStructured($, org) ||
    extractPhoneRegex(homepageHtml) ||
    (contactHtml ? extractPhoneRegex(contactHtml) : null) ||
    (aboutHtml   ? extractPhoneRegex(aboutHtml)   : null);

  return {
    name:        extractName($, org),
    description: extractDescription($, org),
    linkedinUrl: extractSocialUrl($, 'linkedin.com/company'),
    twitterUrl:  extractSocialUrl($, 'twitter.com') || extractSocialUrl($, 'x.com'),
    facebookUrl: extractSocialUrl($, 'facebook.com'),
    emails,
    phone,
    address:     extractAddress(org),
    foundedYear: parseYear(org?.foundingDate),
    techStack:   extractTechStack($),
  };
}

// --- Sub-page fetching ---

async function fetchWithHttpsFallback(domain) {
  try {
    return await fetchHtml(`https://${domain}`);
  } catch (err) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ERR_TLS_CERT_ALTNAME_INVALID') {
      return fetchHtml(`http://${domain}`);
    }
    throw err;
  }
}

// Tries each path in order, returns first successful HTML. Never throws.
async function fetchFirstSuccessful(baseUrl, paths) {
  for (const p of paths) {
    try {
      // Single attempt, 8s timeout — sub-pages don't retry
      return await fetchHtml(baseUrl + p, { timeout: 8000 }, 0);
    } catch (_) {
      // try next path
    }
  }
  return null;
}

// --- Extraction helpers ---

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
      return false;
    }
  });
  return found;
}

// Extracts emails from raw HTML string (loads its own cheerio)
function extractEmailsFromHtml(html) {
  const emails = new Set();
  const $ = cheerio.load(html);

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
    if (!e.match(/example|sentry|wixpress|schema\.org|w3\.org|@domain\.|@your|noreply/i)) {
      emails.add(e);
    }
  }

  return [...emails];
}

function mergeEmails(...arrays) {
  const seen = new Set();
  const result = [];
  for (const arr of arrays) {
    for (const e of arr) {
      if (!seen.has(e)) { seen.add(e); result.push(e); }
    }
  }
  return result.slice(0, 5);
}

// Phone from schema.org / tel: links (structured, high confidence)
function extractPhoneStructured($, org) {
  if (org?.telephone) return cleanText(org.telephone);
  let phone = null;
  $('a[href^="tel:"]').each((_, el) => {
    phone = $(el).attr('href').replace('tel:', '').trim();
    return false;
  });
  return phone;
}

// Phone via regex across raw HTML (strip scripts/styles first to reduce noise)
function extractPhoneRegex(html) {
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ');

  // SOURCE_TRUTH pattern — excludes . and + to avoid matching coordinate/CSS values
  const phoneRegex = /\+?\d[\d\s\-()]{7,}\d/g;
  for (const [match] of stripped.matchAll(phoneRegex)) {
    const digits = match.replace(/\D/g, '');
    // 7–15 digits total, AND at least one run of 4+ consecutive digits.
    // The consecutive-digit check rejects CSS/SVG values like "0 0 384 512".
    if (digits.length >= 7 && digits.length <= 15 && /\d{4,}/.test(match)) {
      return match.trim();
    }
  }
  return null;
}

function extractAddress(org) {
  if (!org?.address) return null;
  const a = org.address;
  return {
    street:     a.streetAddress  || null,
    city:       a.addressLocality || null,
    state:      a.addressRegion  || null,
    postalCode: a.postalCode     || null,
    country:    a.addressCountry || null,
  };
}

function extractTechStack($) {
  const techs = new Set();
  $('script[src]').each((_, el) => {
    const src = ($(el).attr('src') || '').toLowerCase();
    if (src.includes('_next') || src.includes('react')) techs.add('React / Next.js');
    if (src.includes('vue'))                            techs.add('Vue');
    if (src.includes('angular'))                        techs.add('Angular');
    if (src.includes('jquery'))                         techs.add('jQuery');
    if (src.includes('googletagmanager') || src.includes('/gtm.js')) techs.add('Google Tag Manager');
    if (src.includes('intercom'))                       techs.add('Intercom');
    if (src.includes('segment.com') || src.includes('analytics.js')) techs.add('Segment');
    if (src.includes('hubspot') || src.includes('hs-scripts'))       techs.add('HubSpot');
    if (src.includes('cdn.shopify'))                    techs.add('Shopify');
    if (src.includes('wp-content') || src.includes('wp-includes'))   techs.add('WordPress');
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
