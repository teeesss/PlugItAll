import type { Transaction } from '../mocks/statements';
export type { Transaction };
import { matchSubscription } from './matcher';
import { normalizeDescription } from './normalizer';
import pricingDB from '../data/subscription_pricing.json';

export interface SubscriptionCandidate {
  name: string;
  averageAmount: number;
  frequency: 'Monthly' | 'Yearly' | 'Weekly' | 'Irregular';
  confidence: 'High' | 'Medium' | 'Low';
  nextPaymentDate?: string;
  description?: string; // Add description for UI context if needed
}

/**
 * Validates against known high-risk pricing (e.g. Amazon, Walmart).
 * Returns 'MATCH' (confirmed sub price), 'REJECT' (confirmed purchase price), or 'NEUTRAL' (not high risk).
 */
function validateHighRiskPrice(name: string, amount: number): 'MATCH' | 'REJECT' | 'NEUTRAL' {
  const normalizedName = name.toUpperCase();

  // Find matching high-risk provider
  // Sort by keyword length (longest first) to prefer more specific matches
  let bestMatch: (typeof pricingDB)[0] | undefined;
  let longestKeywordLen = 0;

  pricingDB.forEach((p) => {
    p.merchant_keywords.forEach((k) => {
      if (normalizedName.includes(k) && k.length > longestKeywordLen) {
        longestKeywordLen = k.length;
        bestMatch = p;
      }
    });
  });

  const provider = bestMatch;

  if (!provider) return 'NEUTRAL';

  // Check min_amount if defined (e.g., YouTube TV must be > $50)

  if (provider.min_amount && amount < provider.min_amount) {
    return 'REJECT'; // Below minimum for this subscription
  }

  // Check against known plans

  const validPlan = provider.plans.find((plan) => {
    const tolerance = 0.05;

    return Math.abs(plan.amount - amount) <= tolerance;
  });

  if (validPlan) return 'MATCH';

  // Price doesn't match any known plan
  // For HIGH risk with min_amount - if above minimum, treat as valid variant (MATCH)

  if (provider.min_amount && amount >= provider.min_amount && provider.variance_allowed) {
    return 'MATCH'; // Above minimum and variance allowed = likely the subscription with add-ons
  }

  // ONLY REJECT if it's a HIGH risk provider without min_amount logic

  if (provider.risk_level === 'HIGH' || provider.risk_level === 'EXTREME') {
    return 'REJECT';
  }

  return 'NEUTRAL';
}

/**
 * Core Logic Engine: Detects recurring payments from a list of transactions.
 */
