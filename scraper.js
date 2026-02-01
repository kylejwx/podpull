const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const path = require('path');

/**
 * Scrape sermons from the church website
 * @param {number} maxSermons - Maximum number of sermons to fetch
 * @returns {Promise<Array>} Array of sermon objects
 */
async function scrapeSermons(maxSermons = 300) {
  const baseUrl = 'https://onefellowship.com';
  const sermonsUrl = `${baseUrl}/sermons/`;
  const sermons = [];

  try {
    console.log(`Fetching sermons from ${sermonsUrl}...`);
    const response = await axios.get(sermonsUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    
    // Common selectors for sermon items - adjust based on actual website structure
    const sermonSelectors = [
      'article.sermon',
      '.sermon-item',
      '.post',
      'article',
      '.entry'
    ];

    let sermonElements = null;
    for (const selector of sermonSelectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        sermonElements = elements;
        console.log(`Found ${elements.length} sermons using selector: ${selector}`);
        break;
      }
    }

    if (!sermonElements || sermonElements.length === 0) {
      console.log('No sermon elements found. Trying alternative approach...');
      // Look for audio links as a fallback
      $('a[href$=".mp3"], audio source').each((i, elem) => {
        if (sermons.length >= maxSermons) return false;
        
        const audioUrl = $(elem).attr('href') || $(elem).attr('src');
        if (audioUrl) {
          const fullUrl = audioUrl.startsWith('http') ? audioUrl : `${baseUrl}${audioUrl}`;
          sermons.push({
            title: extractTitle($, elem),
            audioUrl: fullUrl,
            description: extractDescription($, elem),
            pubDate: extractDate($, elem),
            link: sermonsUrl
          });
        }
      });
    } else {
      // Process each sermon element
      sermonElements.each((i, elem) => {
        if (sermons.length >= maxSermons) return false;

        const $elem = $(elem);
        
        // Find audio URL
        const audioLink = $elem.find('a[href$=".mp3"], audio source').first();
        const audioUrl = audioLink.attr('href') || audioLink.attr('src');
        
        if (!audioUrl) return; // Skip if no audio found

        const fullAudioUrl = audioUrl.startsWith('http') ? audioUrl : `${baseUrl}${audioUrl}`;
        
        // Extract sermon data
        const sermon = {
          title: extractTitle($, elem),
          audioUrl: fullAudioUrl,
          description: extractDescription($, elem),
          pubDate: extractDate($, elem),
          link: extractLink($, elem, sermonsUrl)
        };

        sermons.push(sermon);
      });
    }

    console.log(`Successfully scraped ${sermons.length} sermons`);
    return sermons;

  } catch (error) {
    console.error('Error scraping sermons:', error.message);
    
    // Return mock data for testing if scraping fails
    if (process.env.NODE_ENV === 'development' || process.env.USE_MOCK_DATA === 'true') {
      console.log('Returning mock sermon data for testing...');
      return generateMockSermons(maxSermons);
    }
    
    throw error;
  }
}

/**
 * Extract title from sermon element
 */
function extractTitle($, elem) {
  const $elem = $(elem);
  
  // Try various title selectors
  const titleSelectors = ['h1', 'h2', 'h3', '.title', '.sermon-title', '.entry-title'];
  for (const selector of titleSelectors) {
    const title = $elem.find(selector).first().text().trim();
    if (title) return title;
  }
  
  // Fallback to link text
  const linkText = $elem.find('a').first().text().trim();
  if (linkText) return linkText;
  
  return 'Untitled Sermon';
}

/**
 * Extract description from sermon element
 */
function extractDescription($, elem) {
  const $elem = $(elem);
  
  // Try various description selectors
  const descSelectors = ['.description', '.excerpt', '.summary', '.content', 'p'];
  for (const selector of descSelectors) {
    const desc = $elem.find(selector).first().text().trim();
    if (desc && desc.length > 20) return desc;
  }
  
  return '';
}

/**
 * Extract date from sermon element
 */
function extractDate($, elem) {
  const $elem = $(elem);
  
  // Try various date selectors
  const dateSelectors = ['time', '.date', '.published', '.post-date'];
  for (const selector of dateSelectors) {
    const dateElem = $elem.find(selector).first();
    const dateStr = dateElem.attr('datetime') || dateElem.text().trim();
    if (dateStr) {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) return date;
    }
  }
  
  return new Date(); // Default to current date
}

/**
 * Extract link from sermon element
 */
function extractLink($, elem, defaultUrl) {
  const $elem = $(elem);
  const link = $elem.find('a').first().attr('href');
  
  if (!link) return defaultUrl;
  
  return link.startsWith('http') ? link : `https://onefellowship.com${link}`;
}

/**
 * Generate mock sermon data for testing
 */
function generateMockSermons(count = 10) {
  const sermons = [];
  const topics = [
    'Faith and Hope', 'Love One Another', 'Prayer and Worship',
    'Grace and Mercy', 'The Gospel', 'Christian Living',
    'Spiritual Growth', 'Community', 'Forgiveness', 'Salvation'
  ];

  for (let i = 0; i < count; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (i * 7)); // One week apart
    
    sermons.push({
      title: `${topics[i % topics.length]} - Week ${Math.floor(i / topics.length) + 1}`,
      audioUrl: `https://example.com/sermons/sermon-${i + 1}.mp3`,
      description: `A message about ${topics[i % topics.length].toLowerCase()} and its importance in our daily walk with Christ.`,
      pubDate: date,
      link: `https://onefellowship.com/sermons/sermon-${i + 1}`
    });
  }

  return sermons;
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
  loadSermons,
  generateMockSermons
};
