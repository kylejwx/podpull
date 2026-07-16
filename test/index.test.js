const assert = require('node:assert/strict');
const test = require('node:test');

const { filterValidSermons, isValidSermon, mergeSermons } = require('../index');

test('filters sermon entries without a usable audio URL', () => {
  assert.equal(isValidSermon({ audioUrl: 'https://s3.amazonaws.com/example/audio.mp3' }), true);
  assert.equal(isValidSermon({ audioUrl: 'https://example.com/audio.mp3' }), false);
  assert.equal(isValidSermon({}), false);
  assert.equal(filterValidSermons([
    { audioUrl: 'https://s3.amazonaws.com/example/audio.mp3' },
    { audioUrl: 'https://example.org/audio.mp3' }
  ]).length, 1);
});

test('merges new sermons, removes duplicates, and normalizes legacy dates', () => {
  const existing = [{
    title: 'Older Sermon',
    audioUrl: 'https://s3.amazonaws.com/example/older.mp3',
    pubDate: '2026-07-05T00:00:00.000Z',
    link: 'https://example.com/older'
  }];
  const incoming = [{
    title: 'Newer Sermon',
    audioUrl: 'https://s3.amazonaws.com/example/newer.mp3',
    preachedDate: '2026-07-12',
    pubDate: '2026-07-12T12:00:00.000Z',
    link: 'https://example.com/newer'
  }, existing[0]];

  const merged = mergeSermons(existing, incoming);

  assert.equal(merged.length, 2);
  assert.equal(merged[0].title, 'Newer Sermon');
  assert.equal(merged[1].preachedDate, '2026-07-05');
  assert.equal(merged[1].pubDate, '2026-07-05T12:00:00.000Z');
});
