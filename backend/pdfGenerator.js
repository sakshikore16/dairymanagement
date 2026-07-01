import PDFDocument from 'pdfkit';

// Helper to draw horizontal lines
function drawDivider(doc, y) {
  doc.strokeColor('#cccccc')
     .lineWidth(1)
     .moveTo(50, y)
     .lineTo(562, y)
     .stroke();
}

// Helper to format currency
function formatCurrency(amount) {
  return `Rs. ${parseFloat(amount).toFixed(2)}`;
}

// Helper to format dates
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * Generate PDF Invoice for a Transaction
 */
export function generateInvoicePDF(transaction, settings, res) {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  // Stream PDF directly to Express response
  doc.pipe(res);

  // Business Header
  doc.fillColor('#1e40af').fontSize(24).text(settings.businessName || "MILK DISTRIBUTION", 50, 50, { align: 'left' });
  doc.fillColor('#475569').fontSize(10);
  if (settings.ownerName) doc.text(`Owner: ${settings.ownerName}`, 50, 80);
  if (settings.phoneNumber) doc.text(`Phone: ${settings.phoneNumber}`, 50, 95);
  if (settings.businessAddress) doc.text(`Address: ${settings.businessAddress}`, 50, 110, { width: 250 });
  if (settings.gstNumber) doc.text(`GSTIN: ${settings.gstNumber}`, 50, 140);

  // Invoice Details (Top Right)
  doc.fillColor('#000000').fontSize(14).text("INVOICE", 380, 50, { align: 'right' });
  doc.fontSize(10).fillColor('#475569');
  doc.text(`Invoice No: ${transaction.invoiceNumber || transaction._id.toString().substring(18).toUpperCase()}`, 380, 75, { align: 'right' });
  doc.text(`Date: ${formatDate(transaction.date)}`, 380, 90, { align: 'right' });
  doc.text(`Time: ${transaction.time || ""}`, 380, 105, { align: 'right' });

  drawDivider(doc, 160);

  // Bill To (Customer Details)
  doc.fillColor('#000000').fontSize(12).text("BILL TO:", 50, 180);
  doc.fontSize(11).fillColor('#1e293b');
  const cust = transaction.customer;
  doc.text(cust ? cust.name : "Walk-in Customer", 50, 200, { bold: true });
  if (cust && cust.mobileNumber) doc.text(`Mobile: ${cust.mobileNumber}`, 50, 215);
  if (cust && cust.address) doc.text(`Address: ${cust.address}`, 50, 230, { width: 250 });
  if (cust && cust.area) doc.text(`Area: ${cust.area}`, 50, 260);

  drawDivider(doc, 280);

  // Table Headers
  let y = 300;
  doc.fillColor('#1e40af').fontSize(10);
  doc.text("Product Details", 50, y, { bold: true });
  doc.text("Price", 320, y, { width: 60, align: 'right', bold: true });
  doc.text("Qty", 400, y, { width: 50, align: 'right', bold: true });
  doc.text("Total Amount", 480, y, { width: 80, align: 'right', bold: true });

  drawDivider(doc, y + 15);
  y += 25;

  // Table Rows (Products)
  doc.fillColor('#334155').fontSize(10);
  transaction.products.forEach((p) => {
    const nameStr = `${p.categoryName} - ${p.brandName} ${p.name}`;
    doc.text(nameStr, 50, y, { width: 250 });
    doc.text(formatCurrency(p.unitPrice), 320, y, { width: 60, align: 'right' });
    doc.text(`${p.quantity} ${p.unit || ''}`, 400, y, { width: 50, align: 'right' });
    doc.text(formatCurrency(p.total), 480, y, { width: 80, align: 'right' });

    y += 20;
    if (y > 700) {
      doc.addPage();
      y = 50;
    }
  });

  drawDivider(doc, y + 5);
  y += 15;

  // Grand Total
  doc.fillColor('#000000').fontSize(12).text("Grand Total:", 320, y, { width: 130, align: 'right', bold: true });
  doc.fillColor('#16a34a').fontSize(14).text(formatCurrency(transaction.grandTotal), 460, y, { width: 100, align: 'right', bold: true });

  y += 60;
  // Footer / Thank You Note
  doc.fillColor('#94a3b8').fontSize(9).text("Thank you for your business!", 50, y, { align: 'center', width: 512 });

  // Finalize PDF file
  doc.end();
}

