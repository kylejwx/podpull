const assert = require('node:assert/strict');
const test = require('node:test');

const { dateFromPreachedDate, normalizeSermonDate, parsePreachedDate } = require('../date-utils');
const { generateRSSFeed } = require('../rss-generator');

test('parses the church listing date without applying the runner timezone', () => {
  assert.equal(parsePreachedDate('July 5, 2026'), '2026-07-05');
  assert.equal(parsePreachedDate('December 24, 2026'), '2026-12-24');
});

test('uses a midday UTC anchor that remains on the sermon date across US time zones', () => {
  const sermonDate = dateFromPreachedDate('2026-07-05');

  for (const timeZone of ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles']) {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(sermonDate);
    const values = Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
    assert.deepEqual(values, { month: '07', day: '05', year: '2026' });
  }
});

test('normalizes legacy midnight-UTC dates and emits the corrected RSS timestamp', () => {
  const sermon = normalizeSermonDate({
    title: 'Sunday Sermon',
    audioUrl: 'https://s3.amazonaws.com/example/sunday.mp3',
    pubDate: '2026-07-05T00:00:00.000Z',
    link: 'https://example.com/sermon/sunday'
  });

  assert.equal(sermon.preachedDate, '2026-07-05');
  assert.equal(sermon.pubDate, '2026-07-05T12:00:00.000Z');

  const xml = generateRSSFeed([sermon]);
  assert.match(xml, /<pubDate>Sun, 05 Jul 2026 12:00:00 GMT<\/pubDate>/);
});
