const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs').promises;

const BASE_URL = 'https://onefellowship.com';
const DELAY_MS = 1500;

const httpClient = axios.create({
  timeout: 15000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  }
});

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Scrape a single listing page (/sermons/?page=N) to get sermon titles, dates,
 * and links to individual sermon pages. Also returns total page count from pagination.
 */
async function scrapeListingPage(pageNum = 1) {
  const url = pageNum === 1
    ? `${BASE_URL}/sermons/`
    : `${BASE_URL}/sermons/?page=${pageNum}&filtervars=`;

  console.log(`Fetching listing page ${pageNum}...`);
  const response = await httpClient.get(url);
  const $ = cheerio.load(response.data);

  const listings = [];
  $('article').each((_i, el) => {
    const $el = $(el);
    const dateText = $el.find('h6').text().trim();
    const $titleLink = $el.find('h4 a');
    const title = $titleLink.text().trim();
    const href = $titleLink.attr('href');

    if (!title || !href) return;

    listings.push({
      title,
      date: dateText,
      url: href.startsWith('http') ? href : `${BASE_URL}${href}`
    });
  });

  // Parse total pages from pagination links
  let totalPages = 1;
  $('p#pagination a').each((_i, el) => {
    const match = ($(el).attr('href') || '').match(/page=(\d+)/);
    if (match) totalPages = Math.max(totalPages, parseInt(match[1], 10));
  });

  return { listings, totalPages };
}

/**
 * Scrape an individual sermon page to extract the S3 audio URL.
 *
 * The listen button carries a data-audio attribute with this shape:
 *   https://historian.ministrycloud.com/r/<base64-token>/https://s3.amazonaws.com/...
 *
 * We pull the S3 portion out of that compound URL.
 */
async function scrapeSermonAudio(url) {
  console.log(`  Fetching audio URL from ${url}...`);
  const response = await httpClient.get(url);
  const $ = cheerio.load(response.data);

  const dataAudio = $('a[data-audio]').attr('data-audio');
  if (dataAudio) {
    const match = dataAudio.match(/(https:\/\/s3\.amazonaws\.com\/[^\s'"]+)/);
    if (match) return match[1];
  }

  // Fallback: any direct S3 link on the page
  let found = null;
  $('a[href*="s3.amazonaws.com"]').each((_i, el) => {
    if (!found) found = $(el).attr('href');
  });

  return found;
}

/**
 * Main scrape entry point.
 * @param {Object}  [options]
 * @param {boolean} [options.allPages=false] - When true, scrape every listing page
 *   (use for initial population). Default scrapes only page 1 (newest sermons).
 */
async function scrapeSermons({ allPages = false } = {}) {
  try {
    // --- Step 1: collect listings from the /sermons/ pages ---
    const allListings = [];
    const { listings, totalPages } = await scrapeListingPage(1);
    allListings.push(...listings);

    if (allPages) {
      for (let page = 2; page <= totalPages; page++) {
        await delay(DELAY_MS);
        const { listings: more } = await scrapeListingPage(page);
        allListings.push(...more);
      }
    }

    console.log(`Found ${allListings.length} sermons across listing pages`);

    // --- Step 2: visit each sermon page to get the S3 audio URL ---
    const sermons = [];
    for (const listing of allListings) {
      await delay(DELAY_MS);

      const audioUrl = await scrapeSermonAudio(listing.url);
      if (!audioUrl) {
        console.warn(`  No audio found for "${listing.title}" — skipping`);
        continue;
      }

      sermons.push({
        title: listing.title,
        audioUrl,
        description: `${listing.title} - One Fellowship Church`,
        pubDate: new Date(listing.date),
        link: listing.url
      });
    }

    console.log(`Successfully scraped ${sermons.length} sermons with audio`);
    return sermons;

  } catch (error) {
    console.error('Error scraping sermons:', error.message);
    throw error;
  }
}

/**
 * Save sermons to JSON file
 */
async function saveSermons(sermons, filepath = 'sermons.json') {
  try {
    await fs.writeFile(filepath, JSON.stringify(sermons, null, 2));
    console.log(`Saved ${sermons.length} sermons to ${filepath}`);
  } catch (error) {
    console.error('Error saving sermons:', error.message);
    throw error;
  }
}

/**
 * Load sermons from JSON file
 */
async function loadSermons(filepath = 'sermons.json') {
  try {
    const data = await fs.readFile(filepath, 'utf8');
    const sermons = JSON.parse(data);
    console.log(`Loaded ${sermons.length} sermons from ${filepath}`);
    return sermons;
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log(`No existing sermons file found at ${filepath}`);
      return [];
    }
    console.error('Error loading sermons:', error.message);
    throw error;
  }
}

module.exports = {
  scrapeSermons,
  saveSermons,
  loadSermons
};
