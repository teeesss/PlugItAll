// URL Parameter Management for Insights Filters
// Allows sharing filter states via URL

export interface FilterState {
    type: 'all' | 'purchases' | 'credits';
    dateRange: string; // Can be preset or custom range
    sortBy: 'largest' | 'smallest' | 'most-frequent' | 'alphabetical';
    merchantSearch: string;
    customStartDate?: string;
    customEndDate?: string;
}

export interface SavedFilterSet {
    name: string;
    filters: FilterState;
    createdAt: string;
}

const STORAGE_KEY_SAVED_FILTERS = 'plugit_saved_filters';
const STORAGE_KEY_FILTER_HISTORY = 'plugit_filter_history';
const MAX_HISTORY_ITEMS = 5;

// Encode filter state to URL params
export function encodeFiltersToURL(filters: FilterState): string {
    const params = new URLSearchParams();

    if (filters.type !== 'all') params.set('type', filters.type);
    if (filters.dateRange !== 'all') params.set('range', filters.dateRange);
    if (filters.sortBy !== 'largest') params.set('sort', filters.sortBy);
    if (filters.merchantSearch) params.set('search', filters.merchantSearch);
    if (filters.customStartDate) params.set('start', filters.customStartDate);
    if (filters.customEndDate) params.set('end', filters.customEndDate);

    return params.toString();
}

// Decode URL params to filter state
export function decodeFiltersFromURL(searchParams: URLSearchParams): Partial<FilterState> {
    const filters: Partial<FilterState> = {};

    const type = searchParams.get('type');
    if (type === 'purchases' || type === 'credits') filters.type = type;

    const range = searchParams.get('range');
    if (range) filters.dateRange = range;

    const sort = searchParams.get('sort');
    if (sort === 'smallest' || sort === 'most-frequent' || sort === 'alphabetical') {
        filters.sortBy = sort;
    }

    const search = searchParams.get('search');
    if (search) filters.merchantSearch = search;

    const start = searchParams.get('start');
    if (start) filters.customStartDate = start;

    const end = searchParams.get('end');
    if (end) filters.customEndDate = end;

    return filters;
}

// Update browser URL without reload
export function updateURLWithFilters(filters: FilterState) {
    const params = encodeFiltersToURL(filters);
    const newURL = params ? `${window.location.pathname}?${params}` : window.location.pathname;
    window.history.replaceState({}, '', newURL);
}

// Saved Filter Sets Management
export function saveFilterSet(name: string, filters: FilterState): void {
    const saved = getSavedFilterSets();
    const newSet: SavedFilterSet = {
        name,
        filters,
        createdAt: new Date().toISOString(),
    };

    // Check if name exists, replace if so
    const existing = saved.findIndex(s => s.name === name);
    if (existing >= 0) {
        saved[existing] = newSet;
    } else {
        saved.push(newSet);
    }

    localStorage.setItem(STORAGE_KEY_SAVED_FILTERS, JSON.stringify(saved));
}

export function getSavedFilterSets(): SavedFilterSet[] {
    const stored = localStorage.getItem(STORAGE_KEY_SAVED_FILTERS);
    return stored ? JSON.parse(stored) : [];
}

export function deleteSavedFilterSet(name: string): void {
    const saved = getSavedFilterSets();
    const filtered = saved.filter(s => s.name !== name);
    localStorage.setItem(STORAGE_KEY_SAVED_FILTERS, JSON.stringify(filtered));
}

// Filter History Management
export function addToFilterHistory(filters: FilterState): void {
    const history = getFilterHistory();

    // Don't add if it's the same as the most recent
    if (history.length > 0 && JSON.stringify(history[0].filters) === JSON.stringify(filters)) {
        return;
    }

    history.unshift({
        name: generateHistoryName(filters),
        filters,
        createdAt: new Date().toISOString(),
    });

    // Keep only MAX_HISTORY_ITEMS
    const trimmed = history.slice(0, MAX_HISTORY_ITEMS);
    localStorage.setItem(STORAGE_KEY_FILTER_HISTORY, JSON.stringify(trimmed));
}

export function getFilterHistory(): SavedFilterSet[] {
    const stored = localStorage.getItem(STORAGE_KEY_FILTER_HISTORY);
    return stored ? JSON.parse(stored) : [];
}

export function clearFilterHistory(): void {
    localStorage.removeItem(STORAGE_KEY_FILTER_HISTORY);
}

// Generate a descriptive name for filter history
function generateHistoryName(filters: FilterState): string {
    const parts: string[] = [];

    if (filters.type !== 'all') parts.push(filters.type);
    if (filters.dateRange !== 'all') parts.push(filters.dateRange);
    if (filters.sortBy !== 'largest') parts.push(`by ${filters.sortBy}`);
    if (filters.merchantSearch) parts.push(`"${filters.merchantSearch}"`);

    return parts.length > 0 ? parts.join(' • ') : 'All data';
}

// Date Preset Calculations
export function calculateDatePreset(preset: string): { start: Date; end: Date } | null {
    const now = new Date();
    const start = new Date();
    const end = new Date();

    switch (preset) {
        case 'last-month':
            start.setMonth(now.getMonth() - 1, 1);
            start.setHours(0, 0, 0, 0);
            end.setMonth(now.getMonth(), 0); // Last day of previous month
            end.setHours(23, 59, 59, 999);
            break;

        case 'this-quarter': {
            const currentQuarter = Math.floor(now.getMonth() / 3);
            start.setMonth(currentQuarter * 3, 1);
            start.setHours(0, 0, 0, 0);
            end.setTime(now.getTime());
            break;
        }

        case 'last-quarter': {
            const lastQuarter = Math.floor(now.getMonth() / 3) - 1;
            start.setMonth(lastQuarter * 3, 1);
            start.setHours(0, 0, 0, 0);
            end.setMonth((lastQuarter + 1) * 3, 0);
            end.setHours(23, 59, 59, 999);
            break;
        }

        case 'this-year':
            start.setMonth(0, 1);
            start.setHours(0, 0, 0, 0);
            end.setTime(now.getTime());
            break;

        case 'last-90-days':
            start.setDate(now.getDate() - 90);
            start.setHours(0, 0, 0, 0);
            end.setTime(now.getTime());
            break;

        default:
            return null;
    }

    return { start, end };
}

// Check if filters are default (all cleared)
export function areFiltersDefault(filters: FilterState): boolean {
    return (
        filters.type === 'all' &&
        filters.dateRange === 'all' &&
        filters.sortBy === 'largest' &&
        filters.merchantSearch === '' &&
        !filters.customStartDate &&
        !filters.customEndDate
    );
}

// Get default filter state
export function getDefaultFilterState(): FilterState {
    return {
        type: 'all',
        dateRange: 'all',
        sortBy: 'largest',
        merchantSearch: '',
    };
}
