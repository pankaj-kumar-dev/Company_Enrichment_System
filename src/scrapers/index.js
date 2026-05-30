'use strict';

const { scrapeWebsite } = require('./website');
const { scrapeLinkedIn } = require('./linkedin');

async function orchestrate(domain) {
  const website = await scrapeWebsite(domain);

  let linkedin = {};
  if (website.linkedinUrl) {
    linkedin = await scrapeLinkedIn(website.linkedinUrl).catch((err) => {
      // LinkedIn blocks bots with 999 or requires auth — degrade gracefully
      console.warn(`[scraper] LinkedIn failed (${website.linkedinUrl}): ${err.message}`);
      return {};
    });
  }

  return merge(domain, website, linkedin);
}

function merge(domain, website, linkedin) {
  return {
    domain,
    name: linkedin.name || website.name,
    description: linkedin.description || website.description,
    industry: linkedin.industry || null,
    employeeCount: linkedin.employeeCount || null,
    headquarters: linkedin.headquarters || null,
    foundedYear: linkedin.foundedYear || website.foundedYear || null,
    linkedinUrl: website.linkedinUrl || null,
    twitterUrl: website.twitterUrl || null,
    facebookUrl: website.facebookUrl || null,
    emails: website.emails || [],
    phone: website.phone || null,
    address: website.address || null,
    techStack: website.techStack || [],
    enrichedAt: new Date().toISOString(),
  };
}

module.exports = { orchestrate };
