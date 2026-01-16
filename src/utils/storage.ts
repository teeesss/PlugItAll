import type { SubscriptionCandidate } from './analyzer';

const STORAGE_KEY = 'plugitall_manual_subs';

/**
 * Loads manual subscriptions from LocalStorage.
 */
export function getManualSubscriptions(): SubscriptionCandidate[] {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        const parsed = stored ? JSON.parse(stored) : [];
        console.log('[DEBUG STORAGE] Loading:', parsed.length, 'subs');
        return parsed;
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
        console.log('[DEBUG STORAGE] Saving:', subs.length, 'subs');
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

/**
 * Exports manual subscriptions as a JSON string.
 * Returns object with metadata and subscriptions.
 */
export function exportManualSubscriptions(): string {
    const subs = getManualSubscriptions();
    const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        count: subs.length,
        subscriptions: subs
    };
    return JSON.stringify(exportData, null, 2);
}

/**
 * Imports manual subscriptions from JSON string.
 * Validates structure and merges with existing subs (no duplicates by ID).
 * Returns { success, imported, skipped, error }
 */
export function importManualSubscriptions(jsonString: string): {
    success: boolean;
    imported: number;
    skipped: number;
    error?: string;
} {
    try {
        const data = JSON.parse(jsonString);

        // Validate structure
        if (!data.subscriptions || !Array.isArray(data.subscriptions)) {
            return {
                success: false,
                imported: 0,
                skipped: 0,
                error: 'Invalid format: missing subscriptions array'
            };
        }

        // Validate each subscription has required fields
        const validSubs = data.subscriptions.filter((sub: unknown) => {
            const s = sub as SubscriptionCandidate;
            return s.id && s.name && typeof s.averageAmount === 'number';
        }) as SubscriptionCandidate[];

        if (validSubs.length === 0) {
            return {
                success: false,
                imported: 0,
                skipped: 0,
                error: 'No valid subscriptions found in import file'
            };
        }

        // Get current subscriptions
        const current = getManualSubscriptions();
        const currentIds = new Set(current.map(s => s.id));

        // Filter out duplicates
        const newSubs = validSubs.filter((sub) => !currentIds.has(sub.id));
        const skippedCount = validSubs.length - newSubs.length;

        // Merge and save
        const merged = [...current, ...newSubs.map((sub) => ({
            ...sub,
            isManual: true // Ensure manual flag is set
        }))];

        saveManualSubscriptions(merged);

        return {
            success: true,
            imported: newSubs.length,
            skipped: skippedCount
        };
    } catch (err) {
        return {
            success: false,
            imported: 0,
            skipped: 0,
            error: err instanceof Error ? err.message : 'Failed to parse JSON'
        };
    }
}

