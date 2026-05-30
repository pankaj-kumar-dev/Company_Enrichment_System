'use strict';

const DEFAULTS = {
  NODE_ENV: 'development',
  PORT: '3000',
  CACHE_TTL_HOURS: '168', // 7 days
  GEMINI_MODEL: 'gemini-2.5-flash',
};

const REQUIRED = ['GEMINI_API_KEY'];

Object.entries(DEFAULTS).forEach(([key, val]) => {
  if (!process.env[key]) process.env[key] = val;
});

const missing = REQUIRED.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`[config] missing required env vars: ${missing.join(', ')}`);
  process.exit(1);
}

module.exports = {
  nodeEnv: process.env.NODE_ENV,
  port: parseInt(process.env.PORT, 10),
  isProduction: process.env.NODE_ENV === 'production',
  cacheTtlHours: parseInt(process.env.CACHE_TTL_HOURS, 10),
  geminiApiKey: process.env.GEMINI_API_KEY,
  geminiModel: process.env.GEMINI_MODEL,
};
