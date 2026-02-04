const { scrapeSermons, saveSermons, loadSermons } = require('./scraper');
const { generateRSSFeed, saveFeed, validateFeed } = require('./rss-generator');
const path = require('path');

/**
 * Main function to scrape sermons and generate RSS feed
 */
async function main() {
  try {
    console.log('=== PodPull: Sermon RSS Feed Generator ===\n');

    const sermonsFilePath = path.join(__dirname, 'sermons.json');
    const feedFilePath = path.join(__dirname, 'feed.xml');
    
    // Load existing sermons and filter out any invalid ones
    let existingSermons = await loadSermons(sermonsFilePath);
    existingSermons = filterValidSermons(existingSermons);
    console.log(`Found ${existingSermons.length} valid existing sermons\n`);

    // Determine run type
    const isFirstRun = existingSermons.length === 0;
    console.log(`${isFirstRun ? 'First run' : 'Update run'}: Fetching all available sermons\n`);

    // Scrape new sermons (no limit)
    let newSermons;
    try {
      const allPages = process.env.SCRAPE_ALL_PAGES === 'true';
      newSermons = await scrapeSermons({ allPages });
    } catch (error) {
      console.error('Scraping failed:', error.message);
      console.log('Using existing sermons data...');
      newSermons = [];
    }

    // Merge with existing sermons (avoiding duplicates)
    const allSermons = mergeSermons(existingSermons, newSermons);
    console.log(`Total sermons after merge: ${allSermons.length}\n`);

    // Save updated sermons list
    await saveSermons(allSermons, sermonsFilePath);

    // Generate RSS feed
    console.log('Generating RSS feed...');
    const rssXml = generateRSSFeed(allSermons, {
      title: 'One Fellowship Sermons',
      description: 'Weekly sermons from One Fellowship Church',
      siteUrl: 'https://onefellowship.com',
      feedUrl: 'https://kylejwx.github.io/podpull/feed.xml',
      imageUrl: 'https://onefellowship.com/images/podcast-logo.jpg',
      author: 'One Fellowship Church'
    });

    // Validate feed
    if (!validateFeed(rssXml)) {
      throw new Error('Generated RSS feed is invalid');
    }

    // Save RSS feed
    await saveFeed(rssXml, feedFilePath);

    console.log('\n=== Success! ===');
    console.log(`- Sermons in feed: ${allSermons.length}`);
    console.log(`- Feed file: ${feedFilePath}`);
    console.log(`- Sermons data: ${sermonsFilePath}`);
    
  } catch (error) {
    console.error('\n=== Error ===');
    console.error(error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

/**
 * Check if a sermon has a valid audio URL (not example.com or other placeholder)
 * @param {Object} sermon - Sermon object
 * @returns {boolean} True if the sermon has a valid audio URL
 */
function isValidSermon(sermon) {
  if (!sermon.audioUrl) return false;
  // Filter out example.com and other placeholder URLs
  const invalidDomains = ['example.com', 'example.org', 'test.com'];
  return !invalidDomains.some(domain => sermon.audioUrl.includes(domain));
}

/**
 * Filter out sermons with invalid/placeholder audio URLs
 * @param {Array} sermons - Array of sermon objects
 * @returns {Array} Filtered array with only valid sermons
 */
function filterValidSermons(sermons) {
  const validSermons = sermons.filter(isValidSermon);
  const removed = sermons.length - validSermons.length;
  if (removed > 0) {
    console.log(`Filtered out ${removed} sermons with invalid/placeholder URLs`);
  }
  return validSermons;
}

/**
 * Merge new sermons with existing ones, removing duplicates
 * @param {Array} existing - Existing sermons
 * @param {Array} newSermons - Newly scraped sermons
 * @returns {Array} Merged sermon list
 */
function mergeSermons(existing, newSermons) {
  const merged = [...existing];
  const existingUrls = new Set(existing.map(s => s.audioUrl));

  for (const sermon of newSermons) {
    if (!existingUrls.has(sermon.audioUrl)) {
      merged.push(sermon);
      existingUrls.add(sermon.audioUrl);
    }
  }

  // Sort by date (newest first)
  merged.sort((a, b) => {
    const dateA = new Date(a.pubDate);
    const dateB = new Date(b.pubDate);
    return dateB - dateA;
  });

  return merged;
}

// Run main function if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = { main, mergeSermons, filterValidSermons, isValidSermon };
