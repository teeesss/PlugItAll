import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { EnrichedSubscription } from './matcher';

export const generatePDF = (subscriptions: EnrichedSubscription[]) => {
    // Generation triggered

    try {
        const doc = new jsPDF();
        const today = new Date().toLocaleDateString();

        // Header
        doc.setFontSize(22);
        doc.setTextColor(30, 41, 59);
        doc.text('Plug It All - Subscription Report', 14, 20);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated on ${today} | v1.1.0-debug`, 14, 28);

        // Stats boxes
        const monthlyTotal = subscriptions.reduce((sum, sub) => sum + sub.averageAmount, 0);
        const yearlyTotal = monthlyTotal * 12;

        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(14, 35, 180, 25, 2, 2, 'FD');

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text('Total Monthly Spend', 20, 45);
        doc.text('Potential Yearly Savings', 100, 45);

        doc.setFontSize(14);
        doc.setTextColor(30, 41, 59);
        doc.text(`$${monthlyTotal.toFixed(2)}`, 20, 53);
        doc.setTextColor(16, 185, 129);
        doc.text(`$${yearlyTotal.toFixed(2)}`, 100, 53);

        // Subscriptions Table
        const tableData = subscriptions.map((sub) => [
            sub.displayName || sub.name,
            `$${sub.averageAmount.toFixed(2)}`,
            sub.frequency,
            sub.confidence,
            sub.cancelUrl ? 'Available' : 'Check Site',
        ]);

        autoTable(doc, {
            startY: 70,
            head: [['Name', 'Amount', 'Frequency', 'Confidence', 'Cancel Link']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [79, 70, 229] },
            styles: { fontSize: 10, cellPadding: 3 },
            columnStyles: {
                0: { fontStyle: 'bold' },
                1: { halign: 'right' }
            }
        });

        // Add clickable links section
        // @ts-expect-error - jspdf-autotable adds lastAutoTable to doc object
        let currentY = (doc.lastAutoTable?.finalY || 80) + 15;

        doc.setFontSize(12);
        doc.setTextColor(30, 41, 59);
        doc.text('Cancellation Links', 14, currentY);
        currentY += 8;

        const actionableSubs = subscriptions.filter(s => s.cancelUrl);
        if (actionableSubs.length === 0) {
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text('No direct cancellation links available for these items.', 14, currentY);
        } else {
            doc.setFontSize(10);
            doc.setTextColor(79, 70, 229);
            actionableSubs.forEach((sub) => {
                if (currentY > 270) {
                    doc.addPage();
                    currentY = 20;
                }
                const label = `• Cancel ${sub.displayName || sub.name}`;
                doc.text(label, 14, currentY);
                doc.link(14, currentY - 4, 100, 6, { url: sub.cancelUrl || '' });
                currentY += 7;
            });
        }

        // Footer
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150);
            const footerText = 'Plug It All - Find the leaks in your bank account | v1.1.2-FINAL';
            doc.text(footerText, 105, 290, { align: 'center' });
        }

        doc.save('plug-it-all-report.pdf');
    } catch (err) {
        console.error('FAILED to generate PDF:', err);
    }
};
