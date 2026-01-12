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
  transactions: Transaction[]; // Source transactions for drill-down
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

function isRefund(t: Transaction): boolean {
  // Standard convention: charges are positive, refunds are negative.
  return t.amount < 0;
}

/**
 * Filters out balanced pairs of charges and refunds (Pair Cancellation).
 */
function filterRefundPairs(transactions: Transaction[]): Transaction[] {
  const result: Transaction[] = [...transactions];
  const toRemove = new Set<number>();

  for (let i = 0; i < result.length; i++) {
    if (toRemove.has(i)) continue;

    for (let j = i + 1; j < result.length; j++) {
      if (toRemove.has(j)) continue;

      // Check if they are exactly opposite and within 30 days
      if (Math.abs(result[i].amount + result[j].amount) < 0.01) {
        const dateI = new Date(result[i].date).getTime();
        const dateJ = new Date(result[j].date).getTime();
        const diffDays = Math.abs(dateI - dateJ) / (1000 * 60 * 60 * 24);

        if (diffDays <= 30) {
          toRemove.add(i);
          toRemove.add(j);
          break;
        }
      }
    }
  }

  return result.filter((_, index) => !toRemove.has(index));
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
    // 1.5 Refund/Pair Cancellation (Task-004)
    // Filter out pairs that exactly cancel each other out (Charge + Refund)
    const filteredTxs = filterRefundPairs(transactions);

    // If no transactions left after refund filtering, skip cluster
    if (filteredTxs.length === 0) return;

    // Filter out remaining individual refunds and ensure positive amounts
    const absoluteTxs = filteredTxs
      .filter(t => !isRefund(t))
      .map(t => ({ ...t, amount: Math.abs(t.amount) }));

    if (absoluteTxs.length === 0) return;

    // EXCEPTION: If it is a KNOWN subscription pattern, allow even 1 instance.
    const isKnown = matchSubscription(name);


    // Negative filter for keywords
    const BLACKLIST = [
      // Retail / Marketplaces (Frequent False Positives - NOT current sub vendors)
      'EBAY', 'ETSY', 'SHELL', 'EXXON', 'CHEVRON', '7-ELEVEN', '7 ELEVEN', '7ELEVEN',

      // Financial/Utilities
      'INTEREST', 'FEE', 'AUTOPAY', 'PAYMENT', 'TRANSFER', 'ATM', 'DEPOSIT', 'CREDIT CARD', 'BANK', 'LOAN', 'MORTGAGE', 'RENT', 'CITI FLEX',

      // Gas Stations & One-offs
      'CIRCLE K', 'CIRCLEK', 'MARATHON', 'BP ', 'TEXACO', 'VALERO', 'SPEEDWAY', 'QUIKTRIP', 'WAWA', 'SHEETZ', 'RACETRAC', 'CEFCO', 'MURPHY', 'TRACTOR SUPPLY',

      // General Retail / Dollar Stores
      'DOLLAR GENERAL', 'DOLLAR TREE', 'DOLLARTREE', 'FAMILY DOLLAR', 'FAMILYDOLLAR', 'WALMART SUPERCENTER', 'WM SUPERCENTER',
      'KROGER', 'SAFEWAY', 'PUBLIX', 'ALDI', 'HOME DEPOT', 'HOMEDEPOT', 'LOWES', 'MENARDS', 'CVS', 'WALGREENS', 'RITE AID', 'RITEAID',

      // Fast Food / Restaurants (Common False Positives - NOT delivery subs)
      'PIZZA', 'BURGER', 'MCDONALDS', "MCDONALD'S", 'DOMINO', 'STARBUCKS', 'CHICK-FIL-A', 'CHICK FIL A', 'CHICKFILA',
      'TACO BELL', 'TACOBELL', 'DUNKIN', 'WENDY', 'PANDA EXPRESS', 'PANDAEXPRESS', 'SONIC', 'ARBYS', 'POPEYES', 'CHIPOTLE',
      'PANERA', 'SUBWAY', 'FIVE GUYS', 'FIVEGUYS', 'BURGER KING', 'BURGERKING', 'PIZZA HUT', 'PIZZAHUT',
      'DAIRY QUEEN', 'DAIRYQUEEN', 'KRISPY KREME', 'KRISPYKREME', 'LITTLE CAES', 'LITTLE CAESARS', 'LITTLECEASARS', 'LITTLE CESARS',

      // Travel / One-off
      'PINK JEEP', 'PARKING', 'HOTEL', 'AIRBNB', 'VRBO',
      // Specific false positives from user data (2026-01-12)
      'SP ULC VH', 'THE DISTRICT', 'HUDSON', 'MARIPOSA', 'SARAZONA', 'G2G', 'BOLTON ', 'TST ',
      'WWMC', 'PENSAC', 'PENSACOLA', 'MEDICAL', 'CENTER', 'FT WALTON', 'DOCTOR', 'PA FT ',
    ];

    // STICKY BLACKLIST: These terms are ALWAYS rejected for unknown merchants.
    // We check both spaced and non-spaced versions for maximum hit rate on variations.
    const upperName = name.toUpperCase();
    const noSpaceName = upperName.replace(/\s+/g, '');

    if (!isKnown && BLACKLIST.some((b) => {
      const bUpper = b.toUpperCase();
      const bNoSpace = bUpper.replace(/\s+/g, '');
      return upperName.includes(bUpper) || noSpaceName.includes(bNoSpace);
    })) return;

    if (absoluteTxs.length < 2 && !isKnown) return;

    // Final check for very generic names
    if (name.length < 4 && !isKnown) return;

    // Sort by date
    absoluteTxs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // --- SUB-GROUPING LOGIC (Price Clustering) ---
    // If we have multiple different price points (e.g. Visible $25 and $35), strict variance check will fail.
    // We should try to cluster them.

    const clusters: Transaction[][] = [];
    const processed = new Set<number>();

    // Naive clustering: Group by exact amount (or very close)
    for (let i = 0; i < absoluteTxs.length; i++) {
      if (processed.has(i)) continue;

      const currentCluster = [absoluteTxs[i]];
      processed.add(i);
      const baseAmount = absoluteTxs[i].amount;

      for (let j = i + 1; j < absoluteTxs.length; j++) {
        if (processed.has(j)) continue;
        // Allow very small deviation ($0.50) for currency fluctuation, but generally distinct plans are fixed.
        if (Math.abs(absoluteTxs[j].amount - baseAmount) < 1.0) {
          currentCluster.push(absoluteTxs[j]);
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
      const allAmounts = absoluteTxs.map((t) => t.amount);
      const highestAmount = Math.max(...allAmounts);

      // Validate the highest price
      const priceCheck = validateHighRiskPrice(name, highestAmount);
      if (priceCheck !== 'REJECT') {
        candidates.push({
          name,
          averageAmount: highestAmount,
          frequency: 'Monthly',
          confidence: 'High',
          transactions: absoluteTxs, // All transactions for consolidated items
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

      // Initialize variables
      let frequency: SubscriptionCandidate['frequency'] = 'Irregular';
      let confidence: SubscriptionCandidate['confidence'] = 'Low';

      // --- 1. HANDLE SINGLE TRANSACTION CLUSTERS ---
      if (clusterTx.length === 1) {
        if (isKnown) {
          frequency = 'Yearly';
          confidence = 'Low'; // Definitely Low if only 1 transaction seen

          // Special hardening for Google One / Storage
          if (name.toUpperCase().includes('GOOGLE') && (name.toUpperCase().includes('STORAGE') || name.toUpperCase().includes('ONE'))) {
            confidence = 'Low';
          }
        } else {
          // Unknown single items are rejected
          return;
        }
      } else {
        // --- 2. ANALYZE INTERVALS FOR MULTIPLE TRANSACTIONS ---
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

        const sortedIntervals = [...intervals].sort((a, b) => a - b);
        const medianInterval = sortedIntervals[Math.floor(sortedIntervals.length / 2)];
        const referenceInterval = isKnown ? medianInterval : averageInterval;
        const toleranceMultiplier = isKnown ? 3.0 : 0.5;

        const isConsistent = intervals.every((d) =>
          isKnown
            ? d >= referenceInterval / toleranceMultiplier && d <= referenceInterval * toleranceMultiplier
            : Math.abs(d - referenceInterval) < referenceInterval * toleranceMultiplier
        );

        if (!isConsistent && !isKnown) return;

        // Gap checks
        const hasIdealMonthly = intervals.some((d) => d >= 25 && d <= 35);
        const hasIdealWeekly = intervals.some((d) => d >= 6 && d <= 8);

        if (!isKnown) {
          // Unknown subs must have ideal gaps for frequency detection
          if (hasIdealMonthly) frequency = 'Monthly';
          else if (hasIdealWeekly) frequency = 'Weekly';
          else if (medianInterval >= 360 && medianInterval <= 375) frequency = 'Yearly';
          confidence = 'Low';
        } else {
          // Known subs: use median interval for detection
          if (medianInterval >= 25 && medianInterval <= 35) {
            frequency = 'Monthly';
            confidence = 'High';
          } else if (medianInterval >= 360 && medianInterval <= 375) {
            frequency = 'Yearly';
            confidence = 'High';
          } else if (medianInterval >= 6 && medianInterval <= 8) {
            frequency = 'Weekly';
            confidence = 'High';
          } else if (medianInterval >= 20 && medianInterval <= 70) {
            frequency = 'Monthly';
            confidence = 'Medium';
          }

          // Strict rule: If "Monthly" but NO single ideal gap (e.g. 2 months apart only), reduce confidence
          if (frequency === 'Monthly' && !hasIdealMonthly) {
            confidence = 'Medium';
          }
        }
      }

      // Reject shopping combinations
      if (isShoppingPattern && !shouldConsolidate) return;

      // Price verification override
      const averageAmount = clusterTx.map(t => t.amount).reduce((a, b) => a + b, 0) / clusterTx.length;
      const priceCheck = validateHighRiskPrice(name, averageAmount);
      if (priceCheck === 'MATCH') confidence = 'High';

      // Promotion logic: 3+ consistent charges = Verified
      if (clusterTx.length >= 3 && confidence !== 'High') {
        // if frequency is detected (not Irregular), it's a strong recurring pattern
        if (frequency !== 'Irregular') {
          confidence = 'High';
        }
      }

      if (priceCheck === 'REJECT') return;

      // Final Candidate logic
      if (frequency !== 'Irregular') {
        candidates.push({
          name,
          averageAmount,
          frequency,
          confidence,
          transactions: clusterTx, // Store source transactions
        });
      }
    });
  });

  return candidates;
}
