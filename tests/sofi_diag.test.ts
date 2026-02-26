/**
 * SoFi PDF Full Leak Check - runs against all 72 SoFi PDFs
 * Verifies that balance sweeps, rewards redemptions, and zero amounts are all filtered
 */
import { describe, test, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { parsePDFBuffer } from '../src/utils/parser';

const sofiDir = path.resolve(__dirname, '../pdfs/SOFI');
const outFile = path.resolve(__dirname, '../tmp/sofi_leak_check.txt');

describe('SoFi PDF Full Leak Check', () => {
    test('zero balance sweeps and reward redemptions across all SoFi PDFs', async () => {
        if (!fs.existsSync(sofiDir)) {
            console.warn('SoFi dir not found, skipping');
            return;
        }

        const files = fs.readdirSync(sofiDir).filter(f => f.endsWith('.pdf'));
        const lines: string[] = [`Checking ${files.length} SoFi PDFs...\n`];

        let totalTx = 0;
        let balanceSweepleaks = 0;
        let rewardRedemptionLeaks = 0;
        let zeroAmountLeaks = 0;

        for (const file of files) {
            const buf = fs.readFileSync(path.join(sofiDir, file));
            const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
            const txs = await parsePDFBuffer(ab.slice(0) as ArrayBuffer);
            totalTx += txs.length;

            for (const tx of txs) {
                const d = tx.description.toLowerCase();
                if (d.includes('moved balances') || d.includes('participating banks')) {
                    balanceSweepleaks++;
                    lines.push(`BALANCE_SWEEP [${tx.date}] $${tx.amount} | "${tx.description.substring(0, 80)}" | ${file}`);
                }
                if (d.includes('sofi rewards redemption')) {
                    rewardRedemptionLeaks++;
                    lines.push(`REWARD_REDEMPTION [${tx.date}] $${tx.amount} | "${tx.description.substring(0, 80)}" | ${file}`);
                }
                if (Math.abs(tx.amount) < 0.01) {
                    zeroAmountLeaks++;
                    lines.push(`ZERO_AMOUNT [${tx.date}] $${tx.amount} | "${tx.description.substring(0, 80)}" | ${file}`);
                }
            }
        }

        lines.push(`\n=== SUMMARY ===`);
        lines.push(`Total tx: ${totalTx}`);
        lines.push(`Balance sweep leaks: ${balanceSweepleaks}`);
        lines.push(`Reward redemption leaks: ${rewardRedemptionLeaks}`);
        lines.push(`Zero amount leaks: ${zeroAmountLeaks}`);

        fs.writeFileSync(outFile, lines.join('\n'), 'utf8');

        // Assertions
        expect(balanceSweepleaks, 'Balance sweeps should be filtered').toBe(0);
        expect(rewardRedemptionLeaks, 'Reward redemptions should be filtered').toBe(0);
        expect(zeroAmountLeaks, 'Zero amount transactions should be filtered').toBe(0);
        expect(totalTx, 'Should parse at least 100 actual SoFi transactions').toBeGreaterThan(100);
    }, 300000);
});
