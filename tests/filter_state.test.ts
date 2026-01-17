import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
    encodeFiltersToURL,
    decodeFiltersFromURL,
    saveFilterSet,
    getSavedFilterSets,
    deleteSavedFilterSet,
    addToFilterHistory,
    getFilterHistory,
    clearFilterHistory,
    calculateDatePreset,
    areFiltersDefault,
    getDefaultFilterState,
    type FilterState,
} from '../src/utils/filterState';

describe('Filter State Utilities (TASK-086)', () => {
    // Clear localStorage before each test
    beforeEach(() => {
        localStorage.clear();
    });

    afterEach(() => {
        localStorage.clear();
    });

    describe('URL Encoding/Decoding', () => {
        it('encodes filters to URL params', () => {
            const filters: FilterState = {
                type: 'purchases',
                dateRange: '30days',
                sortBy: 'largest',
                merchantSearch: 'amazon',
            };

            const encoded = encodeFiltersToURL(filters);
            expect(encoded).toContain('type=purchases');
            expect(encoded).toContain('range=30days');
            expect(encoded).toContain('search=amazon');
        });

        it('does not encode default values', () => {
            const filters: FilterState = {
                type: 'all',
                dateRange: 'all',
                sortBy: 'largest',
                merchantSearch: '',
            };

            const encoded = encodeFiltersToURL(filters);
            expect(encoded).toBe('');
        });

        it('decodes URL params to filters', () => {
            const params = new URLSearchParams('type=credits&range=3months&sort=smallest&search=netflix');
            const filters = decodeFiltersFromURL(params);

            expect(filters.type).toBe('credits');
            expect(filters.dateRange).toBe('3months');
            expect(filters.sortBy).toBe('smallest');
            expect(filters.merchantSearch).toBe('netflix');
        });

        it('handles custom date range in URL', () => {
            const filters: FilterState = {
                type: 'all',
                dateRange: 'custom',
                sortBy: 'largest',
                merchantSearch: '',
                customStartDate: '2024-01-01',
                customEndDate: '2024-12-31',
            };

            const encoded = encodeFiltersToURL(filters);
            expect(encoded).toContain('start=2024-01-01');
            expect(encoded).toContain('end=2024-12-31');

            const params = new URLSearchParams(encoded);
            const decoded = decodeFiltersFromURL(params);
            expect(decoded.customStartDate).toBe('2024-01-01');
            expect(decoded.customEndDate).toBe('2024-12-31');
        });
    });

    describe('Saved Filter Sets', () => {
        it('saves and retrieves filter sets', () => {
            const filters: FilterState = {
                type: 'purchases',
                dateRange: '30days',
                sortBy: 'largest',
                merchantSearch: '',
            };

            saveFilterSet('Monthly Review', filters);

            const saved = getSavedFilterSets();
            expect(saved).toHaveLength(1);
            expect(saved[0].name).toBe('Monthly Review');
            expect(saved[0].filters.type).toBe('purchases');
        });

        it('replaces existing filter set with same name', () => {
            const filters1: FilterState = getDefaultFilterState();
            const filters2: FilterState = { ...getDefaultFilterState(), type: 'credits' };

            saveFilterSet('Test', filters1);
            saveFilterSet('Test', filters2);

            const saved = getSavedFilterSets();
            expect(saved).toHaveLength(1);
            expect(saved[0].filters.type).toBe('credits');
        });

        it('deletes filter sets', () => {
            const filters: FilterState = getDefaultFilterState();
            saveFilterSet('Set1', filters);
            saveFilterSet('Set2', filters);

            let saved = getSavedFilterSets();
            expect(saved).toHaveLength(2);

            deleteSavedFilterSet('Set1');

            saved = getSavedFilterSets();
            expect(saved).toHaveLength(1);
            expect(saved[0].name).toBe('Set2');
        });
    });

    describe('Filter History', () => {
        it('adds filter states to history', () => {
            const filters: FilterState = {
                type: 'purchases',
                dateRange: '30days',
                sortBy: 'largest',
                merchantSearch: 'amazon',
            };

            addToFilterHistory(filters);

            const history = getFilterHistory();
            expect(history).toHaveLength(1);
            expect(history[0].filters.type).toBe('purchases');
        });

        it('does not add duplicate consecutive entries', () => {
            const filters: FilterState = getDefaultFilterState();

            addToFilterHistory(filters);
            addToFilterHistory(filters);

            const history = getFilterHistory();
            expect(history).toHaveLength(1);
        });

        it('limits history to 5 items', () => {
            for (let i = 0; i < 10; i++) {
                const filters: FilterState = {
                    ...getDefaultFilterState(),
                    merchantSearch: `search${i}`,
                };
                addToFilterHistory(filters);
            }

            const history = getFilterHistory();
            expect(history).toHaveLength(5);
            expect(history[0].filters.merchantSearch).toBe('search9'); // Most recent
        });

        it('clears history', () => {
            addToFilterHistory(getDefaultFilterState());
            clearFilterHistory();

            const history = getFilterHistory();
            expect(history).toHaveLength(0);
        });
    });

    describe('Date Preset Calculations', () => {
        it('calculates last month correctly', () => {
            const result = calculateDatePreset('last-month');
            expect(result).toBeTruthy();
            if (result) {
                expect(result.start.getMonth()).toBeLessThan(new Date().getMonth());
                expect(result.end.getMonth()).toBeLessThan(new Date().getMonth());
            }
        });

        it('calculates this quarter correctly', () => {
            const result = calculateDatePreset('this-quarter');
            expect(result).toBeTruthy();
            if (result) {
                const now = new Date();
                expect(result.start.getTime()).toBeLessThanOrEqual(now.getTime());
                expect(result.end.getTime()).toBeGreaterThanOrEqual(result.start.getTime());
            }
        });

        it('calculates last 90 days correctly', () => {
            const result = calculateDatePreset('last-90-days');
            expect(result).toBeTruthy();
            if (result) {
                const daysDiff = Math.floor((result.end.getTime() - result.start.getTime()) / (1000 * 60 * 60 * 24));
                expect(daysDiff).toBeGreaterThanOrEqual(89); // Account for rounding
                expect(daysDiff).toBeLessThanOrEqual(90);
            }
        });

        it('returns null for unknown preset', () => {
            const result = calculateDatePreset('invalid-preset');
            expect(result).toBeNull();
        });
    });

    describe('Filter State Helpers', () => {
        it('correctly identifies default filters', () => {
            const defaultFilters = getDefaultFilterState();
            expect(areFiltersDefault(defaultFilters)).toBe(true);
        });

        it('correctly identifies non-default filters', () => {
            const filters: FilterState = {
                ...getDefaultFilterState(),
                type: 'purchases',
            };
            expect(areFiltersDefault(filters)).toBe(false);
        });

        it('returns correct default state', () => {
            const defaults = getDefaultFilterState();
            expect(defaults.type).toBe('all');
            expect(defaults.dateRange).toBe('all');
            expect(defaults.sortBy).toBe('largest');
            expect(defaults.merchantSearch).toBe('');
        });
    });
});
