import type { Transaction } from './analyzer';

/**
 * Detects if a transaction is likely a transfer, payment, or account movement
 * (not a real purchase or income)
 */
export function isTransferOrPayment(transaction: Transaction): boolean {
    const desc = transaction.description.toUpperCase();
    const isExplicitReal = desc.includes('PURCHASE') || desc.includes('INCOME') || desc.includes('EXPENSE') || desc.includes('SALARY') || desc.includes('PAYROLL') || desc.includes('STORE');
    if (isExplicitReal) return false;

    // Common transfer/payment keywords
    const transferKeywords = [
        'ACH',
        'TRANSFER',
        'PAYMENT',
        'WITHDRAW',
        'DEPOSIT TO',
        'ELECTRONIC PAYMENT',
        'ONLINE PAYMENT',
        'CREDIT CARD PAYMENT',
        'AUTOPAY',
        'ZELLE',
        'VENMO',
        'PAYPAL TRANSFER',
        'CASH APP',
        'WIRE',
        'P2P',
        'DEBIT CARD PURCHASE REFUND',
        'RETURNED ACH',
        'CHECK',
        'ATM WITHDRAWAL',
        'MOBILE DEPOSIT',
        'DIRECT DEP', // Direct deposit is income, keep it
    ];

    // Check if description contains transfer keywords
    const hasTransferKeyword = transferKeywords.some(keyword => {
        // Special case: Direct deposit is REAL income, don't filter
        if (keyword === 'DIRECT DEP' && transaction.amount > 0) {
            return false;
        }
        return desc.includes(keyword);
    });

    if (hasTransferKeyword) return true;

    // Heuristic: Very large round numbers are often transfers
    // (e.g., $1000.00, $5000.00, not $1234.56)
    const amount = Math.abs(transaction.amount);
    if (amount >= 500 && amount % 500 === 0) {
        // Exclude likely income even if perfectly round
        const isIncomeKeyword = desc.includes('SALARY') || desc.includes('PAYROLL') || desc.includes('DIRECT DEP');
        if (isIncomeKeyword && transaction.amount > 0) return false;

        // Only flag if it's > $2000 and perfectly round
        if (amount >= 2000 && amount % 1000 === 0) {
            return true;
        }
    }

    return false;
}

/**
 * Filters transactions to only include real purchases and income
 * (excludes transfers, payments, and account movements)
 */
export function filterRealTransactions(transactions: Transaction[]): Transaction[] {
    return transactions.filter(t => !isTransferOrPayment(t));
}

/**
 * Separates transactions into purchases and true income
 */
export function categorizeTransactions(transactions: Transaction[]) {
    const real = filterRealTransactions(transactions);

    return {
        purchases: real.filter(t => t.amount < 0),
        income: real.filter(t => t.amount > 0),
        filtered: transactions.length - real.length, // How many we filtered out
    };
}
