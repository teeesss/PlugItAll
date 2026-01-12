import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { EnrichedSubscription } from './matcher';

export const generatePDF = (subscriptions: EnrichedSubscription[]) => {
    const doc = new jsPDF();
    const today = new Date().toLocaleDateString();

    // Header Title
    doc.setFontSize(22);
    doc.setTextColor(30, 41, 59); // Slate 800
    doc.text('Plug It - Subscription Report', 14, 20);

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
            4: { fontStyle: 'italic' }
        }
    });

    // Actionable Links Section
    // @ts-expect-error - jspdf-autotable adds lastAutoTable to doc object
    const finalY = (doc.lastAutoTable?.finalY || 80) + 15;

    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text('Cancellation Links', 14, finalY);

    let currentY = finalY + 8;
    const linkColor: [number, number, number] = [79, 70, 229]; // Indigo 600

    // Filter subs with links
    const actionableSubs = subscriptions.filter(s => s.cancelUrl);

    if (actionableSubs.length === 0) {
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text('No direct cancellation links found for these subscriptions.', 14, currentY);
    } else {
        doc.setFontSize(10);
        actionableSubs.forEach((sub) => {
            // Check for page overflow
            if (currentY > 280) {
                doc.addPage();
                currentY = 20;
            }

            const label = `• Cancel ${sub.displayName || sub.name}`;
            doc.setTextColor(...linkColor);
            doc.text(label, 14, currentY);

            // Add clickable link overlay
            doc.link(14, currentY - 3, 100, 5, { url: sub.cancelUrl || '' });

            currentY += 7;
        });
    }

    // Footer Disclaimer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text('Plug It - Privacy-First Subscription Manager', 105, 290, { align: 'center' });
    }

    doc.save('plug-it-report.pdf');
};
