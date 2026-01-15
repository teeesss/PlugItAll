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

    // Split into Verified (High/Medium) and Unverified (Low)
    const verifiedSubs = subscriptions.filter(s => s.confidence === 'High' || s.confidence === 'Medium');
    const unverifiedSubs = subscriptions.filter(s => s.confidence === 'Low');

    // Helper to render table with correct context
    const renderTable = (title: string, subs: EnrichedSubscription[], startY: number) => {
        if (subs.length === 0) return startY;

        doc.setFontSize(14);
        doc.setTextColor(30, 41, 59);
        doc.text(title, 14, startY);

        const tableData = subs.map((sub) => [
            sub.displayName || sub.name,
            `$${sub.averageAmount.toFixed(2)}`,
            sub.frequency,
            sub.confidence,
            sub.cancelUrl ? `Cancel ${sub.displayName || sub.name}`.substring(0, 35) : 'Manual Search', // Truncate to avoid massive overflow
        ]);

        autoTable(doc, {
            startY: startY + 5,
            head: [['Name', 'Amount', 'Frequency', 'Confidence', 'Cancel Link']],
            body: tableData,
            theme: 'striped',
            headStyles: {
                fillColor: title.includes('Verified') ? [79, 70, 229] : [234, 179, 8], // Indigo for verified, Yellow-600 for unverified
                textColor: 255,
                fontStyle: 'bold'
            },
            styles: {
                fontSize: 10,
                cellPadding: 3,
                textColor: [51, 65, 85]
            },
            columnStyles: {
                0: { fontStyle: 'bold', cellWidth: 50 },
                1: { halign: 'right' },
                4: {
                    fontStyle: 'bold',
                    textColor: [79, 70, 229]
                }
            },
            didDrawCell: (data) => {
                if (data.section === 'body' && data.column.index === 4) {
                    const sub = subs[data.row.index]; // Access from the passed subset
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

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (doc as any).lastAutoTable.finalY + 15;
    }

    let currentY = 70;
    currentY = renderTable('Verified Subscriptions', verifiedSubs, currentY);
    currentY = renderTable('Unverified / One-Time Matches', unverifiedSubs, currentY);

    // Confidence Legend
    const legendY = currentY + 10;

    // Check if new page needed
    if (legendY > 250) {
        doc.addPage();
        currentY = 20;
    }

    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text('Confidence Guide', 14, currentY);

    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    const legendData = [
        { label: 'High/Medium Confidence', desc: 'Verified: Highly probable subscription that exists.' },
        { label: 'Low Confidence', desc: 'Unverified: Could be a one-time purchase, unknown service, or low likelihood of being a subscription.' }
    ];

    let legY = currentY + 7;
    legendData.forEach(item => {
        doc.setFont('helvetica', 'bold');
        doc.text(item.label, 14, legY);
        doc.setFont('helvetica', 'normal');
        doc.text(`- ${item.desc}`, 55, legY); // Adjusted X offset for longer label
        legY += 5;
    });

    // Footer Disclaimer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text('Plug It All - Privacy-First Subscription Manager', 105, 290, { align: 'center' });
    }

    // Explicit blob download for better browser compatibility
    const pdfBlob = doc.output('blob');
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'plug-it-all-report.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
