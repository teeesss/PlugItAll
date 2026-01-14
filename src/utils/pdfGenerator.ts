import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { EnrichedSubscription } from './matcher';

export const generatePDF = (subscriptions: EnrichedSubscription[]) => {
    const doc = new jsPDF();
    const today = new Date().toLocaleDateString();

    // Header Title
    doc.setFontSize(22);
    doc.setTextColor(30, 41, 59); // Slate 800
    doc.text('Plug It All - Subscription Report', 14, 20);

    // Date
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on ${today}`, 14, 28);

    // Summary Box (Simple visual representation)
    const monthlyTotal = subscriptions.reduce((sum, sub) => sum + sub.averageAmount, 0);
    const yearlyTotal = monthlyTotal * 12;

    // Draw a light background for stats
    doc.setFillColor(248, 250, 252); // Slate 50
    doc.setDrawColor(226, 232, 240); // Slate 200
    doc.roundedRect(14, 35, 180, 25, 2, 2, 'FD');

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('Total Monthly Spend', 20, 45);
    doc.text('Potential Yearly Savings', 100, 45);

    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59); // Slate 800
    doc.text(`$${monthlyTotal.toFixed(2)}`, 20, 53);
    doc.setTextColor(16, 185, 129); // Emerald 500
    doc.text(`$${yearlyTotal.toFixed(2)}`, 100, 53);

    // Main Table
    const tableData = subscriptions.map((sub) => [
        sub.displayName || sub.name,
        `$${sub.averageAmount.toFixed(2)}`,
        sub.frequency,
        sub.confidence,
        sub.cancelUrl ? 'Available' : 'Manual Search',
    ]);

    autoTable(doc, {
        startY: 70,
        head: [['Name', 'Amount', 'Frequency', 'Confidence', 'Cancel Link']],
        body: tableData,
        theme: 'striped',
        headStyles: {
            fillColor: [79, 70, 229], // Indigo 600
            textColor: 255,
            fontStyle: 'bold'
        },
        styles: {
            fontSize: 10,
            cellPadding: 4,
            textColor: [51, 65, 85] // Slate 700
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252] // Slate 50
        },
        columnStyles: {
            0: { fontStyle: 'bold' },
            1: { halign: 'right' },
            4: {
                fontStyle: 'bold',
                textColor: [79, 70, 229] // Indigo 600 for links
            }
        },
        didDrawCell: (data) => {
            if (data.section === 'body' && data.column.index === 4) {
                const sub = subscriptions[data.row.index];
                if (sub && sub.cancelUrl) {
                    doc.link(
                        data.cell.x,
                        data.cell.y,
                        data.cell.width,
                        data.cell.height,
                        { url: sub.cancelUrl }
                    );
                }
            }
        }
    });

    // Footer Disclaimer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text('Plug It All - Privacy-First Subscription Manager', 105, 290, { align: 'center' });
    }

    doc.save('plug-it-all-report.pdf');
};
