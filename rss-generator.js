const RSS = require('rss');
const fs = require('fs').promises;
const { getSermonDate } = require('./date-utils');

/**
 * Generate RSS feed from sermon data
 * @param {Array} sermons - Array of sermon objects
 * @param {Object} options - Feed configuration options
 * @returns {string} RSS feed XML
 */
function generateRSSFeed(sermons, options = {}) {
  const {
    title = 'One Fellowship Sermons',
    description = 'Weekly sermons from One Fellowship Church',
    siteUrl = 'https://onefellowship.com',
    feedUrl = 'https://kylejwx.github.io/podpull/feed.xml',
    language = 'en',
    imageUrl = 'https://onefellowship.com/images/podcast-logo.jpg',
    author = 'One Fellowship Church',
    categories = ['Religion & Spirituality', 'Christianity']
  } = options;

  // Sort sermons by their event date (newest first).
  const sortedSermons = [...sermons].sort((a, b) => getSermonDate(b) - getSermonDate(a));
  const feedDate = sortedSermons.length > 0 ? getSermonDate(sortedSermons[0]) : new Date();

  const feed = new RSS({
    title,
    description,
    feed_url: feedUrl,
    site_url: siteUrl,
    language,
    image_url: imageUrl,
    author,
    categories,
    pubDate: feedDate,
    ttl: 60,
    custom_namespaces: {
      itunes: 'http://www.itunes.com/dtds/podcast-1.0.dtd'
    },
    custom_elements: [
      { 'itunes:author': author },
      { 'itunes:summary': description },
      { 'itunes:explicit': 'no' },
      { 'itunes:owner': [
        { 'itunes:name': author },
        { 'itunes:email': 'info@onefellowship.com' }
      ]},
      { 'itunes:image': { _attr: { href: imageUrl } } },
      { 'itunes:category': { _attr: { text: 'Religion & Spirituality' } } }
    ]
  });

  // Add each sermon as an item
  sortedSermons.forEach(sermon => {
    const pubDate = getSermonDate(sermon);
    
    feed.item({
      title: sermon.title,
      description: sermon.description || sermon.title,
      url: sermon.link,
      guid: sermon.audioUrl,
      date: pubDate,
      enclosure: {
        url: sermon.audioUrl,
        type: 'audio/mpeg'
      },
      custom_elements: [
        { 'itunes:author': author },
        { 'itunes:subtitle': sermon.title },
        { 'itunes:summary': sermon.description || sermon.title },
        { 'itunes:duration': sermon.duration || '00:00:00' },
        { 'itunes:explicit': 'no' }
      ]
    });
  });

  return feed.xml({ indent: true });
}

/**
 * Save RSS feed to file
 * @param {string} xml - RSS feed XML content
 * @param {string} filepath - Path to save the feed
 */
async function saveFeed(xml, filepath = 'feed.xml') {
  try {
    await fs.writeFile(filepath, xml, 'utf8');
    console.log(`RSS feed saved to ${filepath}`);
    console.log(`Feed size: ${(xml.length / 1024).toFixed(2)} KB`);
  } catch (error) {
    console.error('Error saving RSS feed:', error.message);
    throw error;
  }
}

/**
 * Validate RSS feed format
 * @param {string} xml - RSS feed XML content
 * @returns {boolean} True if valid
 */
function validateFeed(xml) {
  try {
    // Basic validation checks
    if (!xml.includes('<?xml version="1.0" encoding="UTF-8"?>')) {
      console.warn('Warning: XML declaration missing');
    }
    
    if (!xml.includes('<rss')) {
      throw new Error('Invalid RSS: No <rss> tag found');
    }
    
    if (!xml.includes('<channel>')) {
      throw new Error('Invalid RSS: No <channel> tag found');
    }
    
    if (!xml.includes('<item>')) {
      console.warn('Warning: No items found in feed');
    }
    
    console.log('RSS feed validation passed');
    return true;
  } catch (error) {
    console.error('RSS feed validation failed:', error.message);
    return false;
  }
}

module.exports = {
  generateRSSFeed,
  saveFeed,
  validateFeed
};
