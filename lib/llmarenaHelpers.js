#!/usr/bin/env node
'use strict';

const { createLogger } = require('homey-log');
const logger = createLogger({ logLevel: 'info' });
const fetch = require('node-fetch');
const tesseract = require('tesseract.js');
const spacy = require('spacy-nlp');
const natural = require('natural');
const { RateLimiter } = require('limiter');

// Check if environment variables are set
const LLMARENA_API_KEY = process.env.LLMARENA_API_KEY;
const LLMARENA_FALLBACK = process.env.LLMARENA_FALLBACK === 'true';
const LLMARENA_API_URL = process.env.LLMARENA_API_URL || 'https://api.llmarena.ai/v1';

// Rate limiter for API calls (1 request per second)
const limiter = new RateLimiter({ tokensPerInterval: 1, interval: 'second' });

/**
 * Process text using NLP to extract device information.
 * @param {string} text - The text to process.
 * @returns {Promise<Object>} - Extracted device information.
 */
async function processTextWithNLP(text) {
  if (!LLMARENA_FALLBACK && LLMARENA_API_KEY) {
    try {
      await limiter.removeTokens(1);
      const response = await fetch(`${LLMARENA_API_URL}/nlp/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${LLMARENA_API_KEY}`
        },
        body: JSON.stringify({ text })
      });

      if (!response.ok) {
        throw new Error(`NLP API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      logger.error(`NLP API call failed: ${error.message}`);
      if (LLMARENA_FALLBACK) {
        logger.info('Falling back to local NLP processing');
        return processTextLocally(text);
      }
      throw error;
    }
  } else {
    return processTextLocally(text);
  }
}

/**
 * Process image using OCR and vision to extract text and device information.
 * @param {string} imagePath - Path to the image file.
 * @returns {Promise<Object>} - Extracted device information.
 */
async function processImageWithVision(imagePath) {
  if (!LLMARENA_FALLBACK && LLMARENA_API_KEY) {
    try {
      await limiter.removeTokens(1);
      const formData = new FormData();
      formData.append('image', fs.createReadStream(imagePath));

      const response = await fetch(`${LLMARENA_API_URL}/vision/process`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LLMARENA_API_KEY}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Vision API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      logger.error(`Vision API call failed: ${error.message}`);
      if (LLMARENA_FALLBACK) {
        logger.info('Falling back to local OCR processing');
        return processImageLocally(imagePath);
      }
      throw error;
    }
  } else {
    return processImageLocally(imagePath);
  }
}

/**
 * Process text locally using spaCy and natural.
 * @param {string} text - The text to process.
 * @returns {Object} - Extracted device information.
 */
function processTextLocally(text) {
  // Example: using spaCy for entity recognition
  const entities = spacy.getEntities(text);
  const tokenizer = new natural.WordTokenizer();
  const tokens = tokenizer.tokenize(text);

  // Simple extraction logic (to be enhanced)
  const deviceInfo = {
    model: entities.find(e => e.label === 'PRODUCT')?.text,
    brand: entities.find(e => e.label === 'ORG')?.text,
    // ... other fields
  };

  return deviceInfo;
}

/**
 * Process image locally using Tesseract OCR.
 * @param {string} imagePath - Path to the image file.
 * @returns {Promise<Object>} - Extracted text and device information.
 */
async function processImageLocally(imagePath) {
  const { data: { text } } = await tesseract.recognize(imagePath);
  return processTextLocally(text);
}

module.exports = {
  processTextWithNLP,
  processImageWithVision
};
