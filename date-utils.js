const MONTHS = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12
};

/**
 * Convert the church site's human-readable sermon date to a calendar date.
 * A date-only value is intentionally kept separate from an upload timestamp.
 */
function parsePreachedDate(dateText) {
  const match = String(dateText).trim().match(/^([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})$/);
  if (!match) {
    throw new Error(`Unsupported sermon date format: ${dateText}`);
  }

  const month = MONTHS[match[1].toLowerCase()];
  const day = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (!month || date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error(`Invalid sermon date: ${dateText}`);
  }

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Use noon UTC as a display anchor. It preserves the intended calendar date
 * throughout the continental United States without claiming an upload time.
 */
function dateFromPreachedDate(preachedDate) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(preachedDate)) {
    throw new Error(`Invalid preachedDate: ${preachedDate}`);
  }

  const date = new Date(`${preachedDate}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== preachedDate) {
    throw new Error(`Invalid preachedDate: ${preachedDate}`);
  }

  return date;
}

function normalizeSermonDate(sermon) {
  const preachedDate = sermon.preachedDate || new Date(sermon.pubDate).toISOString().slice(0, 10);
  const pubDate = dateFromPreachedDate(preachedDate).toISOString();

  return { ...sermon, preachedDate, pubDate };
}

function getSermonDate(sermon) {
  return sermon.preachedDate
    ? dateFromPreachedDate(sermon.preachedDate)
    : new Date(sermon.pubDate);
}

module.exports = {
  parsePreachedDate,
  dateFromPreachedDate,
  normalizeSermonDate,
  getSermonDate
};
