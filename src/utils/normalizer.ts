/**
 * Normalizes transaction descriptions to allow for accurate grouping.
 * E.g., "NETFLIX.COM *8329" -> "NETFLIX"
 */
export function normalizeDescription(raw: string): string {
  let clean = raw.toUpperCase();

  // 0. Handle pending markers and punctuation at start
  clean = clean.replace(/^(PENDING[:\s]*|[*#\s]+)/, '');

  // 1. Remove category prefixes (e.g., "ENTERTAINMENT - ", "UTILITIES: ")
  // Matches word(s) followed by " - " or ": " at the beginning
  clean = clean.replace(/^[A-Z,\s]{3,15}[:\s-]{2,}/, ' ');

  // 2. Remove flexible dates (e.g., 10/23, 10-23, OCT 23)
  clean = clean.replace(/\b\d{1,2}[/-]\d{1,2}\b/g, ' ');
  clean = clean.replace(/\b(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s*\d{2,4}\b/g, ' ');

  // 3. Remove common noise words/prefixes
  clean = clean.replace(/\b(POS|ACH|DEBIT|CREDIT|RECURRING|PAYMENT|WITHDRAWAL|TRANS)\b/g, ' ');

  // 4. Remove location suffixes (e.g., "LOS GATOS CA", "NEW YORK NY")
  // Matches " CITY ST" at the end, where ST is 2 chars
  clean = clean.replace(/\s[A-Z\s]{2,15}\s[A-Z]{2}$/, ' ');

  // 5. Remove phone numbers
  clean = clean.replace(/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, ' ');
  clean = clean.replace(/\b\d{10,12}\b/g, ' ');

  // 6. Remove random digit sequences (transaction IDs)
  clean = clean.replace(/[*#]\s*\d+/g, ' ');
  // Only strip very long alphanumeric strings that are likely UUIDs/Hashes
  clean = clean.replace(/\b[A-Z0-9]{15,}\b/g, ' ');

  // 7. Remove common separators and trimmed whitespace
  clean = clean.replace(/[*-.#]/g, ' ');
  clean = clean.replace(/\s+/g, ' ').trim();

  // 8. Special Case Overrides
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

  // 9. Final Safety Check: Avoid overly generic or empty names
  if (clean.length < 3) return raw.toUpperCase().trim();

  return clean;
}