/**
 * Generate PDF Customer Ledger (Paper Ledger Style)
 */
export function generateLedgerPDF(customer, transactions, collections, dateRange, settings, res) {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  doc.pipe(res);

  // Business Header
  doc.fillColor('#1e40af').fontSize(22).text(settings.businessName || "MILK DISTRIBUTION", 50, 50);
  doc.fillColor('#475569').fontSize(10);
  doc.text(`Phone: ${settings.phoneNumber || ""} | Address: ${settings.businessAddress || ""}`, 50, 75);

  doc.fillColor('#000000').fontSize(14).text("CUSTOMER LEDGER STATEMENT", 350, 50, { align: 'right' });
  const rangeStr = dateRange.startDate && dateRange.endDate
    ? `${formatDate(dateRange.startDate)} to ${formatDate(dateRange.endDate)}`
    : "All Time";
  doc.fontSize(10).fillColor('#475569').text(`Period: ${rangeStr}`, 350, 70, { align: 'right' });

  drawDivider(doc, 95);

  // Customer Summary
  doc.fillColor('#000000').fontSize(12).text("CUSTOMER DETAILS:", 50, 110);
  doc.fontSize(11).fillColor('#1e293b');
  doc.text(`Name: ${customer.name}`, 50, 125);
  doc.text(`Mobile: ${customer.mobileNumber || "N/A"}`, 50, 140);
  doc.text(`Address: ${customer.address || "N/A"} (${customer.area || ""})`, 50, 155);

  // Financial Stats Box
  let totalSupplied = transactions.reduce((sum, t) => sum + t.grandTotal, 0);
  let totalCollected = collections.reduce((sum, c) => sum + c.amountCollected, 0);
  let currentBalance = customer.balance;

  doc.rect(340, 105, 220, 75).fillColor('#f8fafc').fillAndStroke('#cbd5e1');
  doc.fillColor('#1e293b').fontSize(9);
  doc.text(`Total Supplies:`, 350, 115);
  doc.text(formatCurrency(totalSupplied), 480, 115, { align: 'right' });
  doc.text(`Total Collections:`, 350, 130);
  doc.text(formatCurrency(totalCollected), 480, 130, { align: 'right' });
  doc.fillColor('#b91c1c').text(`Outstanding Balance:`, 350, 150, { bold: true });
  doc.text(formatCurrency(currentBalance), 480, 150, { align: 'right', bold: true });

  // Compile chronologically supplies and payments
  let ledgerEntries = [];
  const formatEntryTime = (dateObj) => {
    return dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  transactions.forEach(t => {
    const createdD = new Date(t.createdAt || t.date);
    ledgerEntries.push({
      date: new Date(t.date),
      createdAt: createdD,
      time: t.time || formatEntryTime(createdD),
      type: 'SUPPLY',
      description: t.products.map(p => `${p.brandName} ${p.name} x${p.quantity}`).join(', '),
      amount: t.grandTotal,
      refId: t.invoiceNumber || t._id.toString().substring(18).toUpperCase()
    });
  });

  collections.forEach(c => {
    const createdD = new Date(c.createdAt || c.date);
    ledgerEntries.push({
      date: new Date(c.date),
      createdAt: createdD,
      time: formatEntryTime(createdD),
      type: 'COLLECTION',
      description: `Payment (${c.paymentMethod})${c.notes ? ' - ' + c.notes : ''}`,
      amount: c.amountCollected,
      refId: `COL-${c._id.toString().substring(20).toUpperCase()}`
    });
  });

  // Sort by date first, then exact entry order (createdAt)
  ledgerEntries.sort((a, b) => {
    const dA = new Date(a.date).setHours(0,0,0,0);
    const dB = new Date(b.date).setHours(0,0,0,0);
    if (dA !== dB) return dA - dB;
    return a.createdAt - b.createdAt;
  });

  let y = 205;
  doc.fillColor('#1e40af').fontSize(10);
  doc.text("Date", 50, y, { bold: true });
  doc.text("Type / Description", 120, y, { bold: true });
  doc.text("Supply (+)", 330, y, { width: 70, align: 'right', bold: true });
  doc.text("Collected (-)", 410, y, { width: 70, align: 'right', bold: true });
  doc.text("Running Bal", 490, y, { width: 70, align: 'right', bold: true });

  drawDivider(doc, y + 15);
  y += 25;

  doc.fillColor('#334155').fontSize(9);
  let tempBal = currentBalance - totalSupplied + totalCollected; // Estimate start balance

  ledgerEntries.forEach(entry => {
    let supplyCol = "";
    let collectionCol = "";
    if (entry.type === 'SUPPLY') {
      supplyCol = formatCurrency(entry.amount);
      tempBal += entry.amount;
    } else {
      collectionCol = formatCurrency(entry.amount);
      tempBal -= entry.amount;
    }

    doc.text(`${formatDate(entry.date)}\n${entry.time || ''}`, 50, y);
    doc.text(`[${entry.refId}] ${entry.description}`, 120, y, { width: 200 });
    doc.text(supplyCol, 330, y, { width: 70, align: 'right' });
    doc.text(collectionCol, 410, y, { width: 70, align: 'right' });
    doc.text(formatCurrency(tempBal), 490, y, { width: 70, align: 'right' });

    y += 30;
    if (y > 720) {
      doc.addPage();
      y = 50;
      doc.fillColor('#1e40af').fontSize(10);
      doc.text("Date", 50, y, { bold: true });
      doc.text("Type / Description", 120, y, { bold: true });
      doc.text("Supply (+)", 330, y, { width: 70, align: 'right', bold: true });
      doc.text("Collected (-)", 410, y, { width: 70, align: 'right', bold: true });
      doc.text("Running Bal", 490, y, { width: 70, align: 'right', bold: true });
      drawDivider(doc, y + 15);
      y += 30;
      doc.fillColor('#334155').fontSize(9);
    }
  });

  drawDivider(doc, y);
  doc.end();
}

/**
 * Generate PDF Expense Statement
 */
export function generateExpensesPDF(expenses, settings, dateRange, res) {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  doc.pipe(res);

  doc.fillColor('#1e40af').fontSize(22).text(settings.businessName || "MILK DISTRIBUTION", 50, 50);
  doc.fillColor('#475569').fontSize(10);
  doc.text(`Phone: ${settings.phoneNumber || ""} | Expense Report`, 50, 75);

  doc.fillColor('#000000').fontSize(14).text("EXPENSE REPORT", 350, 50, { align: 'right' });
  const rangeStr = dateRange.startDate && dateRange.endDate
    ? `${formatDate(dateRange.startDate)} to ${formatDate(dateRange.endDate)}`
    : "All Time";
  doc.fontSize(10).fillColor('#475569').text(`Period: ${rangeStr}`, 350, 70, { align: 'right' });

  drawDivider(doc, 95);

  const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);
  doc.fillColor('#1e293b').fontSize(12).text(`Total Expenses Recorded: `, 50, 110);
  doc.fillColor('#b91c1c').text(formatCurrency(totalExpense), 210, 110, { bold: true });

  let y = 145;
  doc.fillColor('#1e40af').fontSize(10);
  doc.text("Date", 50, y, { bold: true });
  doc.text("Category", 150, y, { bold: true });
  doc.text("Notes", 270, y, { bold: true });
  doc.text("Amount", 480, y, { width: 80, align: 'right', bold: true });

  drawDivider(doc, y + 15);
  y += 25;

  doc.fillColor('#334155').fontSize(9);
  expenses.forEach(e => {
    doc.text(formatDate(e.date), 50, y);
    doc.text(e.category ? e.category.name : "Uncategorized", 150, y);
    doc.text(e.notes || "-", 270, y, { width: 200 });
    doc.text(formatCurrency(e.amount), 480, y, { width: 80, align: 'right' });

    y += 20;
    if (y > 720) {
      doc.addPage();
      y = 50;
      doc.fillColor('#1e40af').fontSize(10);
      doc.text("Date", 50, y, { bold: true });
      doc.text("Category", 150, y, { bold: true });
      doc.text("Notes", 270, y, { bold: true });
      doc.text("Amount", 480, y, { width: 80, align: 'right', bold: true });
      drawDivider(doc, y + 15);
      y += 25;
      doc.fillColor('#334155').fontSize(9);
    }
  });

  drawDivider(doc, y);
  doc.end();
}
