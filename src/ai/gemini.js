'use strict';

const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');
const config = require('../config');
const { validate, EMPTY_AI } = require('./schema');

let _model = null;

function getModel() {
  if (!_model) {
    const genAI = new GoogleGenerativeAI(config.geminiApiKey);
    _model = genAI.getGenerativeModel({
      model: config.geminiModel,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            core_service:        { type: SchemaType.STRING },
            target_customer:     { type: SchemaType.STRING },
            probable_pain_point: { type: SchemaType.STRING },
            outreach_opener:     { type: SchemaType.STRING },
          },
          required: ['core_service', 'target_customer', 'probable_pain_point', 'outreach_opener'],
        },
        temperature: 0.4,
        maxOutputTokens: 512,
      },
    });
  }
  return _model;
}

function buildPrompt(scraped) {
  // Token-efficient: only feed what Gemini needs for analytical fields
  const lines = [
    `Company: ${scraped.name || 'Unknown'}`,
    `Domain: ${scraped.domain}`,
  ];
  if (scraped.description) lines.push(`Description: ${scraped.description.slice(0, 400)}`);
  if (scraped.industry)    lines.push(`Industry: ${scraped.industry}`);
  if (scraped.techStack?.length) lines.push(`Tech: ${scraped.techStack.join(', ')}`);
  if (scraped.employeeCount)     lines.push(`Employees: ~${scraped.employeeCount}`);
  if (scraped.foundedYear)       lines.push(`Founded: ${scraped.foundedYear}`);

  return [
    'Analyze this company. Return JSON with exactly these 4 fields:',
    '- core_service: what they sell or do (1 concise sentence)',
    '- target_customer: who their primary buyer is (1 concise sentence)',
    '- probable_pain_point: the main problem they solve for customers (1 concise sentence)',
    '- outreach_opener: a personalized first sentence for a cold email to this company',
    '',
    'Use only the provided data. If unsure, return an empty string. Do not invent facts.',
    '',
    ...lines,
  ].join('\n');
}

async function callOnce(scraped) {
  const result = await getModel().generateContent(buildPrompt(scraped));
  return JSON.parse(result.response.text());
}

async function enrich(scraped) {
  try {
    const aiFields = await callOnce(scraped);
    if (validate(aiFields)) return aiFields;

    console.warn('[gemini] invalid response shape, retrying');
    const retry = await callOnce(scraped);
    return validate(retry) ? retry : EMPTY_AI;
  } catch (err) {
    console.warn('[gemini] enrichment failed:', err.message);
    return EMPTY_AI;
  }
}

module.exports = { enrich };
