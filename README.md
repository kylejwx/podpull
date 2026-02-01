# podpull

podpull is a tool for pulling audio from the web and publishing podcast feeds automatically.

## Features

- 🎙️ Scrapes sermon audio and metadata from church websites
- 📡 Generates podcast-compatible RSS feeds
- 🤖 Automated weekly updates via GitHub Actions
- 💾 Stores sermon data for incremental updates
- 📱 Compatible with all major podcast players

## How It Works

1. **First Run**: Scrapes up to 300 historical sermons from the church website
2. **Weekly Updates**: Automatically fetches new sermons every Sunday at 2 AM UTC
3. **RSS Generation**: Creates a podcast-compatible RSS feed with iTunes tags
4. **GitHub Pages**: Feed is automatically committed and can be hosted via GitHub Pages

## Setup

### 1. Clone and Install

```bash
git clone https://github.com/kylejwx/podpull.git
cd podpull
npm install
```

### 2. Run Locally

```bash
npm start
```

This will:
- Scrape sermons from the configured website
- Generate `sermons.json` with all sermon metadata
- Create `feed.xml` with the podcast RSS feed

### 3. Enable GitHub Actions

The workflow is configured in `.github/workflows/update-feed.yml` and will:
- Run automatically every Sunday at 2 AM UTC
- Can be manually triggered from the Actions tab
- Commits updated `feed.xml` and `sermons.json` back to the repository

### 4. Access Your Podcast Feed

Once the workflow runs, your RSS feed will be available at:
```
https://kylejwx.github.io/podpull/feed.xml
```

Add this URL to your favorite podcast player to subscribe!

## Configuration

Edit `index.js` to customize the RSS feed metadata:

```javascript
const rssXml = generateRSSFeed(allSermons, {
  title: 'Your Church Name',
  description: 'Weekly sermons from Your Church',
  siteUrl: 'https://yourchurch.com',
  feedUrl: 'https://yourusername.github.io/podpull/feed.xml',
  author: 'Your Church Name'
});
```

## Files

- `index.js` - Main orchestration script
- `scraper.js` - Web scraping logic for sermon data
- `rss-generator.js` - RSS feed generation
- `sermons.json` - Cached sermon metadata
- `feed.xml` - Generated podcast RSS feed
- `.github/workflows/update-feed.yml` - GitHub Actions workflow

## Testing

To test with mock data (useful when the website is unreachable):

```bash
USE_MOCK_DATA=true npm start
```

## Requirements

- Node.js 18 or higher
- npm dependencies (automatically installed):
  - `axios` - HTTP client for web scraping
  - `cheerio` - HTML parsing
  - `rss` - RSS feed generation

## License

ISC

