import type { SubscriptionCandidate } from './analyzer';
import subsDB from '../data/subs.json';

export interface EnrichedSubscription extends SubscriptionCandidate {
  logo?: string;
  cancelUrl?: string;
  instructions?: string;
  displayName?: string;
}

/**
 * Internal helper to find the best match in the database.
 * Now centrally logic for both identification and enrichment.
 */
function findDatabaseMatch(rawName: string): typeof subsDB[0] | undefined {
  const normalized = rawName.toUpperCase();

  return subsDB.find((sub) => {
    // Safety: Ensure regex_keywords exists
    if (!sub.regex_keywords || !Array.isArray(sub.regex_keywords)) return false;

    return sub.regex_keywords.some((k) => {
      const keyword = k.toUpperCase();

      // For short keywords (<= 5 chars), require word boundary to prevent false positive matches
      // e.g., "STAN" should not match "STANDARD", "UBER" should not match "PUBERTY"
      if (keyword.length <= 5) {
        // Use word boundary regex: ensure the keyword is not part of a larger word
        // We escape the keyword just in case it has special regex chars (unlikely for keywords but good practice)
        const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const wordBoundaryRegex = new RegExp(`\\b${escapedKeyword}\\b`, 'i');
        return wordBoundaryRegex.test(normalized);
      }

      // For longer keywords, simple substring match is robust enough
      // e.g. "NETFLIX" matches "PAYPAL *NETFLIX"
      return normalized.includes(keyword);
    });
  });
}

/**
 * Matches a detected subscription candidate against the known database.
 * Returns metadata about the match, including signal strength.
 * Used by the Analyzer to group transactions.
 */
export const matchSubscription = (description: string): { id: string; name: string; isWeakSignal: boolean } | null => {
  const match = findDatabaseMatch(description);

  if (!match) return null;

  // Determine Signal Strength
  // Weak Signal = Matched on a keyword that is very short (<= 3 chars, e.g. "WW", "WSJ", "NYT")
  // We check which keyword actually matched to determine this.
  const normalized = description.toUpperCase();
  const matchedKeyword = match.regex_keywords?.find(k => {
    const keyword = k.toUpperCase();
    if (keyword.length <= 5) {
      const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`\\b${escapedKeyword}\\b`, 'i').test(normalized);
    }
    return normalized.includes(keyword);
  });

  const isWeakSignal = (matchedKeyword?.length || 0) <= 3;

  return {
    id: match.id,
    name: match.name,
    isWeakSignal
  };
};

/**
 * Enriches a candidate subscription with logo, URL, and display name from the DB.
 * Used by the UI to render cards.
 */
export function enrichSubscription(candidate: SubscriptionCandidate): EnrichedSubscription {
  const match = findDatabaseMatch(candidate.name);

  if (match) {
    return {
      ...candidate,
      displayName: match.name, // Use pretty name from DB (e.g. "Disney+" instead of "DISNEY PLUS")
      logo: match.logo,
      cancelUrl: match.cancel_url,
      instructions: match.instructions,
    };
  }

  // Fallback: If no direct match, try to fuzzy match common patterns
  // Examples: "AMZN MKTP US" -> Try finding "AMAZON"
  // This is a "Hail Mary" pass
  // TODO: Add Levenshtein or specific alias map if needed in future

  // Default return if no match found
  return {
    ...candidate,
    displayName: candidate.name, // Keep original name
    logo: undefined,
    cancelUrl: undefined,
    instructions: 'No specific cancellation info found. Try searching Google.',
  };
}
