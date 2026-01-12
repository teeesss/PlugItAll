/**
 * Normalizes transaction descriptions to allow for accurate grouping.
 * E.g., "NETFLIX.COM *8329" -> "NETFLIX"
 */
export function normalizeDescription(raw: string): string {
  let clean = raw.toUpperCase();

  // 1. Remove commonly known noise prefixes/suffixes
  // "POS DEBIT", "ACH DEBIT", "RECURRING PAYMENT"
  clean = clean.replace(/\b(POS|ACH|DEBIT|CREDIT|RECURRING|PAYMENT|WITHDRAWAL)\b/g, ' ');

  // 2. Remove flexible dates (e.g., 10/23, 10-23, OCT 23)
  // Matches MM/DD, MM-DD, or simple dates often found in bank statements
  clean = clean.replace(/\b\d{1,2}[/-]\d{1,2}\b/g, ' ');
  // Matches MMM YY or MMMYY (e.g. OCT23, OCT 23)
  clean = clean.replace(/\b(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s*\d{2,4}\b/g, ' ');

  // 3. Remove random digit sequences (often transaction IDs)
  // Matches 3 or more consecutive digits, or mixed with chars
  // Be careful not to remove brand names with numbers like "Floor 13" but usually subscription ones are "Name 12345"
  clean = clean.replace(/[*#]\s*\d+/g, ' '); // Matches *1234 or #1234
  clean = clean.replace(/\b\d{4,}\b/g, ' '); // Matches long standalone numbers like 928374

  // 4. Remove common separators and trimmed whitespace
  clean = clean.replace(/[*-.#]/g, ' ');
  clean = clean.replace(/\s+/g, ' ').trim();

  // 5. Special Case Overrides (optional, for very messy statements)
  if (clean.includes('NETFLIX')) return 'NETFLIX';
  if (clean.includes('SPOTIFY')) return 'SPOTIFY';
  if (
    clean.includes('AMAZON PRIME') ||
    clean.includes('AMZN PRIME') ||
    clean.includes('PRIME VIDEO')
  )
    return 'AMAZON PRIME';
  if (clean.includes('AMZN') || clean.includes('AMAZON')) return 'AMAZON';
  if (clean.includes('VISIBLE') || clean.includes('VISIBLESERV')) return 'VISIBLE';
  if (clean.includes('YOUTUBE TV')) return 'YOUTUBE TV';
  if (clean.includes('SIRIUSXM') || clean.includes('SXM')) return 'SIRIUSXM';
  if (clean.includes('HULU')) return 'HULU';
  if (clean.includes('DISNEY')) return 'DISNEY PLUS';

  return clean;
}
