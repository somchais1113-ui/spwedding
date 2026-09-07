/* Small pure helpers, shared by app.js and the package verification script. */
(function (root) {
  'use strict';
  function validDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(Z|[+-]\d{2}:\d{2})$/.test(value)) return null;
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return null;
    // Detect impossible calendar days before the timezone conversion.
    const [year, month, day] = value.slice(0, 10).split('-').map(Number);
    if (month < 1 || month > 12 || day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate()) return null;
    return date;
  }
  function safeHttps(value) {
    if (typeof value !== 'string' || !value.trim()) return '';
    try { const url = new URL(value.trim()); return url.protocol === 'https:' && !url.username && !url.password ? url.href : ''; } catch (_) { return ''; }
  }
  function countdownParts(start, now) {
    const seconds = Math.max(0, Math.floor((start.getTime() - now.getTime()) / 1000));
    return { days: Math.floor(seconds / 86400), hours: Math.floor(seconds % 86400 / 3600), minutes: Math.floor(seconds % 3600 / 60), seconds: seconds % 60 };
  }
  function escapeICS(value) {
    return String(value ?? '').replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
  }
  function foldICS(line) {
    const encoder = new TextEncoder(); let output = '', segment = '', bytes = 0;
    for (const char of line) {
      const length = encoder.encode(char).length;
      if (bytes + length > 75) { output += segment + '\r\n'; segment = ' '; bytes = 1; }
      segment += char; bytes += length;
    }
    return output + segment;
  }
  function makeCalendar(config, now = new Date()) {
    const start = validDate(config.date.startAt), end = validDate(config.date.endAt);
    if (!start || !end || end <= start) return null;
    const stamp = date => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const names = config.couple.groom + ' & ' + config.couple.bride;
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SP Wedding Invitation//TH', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
      'UID:sp-wedding-' + start.getTime() + '@wedding.local', 'DTSTAMP:' + stamp(now), 'DTSTART:' + stamp(start), 'DTEND:' + stamp(end),
      'SUMMARY:' + escapeICS('งานแต่งงาน ' + names),
      'LOCATION:' + escapeICS([config.venue.name, config.venue.address, config.venue.province].filter(Boolean).join(' ')),
      'DESCRIPTION:' + escapeICS([config.invitation, safeHttps(config.venue.mapUrl)].filter(Boolean).join('\n')),
      'STATUS:CONFIRMED', 'END:VEVENT', 'END:VCALENDAR'];
    return lines.map(foldICS).join('\r\n') + '\r\n';
  }
  const api = { validDate, safeHttps, countdownParts, makeCalendar };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.WeddingHelpers = api;
})(typeof window === 'undefined' ? globalThis : window);
