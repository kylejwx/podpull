const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { parseListingPage, parseSermonAudio } = require('../scraper');

const fixture = name => fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf8');

test('parses sermon listings from a saved church-page fixture', () => {
  const { listings, totalPages } = parseListingPage(fixture('sermons-listing.html'));

  assert.equal(totalPages, 2);
  assert.deepEqual(listings, [{
    title: 'Sabbath in the Schemes',
    date: 'July 5, 2026',
    url: 'https://onefellowship.com/sermon/sabbath-in-the-schemes'
  }]);
});

test('extracts the direct audio URL from a saved sermon-page fixture', () => {
  assert.equal(
    parseSermonAudio(fixture('sermon-page.html')),
    'https://s3.amazonaws.com/account-media/20850/uploaded/s/example-audio.mp3'
  );
});
