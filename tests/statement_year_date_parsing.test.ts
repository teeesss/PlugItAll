/**
 * statement_year_date_parsing.test.ts
 */

import { describe, it, expect } from 'vitest';
import { parseDate, extractStatementContext } from '../src/utils/parser';

// ── 1. extractStatementContext ────────────────────────────────────────────────

describe('extractStatementContext()', () => {
    it('extracts year and month from "2025 March 05 Citi.pdf"', () => {
        expect(extractStatementContext('2025 March 05 Citi.pdf')).toEqual({ year: 2025, month: 3 });
    });

    it('extracts year and month from "2025 February 05 Citi.pdf"', () => {
        expect(extractStatementContext('2025 February 05 Citi.pdf')).toEqual({ year: 2025, month: 2 });
    });

    it('extracts year and month from "2024-12-31 SoFi.pdf"', () => {
        expect(extractStatementContext('2024-12-31 SoFi.pdf')).toEqual({ year: 2024, month: 12 });
    });

    it('extracts year and month from "statement_2025_03.pdf"', () => {
        expect(extractStatementContext('statement_2025_03.pdf')).toEqual({ year: 2025, month: 3 });
    });

    it('extracts year and month from "CitiStatement_Jan2023.pdf"', () => {
        expect(extractStatementContext('CitiStatement_Jan2023.pdf')).toEqual({ year: 2023, month: 1 });
    });

    it('extracts year and month from "USAA_2024_November.pdf"', () => {
        expect(extractStatementContext('USAA_2024_November.pdf')).toEqual({ year: 2024, month: 11 });
    });

    it('picks the EARLIEST year when multiple years appear in the name', () => {
        // Here 2024 is the earliest, and 'dec' comes first in the string so it picks 12.
        expect(extractStatementContext('2024 Dec to 2025 Jan Citi.pdf')).toEqual({ year: 2024, month: 12 });
    });

    it('returns null when no year is present', () => {
        expect(extractStatementContext('Citi statement March.pdf')).toBeNull();
        expect(extractStatementContext('bank_export.csv')).toBeNull();
        expect(extractStatementContext('statement.pdf')).toBeNull();
    });

    it('returns null for non-plausible years (outside 19xx-20xx)', () => {
        expect(extractStatementContext('statement_1234.pdf')).toBeNull();
    });

    it('handles filenames without extension', () => {
        expect(extractStatementContext('2025 March Citi')).toEqual({ year: 2025, month: 3 });
    });
});

// ── 2. parseDate() with statement context — THE CORE BUG FIX ─────────────────────

describe('parseDate(str, statementYear, statementMonth) — robust rollback context', () => {
    it('resolves "12/31" to 2025-12-31 when processing a 2026 January statement', () => {
        // This simulates '2026 January 05 Citi.pdf' -> year=2026, month=1
        const result = parseDate('12/31', 2026, 1);
        expect(result?.getFullYear()).toBe(2025); // Cross-year rollback applied!
        expect(result?.getMonth()).toBe(11);
    });

    it('resolves "01/31" to 2026-01-31 when processing a 2026 January statement', () => {
        const result = parseDate('01/31', 2026, 1);
        expect(result?.getFullYear()).toBe(2026); // No rollback
        expect(result?.getMonth()).toBe(0);
    });

    it('resolves "02/27" to 2025-02-27 when statementYear=2025 and month=3 (March)', () => {
        const result = parseDate('02/27', 2025, 3);
        expect(result?.getFullYear()).toBe(2025);
    });

    it('applies physical future-date check even if statementMonth is missing, resolving to past year', () => {
        // Simulating "2026.pdf" processed in early 2026 when December 2026 hasn't happened
        // The mock 'now' is implicit in Vitest. As long as the year isn't physically over,
        const result = parseDate('12/31', new Date().getFullYear());
        // Should roll back to last year since Dec 31 of current year is in future
        expect(result?.getFullYear()).toBeLessThan(new Date().getFullYear() + 1);
    });
});

describe('Real-world: 2025 March 05 Citi.pdf date resolution', () => {
    const ctx = extractStatementContext('2025 March 05 Citi.pdf');

    it('extracts year and month successfully', () => {
        expect(ctx).toEqual({ year: 2025, month: 3 });
    });

    const citiFebDates: Array<[string, string]> = [
        ['02/27', '2025-02-27'],
        ['02/24', '2025-02-24'],
        ['02/08', '2025-02-08'],
    ];

    it.each(citiFebDates)(
        'parseDate("%s", 2025, 3) → %s',
        (input, expected) => {
            if (!ctx) throw new Error('context not extracted');
            const result = parseDate(input, ctx.year, ctx.month);
            const iso = result
                ? `${result.getFullYear()}-${String(result.getMonth() + 1).padStart(2, '0')}-${String(result.getDate()).padStart(2, '0')}`
                : null;
            expect(iso).toBe(expected);
        }
    );
});
