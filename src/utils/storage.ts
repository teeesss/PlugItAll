import type { SubscriptionCandidate } from './analyzer';

const STORAGE_KEY = 'plugitall_manual_subs';

/**
 * Loads manual subscriptions from LocalStorage.
 */
export function getManualSubscriptions(): SubscriptionCandidate[] {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (err) {
        console.error('Failed to load manual subscriptions:', err);
        return [];
    }
}

/**
 * Saves a list of manual subscriptions to LocalStorage.
 */
export function saveManualSubscriptions(subs: SubscriptionCandidate[]): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(subs));
    } catch (err) {
        console.error('Failed to save manual subscriptions:', err);
    }
}

/**
 * Adds a single manual subscription.
 */
export function addManualSubscription(sub: SubscriptionCandidate): void {
    const current = getManualSubscriptions();
    // Prevent duplicate IDs
    const filtered = current.filter(s => s.id !== sub.id);
    saveManualSubscriptions([...filtered, { ...sub, isManual: true }]);
}

/**
 * Removes a manual subscription by ID.
 */
export function deleteManualSubscription(id: string): void {
    const current = getManualSubscriptions();
    saveManualSubscriptions(current.filter(s => s.id !== id));
}
