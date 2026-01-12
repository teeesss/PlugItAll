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
 */
export const matchSubscription = (description: string): boolean => {
  // Normalize logic similar to analyzer
  const normalized = description.toUpperCase();
  // console.log(`Matching ${normalized} against ${subsDB.length} subs`);
  return subsDB.some((sub) => {
    // Check exact name match or regex keywords
    if (sub.regex_keywords && sub.regex_keywords.some((k) => normalized.includes(k.toUpperCase())))
      return true;
    return false;
  });
};

/**
 * Matches a detected subscription candidate against the known database.
 */
export function enrichSubscription(candidate: SubscriptionCandidate): EnrichedSubscription {
  const normalizedName = candidate.name.toUpperCase();

  // Find matching entry in DB
  const match = subsDB.find((service) => {
    const patterns = service.regex_keywords || [];
    return patterns.some((pattern: string) => normalizedName.includes(pattern));
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
