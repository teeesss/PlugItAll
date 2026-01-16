import { describe, it, expect, vi } from 'vitest';
import { parsePDFBuffer } from '../src/utils/parser';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

// Mock pdfjs-dist
vi.mock('pdfjs-dist/legacy/build/pdf.mjs', () => ({
    GlobalWorkerOptions: { workerSrc: '' },
    getDocument: vi.fn()
}));

describe('PDF Parser Robustness', () => {
    it('should not crash when encountering items without transform property', async () => {
        const mockPdf = {
            numPages: 1,
            getPage: vi.fn().mockResolvedValue({
                getTextContent: vi.fn().mockResolvedValue({
                    items: [
                        { str: 'USAA FEDERAL SAVINGS BANK', transform: [1, 0, 0, 1, 0, 0] }, // Valid
                        { str: 'Marked Content' }, // Missing transform (TextMarkedContent)
                        { transform: [1, 0, 0, 1, 0, 10] } // Missing str
                    ]
                })
            })
        };

        (pdfjsLib.getDocument as any).mockReturnValue({
            promise: Promise.resolve(mockPdf)
        });

        const buffer = new ArrayBuffer(8);
        // Should not throw
        const results = await parsePDFBuffer(buffer);

        expect(mockPdf.getPage).toHaveBeenCalledWith(1);
        expect(results).toBeDefined();
    });

    it('should handle empty text content gracefully', async () => {
        const mockPdf = {
            numPages: 1,
            getPage: vi.fn().mockResolvedValue({
                getTextContent: vi.fn().mockResolvedValue({
                    items: []
                })
            })
        };

        (pdfjsLib.getDocument as any).mockReturnValue({
            promise: Promise.resolve(mockPdf)
        });

        const buffer = new ArrayBuffer(8);
        const results = await parsePDFBuffer(buffer);
        expect(results).toEqual([]);
    });
});
