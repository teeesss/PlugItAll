import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { EnrichedSubscription } from './matcher';

export const generatePDF = (subscriptions: EnrichedSubscription[]) => {
    // Generation triggered

    try {
        const doc = new jsPDF();

        // Header
        doc.setFontSize(22);
        doc.setTextColor(30, 41, 59);
        doc.text('Plug It All - Subscription Report', 14, 20);

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

        // SPLIT DATA: Verified (High/Medium) vs Review (Low)
        const verifiedSubs = subscriptions.filter(s => s.confidence !== 'Low');
        const reviewSubs = subscriptions.filter(s => s.confidence === 'Low');

        // Helper to generate table data with link placeholder
        const generateTableData = (subs: EnrichedSubscription[]) => subs.map((sub) => [
            sub.displayName || sub.name,
            `$${sub.averageAmount.toFixed(2)}`,
            sub.frequency,
            sub.confidence,
            sub.cancelUrl ? `Cancel ${sub.displayName || sub.name}` : 'No direct link',
        ]);

        let finalY = 80;

        // TABLE 1: VERIFIED SUBSCRIPTIONS
        if (verifiedSubs.length > 0) {
            doc.setFontSize(14);
            doc.setTextColor(30, 41, 59);
            doc.text('Verified Subscriptions', 14, finalY - 5);

            autoTable(doc, {
                startY: finalY,
                head: [['Name', 'Amount', 'Frequency', 'Confidence', 'Action']],
                body: generateTableData(verifiedSubs),
                theme: 'striped',
                headStyles: { fillColor: [16, 185, 129] }, // Green for Verified
                styles: { fontSize: 10, cellPadding: 3 },
                columnStyles: {
                    0: { fontStyle: 'bold' },
                    1: { halign: 'right' },
                    4: { textColor: [79, 70, 229] } // Blue text for links
                },
                didDrawCell: (data) => {
                    // Add link to the "Action" column (index 4) if a URL exists
                    if (data.section === 'body' && data.column.index === 4) {
                        const sub = verifiedSubs[data.row.index];
                        if (sub?.cancelUrl) {
                            doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, {
                                url: sub.cancelUrl
                            });
                        }
                    }
                }
            });

            // @ts-expect-error - jspdf-autotable adds lastAutoTable
            finalY = doc.lastAutoTable.finalY + 20;
        }

        // TABLE 2: REVIEW NEEDED
        if (reviewSubs.length > 0) {
            // Check if we need a new page
            if (finalY > 250) {
                doc.addPage();
                finalY = 20;
            }

            doc.setFontSize(14);
            doc.setTextColor(30, 41, 59);
            doc.text('Review Needed (Low Confidence)', 14, finalY - 5);

            autoTable(doc, {
                startY: finalY,
                head: [['Name', 'Amount', 'Frequency', 'Confidence', 'Action']],
                body: generateTableData(reviewSubs),
                theme: 'striped',
                headStyles: { fillColor: [245, 158, 11] }, // Orange/Amber for Review
                styles: { fontSize: 10, cellPadding: 3 },
                columnStyles: {
                    0: { fontStyle: 'bold' },
                    1: { halign: 'right' },
                    4: { textColor: [79, 70, 229] }
                },
                didDrawCell: (data) => {
                    if (data.section === 'body' && data.column.index === 4) {
                        const sub = reviewSubs[data.row.index];
                        if (sub?.cancelUrl) {
                            doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, {
                                url: sub.cancelUrl
                            });
                        }
                    }
                }
            });

            // @ts-expect-error - jspdf-autotable adds lastAutoTable
            finalY = doc.lastAutoTable.finalY + 10;
        }

        // LEGEND / FOOTER NOTE
        if (finalY > 260) {
            doc.addPage();
            finalY = 20;
        }

        doc.setFontSize(10);
        doc.setTextColor(100);
        const legend = [
            'Confidence Levels:',
            '• High/Medium: Recurring patterns detected or matched known services. Highly likely a valid subscription.',
            '• Low: Subscription detected but irregular intervals or unknown merchant. Please review manually.'
        ];
        doc.text(legend, 14, finalY);

        // Footer
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150);
            const footerText = 'Plug It All - Find the leaks in your bank account | v1.1.2-FINAL';
            doc.text(footerText, 105, 290, { align: 'center' });
        }

        // CRITICAL: DO NOT CHANGE THIS DOWNLOAD METHOD.
        // Previous attempts using URL.createObjectURL(blob) caused persistent
        // filename hashing bugs (GUIDs) and security blocks on production.
        // doc.save() is the only reliable, cross-browser method for this implementation.
        doc.save('plug-it-all-report.pdf');
    } catch (err) {
        console.error('FAILED to generate PDF:', err);
    }
};
