
/**
 * Normalizes transaction descriptions to allow for accurate grouping.
 * E.g., "NETFLIX.COM *8329" -> "NETFLIX"
 */



export function normalizeDescription(raw: string): string {
  let clean = raw.toUpperCase().trim();

  // 0. Special Case Overrides (Check EARLY to protect known brands from aggressive cleaning)
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
  if (clean.includes('MCDONALDS')) return 'MCDONALDS';

  // 1. Handle pending markers
  clean = clean.replace(/^(PENDING[:\s]*)/, '');

  // 2. Remove common payment processor prefixes
  clean = clean.replace(/^(SQ|TST|PAYPAL|PYPL|SP|SQUARE|TOAST)[\s*]+/, '');

  // 3. Remove category prefixes
  clean = clean.replace(/^[A-Z,\s]{3,15}[:\s-]{2,}/, ' ');

  // 4. Remove flexible dates (Enhanced for MM/DD/YYYY)
  clean = clean.replace(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g, ' ');
  clean = clean.replace(/\b\d{1,2}[/-]\d{1,2}\b/g, ' ');
  clean = clean.replace(/\b(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s*\d{2,4}\b/g, ' ');

  // 5. Remove common noise words/prefixes (Removed BILL)
  clean = clean.replace(/\b(POS|ACH|DEBIT|CREDIT|RECURRING|PAYMENT|WITHDRAWAL|TRANS|PURCHASE)\b/g, ' ');

  // 6. Remove phone numbers (Aggressive)
  clean = clean.replace(/(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, ' ');

  // 7. Remove store numbers / zips by aggressive truncation
  // Use a special marker to truncate if a 4-6 digit number is found (likely store # or zip)
  clean = clean.replace(/\b#?\d{4,6}\b/g, '___TRUNC___');
  if (clean.includes('___TRUNC___')) {
    clean = clean.split('___TRUNC___')[0].trim();
  }


  // 8. Remove location suffixes (City/State patterns)
  // Strategy: Strip "CITY STATE" or just "STATE" from the end if preceded by at least one merchant word

  // State codes
  const states = 'AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC';

  // Pass 0: Remove "WORD WORD WORD STATE" (e.g., "SALT LAKE CITY UT")
  clean = clean.replace(new RegExp(`\\s+[A-Z]+\\s+[A-Z]+\\s+[A-Z]+\\s+(${states})$`, 'i'), '');

  // Pass 1: Remove "WORD WORD STATE" (e.g., "SAN FRANCISCO CA")
  clean = clean.replace(new RegExp(`\\s+[A-Z]+\\s+[A-Z]+\\s+(${states})$`, 'i'), '');

  // Pass 2: Remove "WORD STATE" (e.g., "SEATTLE WA", "HOUSTON TX")
  clean = clean.replace(new RegExp(`\\s+[A-Z]+\\s+(${states})$`, 'i'), '');

  // Pass 3: Remove just "STATE" at the end (e.g., "UBER CA") - only if there's still text left
  const wordsBefore = clean.split(/\s+/).length;
  if (wordsBefore > 1) {
    clean = clean.replace(new RegExp(`\\s+(${states})$`, 'i'), '');
  }

  // 9. Remove random digit sequences/IDs (if not truncated)
  clean = clean.replace(/[*#]\s*\d+/g, ' ');
  clean = clean.replace(/\b\d{10,}\b/g, ' ');
  clean = clean.replace(/\b[A-Z0-9]{12,}\b/g, ' ');

  // 10. Remove common separators and trim
  clean = clean.replace(/[*-.#]/g, ' ');
  clean = clean.replace(/\s+/g, ' ').trim();

  // 11. Final Safety Check
  if (clean.length < 3) return raw.toUpperCase().trim();

  return clean;
}
