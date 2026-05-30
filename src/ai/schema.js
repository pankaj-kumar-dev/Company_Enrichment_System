'use strict';

const AI_FIELDS = ['core_service', 'target_customer', 'probable_pain_point', 'outreach_opener'];

const EMPTY_AI = Object.fromEntries(AI_FIELDS.map((k) => [k, '']));

function validate(obj) {
  if (!obj || typeof obj !== 'object') return false;
  return AI_FIELDS.every((k) => typeof obj[k] === 'string');
}

// Collapses scraped address object → single string
function formatAddress(addr) {
  if (!addr) return '';
  return [addr.street, addr.city, addr.state, addr.postalCode, addr.country]
    .filter(Boolean)
    .join(', ');
}

// Final hackathon output — contact data from scrapers only, AI fills analytical fields
function shape(domain, scraped, aiFields) {
  const ai = validate(aiFields) ? aiFields : EMPTY_AI;

  return {
    website_name: domain,
    company_name: scraped.name || '',
    address: formatAddress(scraped.address),
    mobile_number: scraped.phone || '',
    mail: scraped.emails || [],
    core_service: ai.core_service,
    target_customer: ai.target_customer,
    probable_pain_point: ai.probable_pain_point,
    outreach_opener: ai.outreach_opener,
  };
}

module.exports = { validate, shape, EMPTY_AI };
