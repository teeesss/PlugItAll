import type { SubscriptionCandidate } from './analyzer';
import subsDB from '../data/subs.json';

export interface EnrichedSubscription extends SubscriptionCandidate {
  logo?: string;
  cancelUrl?: string;
  instructions?: string;
  displayName?: string;
}

/**
 * Matches a detected subscription candidate against the known database.
 * Returns metadata about the match, including signal strength.
 */
export const matchSubscription = (description: string): { id: string; name: string; isWeakSignal: boolean } | null => {
  // Normalize logic similar to analyzer
  const normalized = description.toUpperCase();

  const match = subsDB.find((sub) => {
    // Check exact name match or regex keywords
    if (sub.regex_keywords && sub.regex_keywords.some((k) => {
      const keyword = k.toUpperCase();

      // For short keywords (<= 5 chars), require word boundary to prevent false matches
      // e.g., "STAN" should not match "STANDARD"
      if (keyword.length <= 5) {
        // Use word boundary regex: ensure the keyword is not part of a larger word
        const wordBoundaryRegex = new RegExp(`\\b${keyword}\\b`, 'i');
        return wordBoundaryRegex.test(normalized);
      }

      // For longer keywords, simple substring match is fine
      return normalized.includes(keyword);
    }))
      return true;
    return false;
  });

  if (!match) return null;

  // Determine Signal Strength
  // Weak Signal = Matched on a keyword that is very short (<= 3 chars, e.g. "WW", "WSJ", "NYT")
  // We check which keyword actually matched to determine this.
  const matchedKeyword = match.regex_keywords?.find(k => {
    const keyword = k.toUpperCase();
    if (keyword.length <= 5) {
      return new RegExp(`\\b${keyword}\\b`, 'i').test(normalized);
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
 * Matches a detected subscription candidate against the known database.
 */
export function enrichSubscription(candidate: SubscriptionCandidate): EnrichedSubscription {
  const normalizedName = candidate.name.toUpperCase();

  // Find matching entry in DB
  const match = subsDB.find((service) => {
    const patterns = service.regex_keywords || [];
    return patterns.some((k) => {
      const keyword = k.toUpperCase();
      // Use strict word boundary for short keywords to avoid bad logo matches
      if (keyword.length <= 5) {
        return new RegExp(`\\b${keyword}\\b`, 'i').test(normalizedName);
      }
      return normalizedName.includes(keyword);
    });
  });

  if (match) {
    return {
      ...candidate,
      displayName: match.name, // Use pretty name from DB
      logo: match.logo,
      cancelUrl: match.cancel_url,
      instructions: match.instructions,
    };
  }

  // Default return if no match found
  return {
    ...candidate,
    displayName: candidate.name, // Keep original name
    logo: undefined,
    cancelUrl: undefined,
    instructions: 'No specific cancellation info found. Try searching Google.',
  };
}