export function detectSubscriptions(rawTransactions: Transaction[]): SubscriptionCandidate[] {
  const groups = new Map<string, Transaction[]>();

  // 1. Group by Normalized Description
  rawTransactions.forEach((t) => {
    const key = normalizeDescription(t.description);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(t);
  });

  const candidates: SubscriptionCandidate[] = [];

  groups.forEach((transactions, name) => {
    // EXCEPTION: If it is a KNOWN subscription pattern, allow even 1 instance.
    // This supports users uploading a Single PDF (1 month) to see what they have.
    const isKnown = matchSubscription(name);

    // Negative filter for keywords
    const BLACKLIST = [
      // Retail / Marketplaces (Known to have many one-off purchases)
      'AMAZON',
      'EBAY',
      'ETSY',
      'WALMART',
      'TARGET',
      'SHELL',
      'EXXON',
      'CHEVRON',
      '7-ELEVEN',
      'COSTCO',
      // Financial/Utilities
      'INTEREST',
      'FEE',
      'AUTOPAY',
      'PAYMENT',
      'TRANSFER',
      'ATM',
      'DEPOSIT',
      'CREDIT CARD',
      'BANK',
      'LOAN',
      'MORTGAGE',
      'RENT',
      // Fast Food / Restaurants (Common False Positives)
      'PIZZA',
      'BURGER',
      'DOORDASH',
      'UBER EATS',
      'GRUBHUB',
      'MCDONALDS',
      "MCDONALD'S",
      'DOMINO',
      'STARBUCKS',
      'CHICK-FIL-A',
      'CHICK FIL A',
      'CHICKFILA', // All variants
      'TACO BELL',
      'DUNKIN',
      'WENDY',
      'PANDA EXPRESS',
      'LITTLE CAES',
      'SONIC',
      'ARBYS',
      'POPEYES',
      'CHIPOTLE',
      'PANERA',
      'SUBWAY',
      'FIVE GUYS',
      // Gas Stations
      'CIRCLE K',
      'MARATHON',
      'BP ',
      'TEXACO',
      'VALERO',
      'SPEEDWAY',
      'QUIKTRIP',
      'WAWA',
      'SHEETZ',
      'RACETRAC',
      'CEFCO',
      'MURPHY',
      // General Retail / Dollar Stores
      'DOLLAR GENERAL',
      'DOLLAR TREE',
      'DOLLARTREE',
      'FAMILY DOLLAR',
      'WALMART SUPERCENTER',
      'WM SUPERCENTER',
      'KROGER',
      'SAFEWAY',
      'PUBLIX',
      'ALDI',
      'HOME DEPOT',
      'LOWES',
      'MENARDS',
      'CVS',
      'WALGREENS',
      'RITE AID',
      // Travel / One-off
      'PINK JEEP',
      'PARKING',
      'HOTEL',
      'AIRBNB',
      'VRBO',
      // Specific false positives from user data (2026-01-12)
      'WWMC PA FT',
      'SP ULC VH',
      'THE DISTRICT',
      'SARAZONA',
      'HUDSON',
      'MARIPOSA',
      'G2G',
      'TST ',
    ];

    // Only apply blacklist if it is NOT a known subscription
    if (!isKnown && BLACKLIST.some((b) => name.toUpperCase().includes(b))) return;

    if (transactions.length < 2 && !isKnown) return;

    // Sort by date
    transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // --- SUB-GROUPING LOGIC (Price Clustering) ---
    // If we have multiple different price points (e.g. Visible $25 and $35), strict variance check will fail.
    // We should try to cluster them.

    const clusters: Transaction[][] = [];
    const processed = new Set<number>();

    // Naive clustering: Group by exact amount (or very close)
    for (let i = 0; i < transactions.length; i++) {
      if (processed.has(i)) continue;

      const currentCluster = [transactions[i]];
      processed.add(i);
      const baseAmount = transactions[i].amount;

      for (let j = i + 1; j < transactions.length; j++) {
        if (processed.has(j)) continue;
        // Allow very small deviation ($0.50) for currency fluctuation, but generally distinct plans are fixed.
        if (Math.abs(transactions[j].amount - baseAmount) < 1.0) {
          currentCluster.push(transactions[j]);
          processed.add(j);
        }
      }
      clusters.push(currentCluster);
    }

    // Identify Shopping Patterns vs Multi-Plan Subscriptions
    // - 2 clusters with 1 item each = Likely dual-plan (e.g., 2 Visible phone lines)
    // - 3+ clusters, all single-item = Shopping pattern (e.g., Fabletics purchases)
    // --- SHOPPING PATTERN DETECTION ---
    // If a merchant has many different price points, it's almost certainly a shopping/retail pattern (eBay, Amazon).
    // Exceptions are made for known "consolidate" subscriptions (YouTube TV).
    const isShoppingPattern = clusters.length >= 3;

    // Check if this provider should consolidate variable prices (e.g., YouTube TV)
    const shouldConsolidate = pricingDB.some(
      (p) =>
        p.merchant_keywords.some((k) => name.toUpperCase().includes(k)) && p.consolidate === true
    );

    // If consolidate mode: create ONE candidate with highest price, skip individual cluster analysis
    if (shouldConsolidate && clusters.length > 1) {
      const allAmounts = transactions.map((t) => t.amount);
      const highestAmount = Math.max(...allAmounts);

      // Validate the highest price
      const priceCheck = validateHighRiskPrice(name, highestAmount);
      if (priceCheck !== 'REJECT') {
        candidates.push({
          name,
          averageAmount: highestAmount,
          frequency: 'Monthly',
          confidence: 'High',
        });
      }
      return; // Skip individual cluster processing
    }

    // Analyze EACH cluster independently
    clusters.forEach((clusterTx, clusterIdx) => {
      // DEBUG
      if (name.toUpperCase().includes('VISIBLE')) {
        console.log(
          `[DEBUG] Processing cluster ${clusterIdx}: ${clusterTx.length} items @ $${clusterTx[0].amount}`
        );
      }

      // Reject unknown single transactions
      if (clusterTx.length < 2 && !isKnown) {
        if (name.toUpperCase().includes('VISIBLE')) console.log(`  -> REJECTED: single unknown`);
        return;
      }

      // Reject subscriptions that look like shopping (3+ variable prices)
      // UNLESS it's a special consolidation merchant (YouTube TV)
      if (isShoppingPattern && !shouldConsolidate) {
        if (name.toUpperCase().includes('VISIBLE')) console.log(`  -> REJECTED: shopping pattern`);
        return;
      }

      // Recalculate metrics for this cluster
      const amounts = clusterTx.map((t) => t.amount);
      const averageAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const maxAmount = Math.max(...amounts);
      const minAmount = Math.min(...amounts);
      const amountVariance = (maxAmount - minAmount) / averageAmount;

      // --- HIGH RISK PRICE VALIDATION (Amazon, Walmart, Apple, etc) ---
      const priceCheck = validateHighRiskPrice(name, averageAmount);

      if (priceCheck === 'REJECT') {
        if (name.toUpperCase().includes('VISIBLE')) console.log(`  -> REJECTED: high risk price`);
        // It matched a High Risk provider (Amazon/Walmart) but NOT a valid subscription price.
        // Assuming it's a purchase. REJECT.
        // console.log(`Rejected High Risk Item: ${name} @ $${averageAmount}`);
        return;
      }

      // If explicit price match, we treat it as known and verified
      const isVerifiedPrice = priceCheck === 'MATCH';

      // Strict Variance Rules apply to the CLUSTER now (only if >= 2)
      if (clusterTx.length === 2 && amountVariance > 0.01) return;
      if (clusterTx.length >= 3 && amountVariance > 0.1) return;

      let frequency: SubscriptionCandidate['frequency'] = 'Irregular';
      let confidence: SubscriptionCandidate['confidence'] = 'Low';

      // For single-item clusters of known subscriptions, assume Monthly
      // This supports single-PDF uploads where user has multiple family plans
      if (clusterTx.length === 1 && (isKnown || isVerifiedPrice)) {
        frequency = 'Monthly';
        confidence = 'High';
      } else if (clusterTx.length < 2) {
        // Unknown single items are rejected upstream, but double-check here
        return;
      } else {
        // Date Analysis for Cluster
        let totalIntervalDays = 0;
        let intervalsCount = 0;
        let previousDate = new Date(clusterTx[0].date);

        for (let i = 1; i < clusterTx.length; i++) {
          const currentDate = new Date(clusterTx[i].date);
          const diffTime = Math.abs(currentDate.getTime() - previousDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          totalIntervalDays += diffDays;
          intervalsCount++;
          previousDate = currentDate;
        }

        const averageInterval = totalIntervalDays / intervalsCount;
        // Interval Consistency
        const intervals: number[] = [];
        let tempPrev = new Date(clusterTx[0].date);
        for (let j = 1; j < clusterTx.length; j++) {
          const curr = new Date(clusterTx[j].date);
          const diff = Math.ceil(
            Math.abs(curr.getTime() - tempPrev.getTime()) / (1000 * 60 * 60 * 24)
          );
          intervals.push(diff);
          tempPrev = curr;
        }

        // For known subs, use median interval (more robust to outliers from old PDF data)
        const sortedIntervals = [...intervals].sort((a, b) => a - b);
        const medianInterval = sortedIntervals[Math.floor(sortedIntervals.length / 2)];

        // Use median for known subs, average for unknown
        const referenceInterval = isKnown ? medianInterval : averageInterval;

        // For known subs: allow intervals within 3x of median (handles skipped months)
        // For unknown: stricter 50% variance
        const toleranceMultiplier = isKnown ? 3.0 : 0.5;
        const isConsistent = intervals.every((d) =>
          isKnown
            ? d >= referenceInterval / toleranceMultiplier &&
              d <= referenceInterval * toleranceMultiplier
            : Math.abs(d - referenceInterval) < referenceInterval * toleranceMultiplier
        );

        if (!isConsistent && !isKnown) {
          // For unknown subs, strict rejection
          return;
        }

        // --- STRICT RULES FOR UNKNOWN SUBSCRIPTIONS ---
        if (!isKnown) {
          // Rule 1: For Monthly/Weekly, at least one interval must be "ideal" (consecutive months/weeks)
          const hasIdealMonthly = intervals.some((d) => d >= 25 && d <= 35);
          const hasIdealWeekly = intervals.some((d) => d >= 6 && d <= 8);

          // Classification - stricter for unknown
          if (hasIdealMonthly) {
            frequency = 'Monthly';
          } else if (hasIdealWeekly) {
            frequency = 'Weekly';
          } else if (medianInterval >= 360 && medianInterval <= 370) {
            // Rule 2: Yearly must actually span a year
            const totalSpan =
              (new Date(clusterTx[clusterTx.length - 1].date).getTime() -
                new Date(clusterTx[0].date).getTime()) /
              (1000 * 60 * 60 * 24);
            if (totalSpan > 300) {
              frequency = 'Yearly';
            }
          }

          // Rule 3: Always Low confidence if unknown
          confidence = 'Low';

          // If still Irregular, it was an outlier that didn't meet strict rules
          if (frequency === 'Irregular') return;
        } else {
          // --- NORMAL RULES FOR KNOWN SUBSCRIPTIONS ---
          if (medianInterval >= 25 && medianInterval <= 35) {
            frequency = 'Monthly';
            confidence = 'High';
          } else if (medianInterval >= 360 && medianInterval <= 370) {
            frequency = 'Yearly';
            confidence = 'High';
          } else if (medianInterval >= 6 && medianInterval <= 8) {
            frequency = 'Weekly';
            confidence = 'High';
          } else if (medianInterval >= 20 && medianInterval <= 70) {
            // Known subscriptions with irregular intervals - assume Monthly
            frequency = 'Monthly';
            confidence = 'Medium';
          }
        }

        // Override confidence if price is verified
        if (isVerifiedPrice) {
          confidence = 'High';
        }
      }

      if (frequency !== 'Irregular') {
        candidates.push({
          name,
          averageAmount,
          frequency,
          confidence,
        });
      }
    });
  });

  return candidates;
}
