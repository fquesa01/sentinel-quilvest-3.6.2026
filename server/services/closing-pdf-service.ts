import PDFDocument from "pdfkit";
import { format } from "date-fns";

interface ClosingData {
  closing: any;
  lineItems: any[];
  parties: any[];
  prorations: any[];
  escrows: any[];
  payoffs: any[];
  commissions: any[];
  wires: any[];
  balance: { totalSources: string; totalUses: string; difference: string; balanceValid: boolean };
  totals: { payoffs: string; commissions: string; escrows: string; wires: string };
}

const typeLabels: Record<string, string> = {
  closing_disclosure: "Closing Disclosure",
  seller_closing_disclosure: "Seller Closing Disclosure",
  hud1: "HUD-1 Settlement Statement",
  hud1a: "HUD-1A Settlement Statement",
  cash_settlement: "Cash Settlement Statement",
  alta_combined: "ALTA Settlement Statement - Combined",
  alta_buyer: "ALTA Settlement Statement - Buyer",
  alta_seller: "ALTA Settlement Statement - Seller",
  sources_and_uses: "Sources & Uses Statement",
  lender_funding: "Lender Funding Statement",
  funds_flow: "Funds Flow Statement",
  construction_sources_uses: "Construction Sources & Uses",
  construction_draw: "Construction Draw Schedule",
  cmbs_funding_memo: "CMBS Funding Memo",
  capital_stack: "Capital Stack Summary",
  investor_waterfall: "Investor Waterfall",
  "1031_exchange": "1031 Exchange Settlement Statement",
  qi_statement: "Qualified Intermediary Statement",
  portfolio_settlement: "Portfolio Settlement Statement",
  ground_lease_closing: "Ground Lease Closing Statement",
  master_closing: "Master Closing Statement",
};

const sideLabels: Record<string, string> = {
  source: "Source", use: "Use",
  buyer_credit: "Buyer Credit", buyer_debit: "Buyer Debit",
  seller_credit: "Seller Credit", seller_debit: "Seller Debit",
};

const categoryLabels: Record<string, string> = {
  purchase_price: "Purchase Price", deposit: "Deposit/Earnest Money",
  loan_amount: "Loan Amount", closing_cost: "Closing Cost",
  title_insurance: "Title Insurance", recording_fee: "Recording Fee",
  transfer_tax: "Transfer Tax", commission: "Commission",
  property_tax_proration: "Property Tax Proration", insurance_proration: "Insurance Proration",
  hoa_proration: "HOA Proration", rent_proration: "Rent Proration",
  adjustment: "Adjustment", escrow: "Escrow/Reserve",
  payoff: "Payoff/Lien", holdback: "Holdback", reserve: "Reserve", other: "Other",
};

function parseAmt(val: string | null | undefined): number {
  if (!val) return 0;
  const n = parseFloat(val.replace(/[,$\s]/g, ""));
  return isNaN(n) ? 0 : n;
}

function fmtCurrency(val: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val);
}

function fmtDate(val: string | null | undefined): string {
  if (!val) return "N/A";
  try { return format(new Date(val), "MM/dd/yyyy"); } catch { return val; }
}

function addPageFooter(doc: PDFKit.PDFDocument, pageNum: number, totalPages: number, closing: any) {
  const y = doc.page.height - 30;
  doc.save();
  doc.fontSize(7).font("Helvetica").fillColor("#999999");
  doc.text(`Page ${pageNum} of ${totalPages}`, 50, y, { align: "center", width: doc.page.width - 100 });
  doc.text(`${closing.title || "Closing Statement"} | File #${closing.fileNumber || "N/A"} | Generated ${format(new Date(), "MM/dd/yyyy")}`, 50, y + 8, { align: "center", width: doc.page.width - 100 });
  doc.restore();
  doc.fillColor("#000000");
}

function drawLine(doc: PDFKit.PDFDocument, y?: number) {
  const lineY = y ?? doc.y;
  doc.save();
  doc.moveTo(50, lineY).lineTo(doc.page.width - 50, lineY).strokeColor("#cccccc").lineWidth(0.5).stroke();
  doc.restore();
}

function sectionHeader(doc: PDFKit.PDFDocument, title: string) {
  if (doc.y > doc.page.height - 100) doc.addPage();
  doc.moveDown(0.5);
  doc.fontSize(11).font("Helvetica-Bold").fillColor("#1a365d").text(title);
  doc.fillColor("#000000");
  drawLine(doc, doc.y + 2);
  doc.moveDown(0.3);
}

function tableRow(doc: PDFKit.PDFDocument, cols: { text: string; width: number; align?: "left" | "right" | "center"; bold?: boolean }[]) {
  if (doc.y > doc.page.height - 50) doc.addPage();
  const startX = 50;
  const y = doc.y;
  let x = startX;
  for (const col of cols) {
    doc.font(col.bold ? "Helvetica-Bold" : "Helvetica").fontSize(8.5);
    doc.text(col.text, x, y, { width: col.width, align: col.align || "left" });
    x += col.width;
  }
  doc.y = y + 14;
}

function renderCoverPage(doc: PDFKit.PDFDocument, data: ClosingData) {
  const c = data.closing;
  const typeLabel = typeLabels[c.transactionType] || c.transactionType;

  doc.moveDown(4);
  doc.fontSize(10).font("Helvetica").fillColor("#666666").text("SENTINEL COUNSEL LLP", { align: "center" });
  doc.moveDown(0.3);
  doc.fontSize(8).fillColor("#999999").text("CONFIDENTIAL — ATTORNEY WORK PRODUCT", { align: "center" });
  doc.moveDown(3);
  doc.fontSize(22).font("Helvetica-Bold").fillColor("#1a365d").text(typeLabel.toUpperCase(), { align: "center" });
  doc.fillColor("#000000");
  doc.moveDown(1);
  doc.fontSize(14).font("Helvetica").text(c.title || "Closing Statement", { align: "center" });
  doc.moveDown(2);

  doc.fontSize(10).font("Helvetica");
  const infoY = doc.y;
  const mid = doc.page.width / 2;
  const leftCol = [
    ["File Number:", c.fileNumber || "N/A"],
    ["Closing Date:", fmtDate(c.closingDate)],
    ["Disbursement Date:", fmtDate(c.disbursementDate)],
    ["Status:", (c.status || "draft").replace(/_/g, " ").toUpperCase()],
  ];
  const rightCol = [
    ["Property:", c.propertyAddress || "N/A"],
    ["Purchase Price:", fmtCurrency(parseAmt(c.purchasePrice))],
    ["Loan Amount:", fmtCurrency(parseAmt(c.loanAmount))],
    ["Earnest Money:", fmtCurrency(parseAmt(c.earnestMoney))],
  ];

  let y = infoY;
  for (const [label, value] of leftCol) {
    doc.font("Helvetica-Bold").text(label, 120, y, { continued: true, width: 120 });
    doc.font("Helvetica").text(` ${value}`, { width: 200 });
    y = doc.y;
  }

  y = infoY;
  for (const [label, value] of rightCol) {
    doc.font("Helvetica-Bold").text(label, mid + 20, y, { continued: true, width: 120 });
    doc.font("Helvetica").text(` ${value}`, { width: 200 });
    y += 14;
  }
  doc.y = Math.max(doc.y, y) + 10;

  doc.moveDown(2);
  const parties = data.parties;
  if (parties.length > 0) {
    doc.fontSize(10).font("Helvetica-Bold").text("PARTIES:", 120);
    doc.moveDown(0.3);
    for (const p of parties) {
      doc.fontSize(9).font("Helvetica");
      doc.text(`${(p.role || "party").toUpperCase()}: ${p.name}${p.company ? ` (${p.company})` : ""}`, 130);
    }
  }

  doc.moveDown(3);
  doc.fontSize(8).fillColor("#999999").text(`Generated: ${format(new Date(), "MMMM d, yyyy 'at' h:mm a")}`, { align: "center" });
  doc.fillColor("#000000");
}

function renderLineItemsPage(doc: PDFKit.PDFDocument, data: ClosingData) {
  doc.addPage();
  const txType = data.closing.transactionType;

  sectionHeader(doc, "LINE ITEMS");

  const colWidths = { num: 35, desc: 200, category: 90, side: 70, amount: 90 };
  const totalWidth = colWidths.num + colWidths.desc + colWidths.category + colWidths.side + colWidths.amount;

  tableRow(doc, [
    { text: "#", width: colWidths.num, bold: true },
    { text: "Description", width: colWidths.desc, bold: true },
    { text: "Category", width: colWidths.category, bold: true },
    { text: "Side", width: colWidths.side, bold: true },
    { text: "Amount", width: colWidths.amount, align: "right", bold: true },
  ]);
  drawLine(doc);
  doc.moveDown(0.2);

  if (data.lineItems.length === 0) {
    doc.fontSize(9).font("Helvetica").text("No line items recorded.", 50);
  } else {
    for (const item of data.lineItems) {
      tableRow(doc, [
        { text: item.lineNumber || "-", width: colWidths.num },
        { text: item.description || "", width: colWidths.desc },
        { text: categoryLabels[item.category] || item.category || "", width: colWidths.category },
        { text: sideLabels[item.side] || item.side || "", width: colWidths.side },
        { text: fmtCurrency(parseAmt(item.amount)), width: colWidths.amount, align: "right" },
      ]);
    }
  }

  doc.moveDown(0.5);
  drawLine(doc);
  doc.moveDown(0.3);
  tableRow(doc, [
    { text: "", width: colWidths.num },
    { text: "Total Sources:", width: colWidths.desc + colWidths.category + colWidths.side, bold: true },
    { text: fmtCurrency(parseAmt(data.balance.totalSources)), width: colWidths.amount, align: "right", bold: true },
  ]);
  tableRow(doc, [
    { text: "", width: colWidths.num },
    { text: "Total Uses:", width: colWidths.desc + colWidths.category + colWidths.side, bold: true },
    { text: fmtCurrency(parseAmt(data.balance.totalUses)), width: colWidths.amount, align: "right", bold: true },
  ]);
  drawLine(doc);
  doc.moveDown(0.2);
  tableRow(doc, [
    { text: "", width: colWidths.num },
    { text: data.balance.balanceValid ? "BALANCE: VERIFIED" : "BALANCE: UNBALANCED", width: colWidths.desc + colWidths.category + colWidths.side, bold: true },
    { text: fmtCurrency(parseAmt(data.balance.difference)), width: colWidths.amount, align: "right", bold: true },
  ]);
}

function renderHud1Sections(doc: PDFKit.PDFDocument, data: ClosingData) {
  doc.addPage();
  const sections = [
    { num: "100", label: "GROSS AMOUNT DUE FROM BORROWER" },
    { num: "200", label: "AMOUNTS PAID BY/ON BEHALF OF BORROWER" },
    { num: "300", label: "CASH AT SETTLEMENT FROM/TO BORROWER" },
    { num: "400", label: "GROSS AMOUNT DUE TO SELLER" },
    { num: "500", label: "REDUCTIONS IN AMOUNT DUE TO SELLER" },
    { num: "600", label: "CASH AT SETTLEMENT TO/FROM SELLER" },
    { num: "700", label: "TOTAL REAL ESTATE BROKER FEES" },
    { num: "800", label: "ITEMS PAYABLE IN CONNECTION WITH LOAN" },
    { num: "900", label: "ITEMS REQUIRED BY LENDER TO BE PAID IN ADVANCE" },
    { num: "1000", label: "RESERVES DEPOSITED WITH LENDER" },
    { num: "1100", label: "TITLE CHARGES" },
    { num: "1200", label: "GOVERNMENT RECORDING AND TRANSFER CHARGES" },
    { num: "1300", label: "ADDITIONAL SETTLEMENT CHARGES" },
  ];

  doc.fontSize(12).font("Helvetica-Bold").fillColor("#1a365d").text("U.S. DEPARTMENT OF HOUSING AND URBAN DEVELOPMENT", { align: "center" });
  doc.fontSize(14).font("Helvetica-Bold").text("SETTLEMENT STATEMENT", { align: "center" });
  doc.fillColor("#000000");
  doc.moveDown(0.5);
  doc.fontSize(8).font("Helvetica").text(`Property: ${data.closing.propertyAddress || "N/A"}`, 50);
  doc.text(`Settlement Date: ${fmtDate(data.closing.closingDate)}`, 50);
  doc.moveDown(0.5);

  doc.fontSize(10).font("Helvetica-Bold").text("J. SUMMARY OF BORROWER'S TRANSACTION", 50);
  doc.moveDown(0.3);

  for (const sec of sections.slice(0, 3)) {
    const items = data.lineItems.filter(li => li.hudSection === sec.num);
    sectionHeader(doc, `${sec.num}. ${sec.label}`);
    if (items.length === 0) {
      doc.fontSize(8.5).font("Helvetica").text("(No items)", 60);
    }
    for (const item of items) {
      tableRow(doc, [
        { text: item.lineNumber || "", width: 40 },
        { text: item.description || "", width: 340 },
        { text: fmtCurrency(parseAmt(item.amount)), width: 100, align: "right" },
      ]);
    }
    const total = items.reduce((s, i) => s + parseAmt(i.amount), 0);
    if (items.length > 0) {
      drawLine(doc);
      doc.moveDown(0.1);
      tableRow(doc, [
        { text: "", width: 40 },
        { text: `Section ${sec.num} Total:`, width: 340, bold: true },
        { text: fmtCurrency(total), width: 100, align: "right", bold: true },
      ]);
    }
  }

  if (doc.y > doc.page.height - 200) doc.addPage();
  doc.moveDown(0.5);
  doc.fontSize(10).font("Helvetica-Bold").text("K. SUMMARY OF SELLER'S TRANSACTION", 50);
  doc.moveDown(0.3);

  for (const sec of sections.slice(3, 6)) {
    const items = data.lineItems.filter(li => li.hudSection === sec.num);
    sectionHeader(doc, `${sec.num}. ${sec.label}`);
    if (items.length === 0) {
      doc.fontSize(8.5).font("Helvetica").text("(No items)", 60);
    }
    for (const item of items) {
      tableRow(doc, [
        { text: item.lineNumber || "", width: 40 },
        { text: item.description || "", width: 340 },
        { text: fmtCurrency(parseAmt(item.amount)), width: 100, align: "right" },
      ]);
    }
    const total = items.reduce((s, i) => s + parseAmt(i.amount), 0);
    if (items.length > 0) {
      drawLine(doc);
      doc.moveDown(0.1);
      tableRow(doc, [
        { text: "", width: 40 },
        { text: `Section ${sec.num} Total:`, width: 340, bold: true },
        { text: fmtCurrency(total), width: 100, align: "right", bold: true },
      ]);
    }
  }

  if (doc.y > doc.page.height - 200) doc.addPage();
  doc.moveDown(0.5);
  doc.fontSize(10).font("Helvetica-Bold").text("L. SETTLEMENT CHARGES", 50);
  doc.moveDown(0.3);

  for (const sec of sections.slice(6)) {
    const items = data.lineItems.filter(li => li.hudSection === sec.num);
    sectionHeader(doc, `${sec.num}. ${sec.label}`);
    if (items.length === 0) {
      doc.fontSize(8.5).font("Helvetica").text("(No items)", 60);
    }
    for (const item of items) {
      tableRow(doc, [
        { text: item.lineNumber || "", width: 40 },
        { text: item.description || "", width: 340 },
        { text: fmtCurrency(parseAmt(item.amount)), width: 100, align: "right" },
      ]);
    }
    const total = items.reduce((s, i) => s + parseAmt(i.amount), 0);
    if (items.length > 0) {
      drawLine(doc);
      doc.moveDown(0.1);
      tableRow(doc, [
        { text: "", width: 40 },
        { text: `Section ${sec.num} Total:`, width: 340, bold: true },
        { text: fmtCurrency(total), width: 100, align: "right", bold: true },
      ]);
    }
  }
}

function renderCDSections(doc: PDFKit.PDFDocument, data: ClosingData) {
  doc.addPage();

  doc.fontSize(12).font("Helvetica-Bold").fillColor("#1a365d").text("CLOSING DISCLOSURE", { align: "center" });
  doc.fillColor("#000000");
  doc.moveDown(0.3);
  doc.fontSize(8).font("Helvetica").text("This form is a statement of final loan terms and closing costs. Compare this document with your Loan Estimate.", { align: "center" });
  doc.moveDown(0.5);

  const info = [
    ["Closing Date:", fmtDate(data.closing.closingDate), "Property:", data.closing.propertyAddress || "N/A"],
    ["Sale Price:", fmtCurrency(parseAmt(data.closing.purchasePrice)), "Loan Amount:", fmtCurrency(parseAmt(data.closing.loanAmount))],
  ];
  for (const row of info) {
    const y = doc.y;
    doc.font("Helvetica-Bold").fontSize(8.5).text(row[0], 50, y, { width: 90 });
    doc.font("Helvetica").text(row[1], 140, y, { width: 150 });
    doc.font("Helvetica-Bold").text(row[2], 310, y, { width: 90 });
    doc.font("Helvetica").text(row[3], 400, y, { width: 160 });
    doc.y = y + 14;
  }
  doc.moveDown(0.5);

  const cdSections = [
    { key: "loan_terms", label: "LOAN TERMS" },
    { key: "projected_payments", label: "PROJECTED PAYMENTS" },
    { key: "closing_costs", label: "CLOSING COSTS DETAILS" },
    { key: "cash_to_close", label: "CALCULATING CASH TO CLOSE" },
    { key: "summaries", label: "SUMMARIES OF TRANSACTIONS" },
  ];

  for (const sec of cdSections) {
    const items = data.lineItems.filter(li => (li as any).cdSection === sec.key);
    sectionHeader(doc, sec.label);
    if (items.length === 0) {
      doc.fontSize(8.5).font("Helvetica").text("(No items)", 60);
    }
    for (const item of items) {
      tableRow(doc, [
        { text: item.description || "", width: 380 },
        { text: fmtCurrency(parseAmt(item.amount)), width: 100, align: "right" },
      ]);
    }
    const total = items.reduce((s, i) => s + parseAmt(i.amount), 0);
    if (items.length > 0) {
      drawLine(doc);
      doc.moveDown(0.1);
      tableRow(doc, [
        { text: `${sec.label} Total:`, width: 380, bold: true },
        { text: fmtCurrency(total), width: 100, align: "right", bold: true },
      ]);
    }
  }
}

function renderAltaSections(doc: PDFKit.PDFDocument, data: ClosingData) {
  doc.addPage();
  const txType = data.closing.transactionType;
  const isCombo = txType === "alta_combined";

  doc.fontSize(12).font("Helvetica-Bold").fillColor("#1a365d").text("AMERICAN LAND TITLE ASSOCIATION", { align: "center" });
  doc.fontSize(11).font("Helvetica-Bold").text("SETTLEMENT STATEMENT", { align: "center" });
  doc.fillColor("#000000");
  doc.moveDown(0.3);
  doc.fontSize(8.5).font("Helvetica");
  doc.text(`Property: ${data.closing.propertyAddress || "N/A"}    Settlement Date: ${fmtDate(data.closing.closingDate)}    Sale Price: ${fmtCurrency(parseAmt(data.closing.purchasePrice))}`);
  doc.moveDown(0.5);

  const cats = ["financial", "prorations", "commissions", "title", "taxes", "payoffs", "escrows", "other"];
  const catLabels: Record<string, string> = {
    financial: "FINANCIAL", prorations: "PRORATIONS & ADJUSTMENTS", commissions: "COMMISSIONS",
    title: "TITLE CHARGES", taxes: "GOVERNMENT & TAXES", payoffs: "PAYOFFS & LIENS",
    escrows: "ESCROW & RESERVES", other: "OTHER CHARGES",
  };

  if (isCombo) {
    for (const cat of cats) {
      const allItems = data.lineItems.filter(li => (li as any).altaCategory === cat);
      if (allItems.length === 0) continue;
      sectionHeader(doc, catLabels[cat] || cat.toUpperCase());
      const buyerItems = allItems.filter(li => li.paidBy === "buyer" || li.side === "buyer_debit" || li.side === "buyer_credit");
      const sellerItems = allItems.filter(li => li.paidBy === "seller" || li.side === "seller_debit" || li.side === "seller_credit");
      const otherItems = allItems.filter(li => !buyerItems.includes(li) && !sellerItems.includes(li));

      if (buyerItems.length > 0) {
        doc.fontSize(8).font("Helvetica-Bold").text("Buyer:", 55);
        for (const item of buyerItems) {
          tableRow(doc, [
            { text: "", width: 15 },
            { text: item.description || "", width: 350 },
            { text: fmtCurrency(parseAmt(item.amount)), width: 100, align: "right" },
          ]);
        }
      }
      if (sellerItems.length > 0) {
        doc.fontSize(8).font("Helvetica-Bold").text("Seller:", 55);
        for (const item of sellerItems) {
          tableRow(doc, [
            { text: "", width: 15 },
            { text: item.description || "", width: 350 },
            { text: fmtCurrency(parseAmt(item.amount)), width: 100, align: "right" },
          ]);
        }
      }
      if (otherItems.length > 0) {
        for (const item of otherItems) {
          tableRow(doc, [
            { text: "", width: 15 },
            { text: item.description || "", width: 350 },
            { text: fmtCurrency(parseAmt(item.amount)), width: 100, align: "right" },
          ]);
        }
      }
    }
  } else {
    for (const cat of cats) {
      const items = data.lineItems.filter(li => (li as any).altaCategory === cat);
      if (items.length === 0) continue;
      sectionHeader(doc, catLabels[cat] || cat.toUpperCase());
      for (const item of items) {
        tableRow(doc, [
          { text: item.description || "", width: 380 },
          { text: fmtCurrency(parseAmt(item.amount)), width: 100, align: "right" },
        ]);
      }
      const total = items.reduce((s, i) => s + parseAmt(i.amount), 0);
      drawLine(doc);
      doc.moveDown(0.1);
      tableRow(doc, [
        { text: `${catLabels[cat] || cat} Total:`, width: 380, bold: true },
        { text: fmtCurrency(total), width: 100, align: "right", bold: true },
      ]);
    }
  }
}

function renderSourcesUses(doc: PDFKit.PDFDocument, data: ClosingData) {
  doc.addPage();
  doc.fontSize(12).font("Helvetica-Bold").fillColor("#1a365d").text("SOURCES & USES OF FUNDS", { align: "center" });
  doc.fillColor("#000000");
  doc.moveDown(0.5);

  const sources = data.lineItems.filter(li => li.side === "source" || li.side === "buyer_credit" || li.side === "seller_credit");
  const uses = data.lineItems.filter(li => li.side === "use" || li.side === "buyer_debit" || li.side === "seller_debit");

  sectionHeader(doc, "SOURCES OF FUNDS");
  for (const item of sources) {
    tableRow(doc, [
      { text: item.description || "", width: 380 },
      { text: fmtCurrency(parseAmt(item.amount)), width: 100, align: "right" },
    ]);
  }
  const totalSources = sources.reduce((s, i) => s + parseAmt(i.amount), 0);
  drawLine(doc);
  doc.moveDown(0.1);
  tableRow(doc, [
    { text: "TOTAL SOURCES:", width: 380, bold: true },
    { text: fmtCurrency(totalSources), width: 100, align: "right", bold: true },
  ]);

  doc.moveDown(0.5);
  sectionHeader(doc, "USES OF FUNDS");
  for (const item of uses) {
    tableRow(doc, [
      { text: item.description || "", width: 380 },
      { text: fmtCurrency(parseAmt(item.amount)), width: 100, align: "right" },
    ]);
  }
  const totalUses = uses.reduce((s, i) => s + parseAmt(i.amount), 0);
  drawLine(doc);
  doc.moveDown(0.1);
  tableRow(doc, [
    { text: "TOTAL USES:", width: 380, bold: true },
    { text: fmtCurrency(totalUses), width: 100, align: "right", bold: true },
  ]);

  doc.moveDown(0.5);
  drawLine(doc);
  doc.moveDown(0.2);
  const diff = totalSources - totalUses;
  tableRow(doc, [
    { text: Math.abs(diff) < 0.01 ? "BALANCE: VERIFIED" : "BALANCE: UNBALANCED", width: 380, bold: true },
    { text: fmtCurrency(diff), width: 100, align: "right", bold: true },
  ]);
}

function renderFundsFlow(doc: PDFKit.PDFDocument, data: ClosingData) {
  doc.addPage();
  doc.fontSize(12).font("Helvetica-Bold").fillColor("#1a365d").text("FUNDS FLOW STATEMENT", { align: "center" });
  doc.fillColor("#000000");
  doc.moveDown(0.5);

  const incoming = data.lineItems.filter(li => li.side === "source" || li.side === "buyer_credit" || li.side === "seller_credit");
  const outgoing = data.lineItems.filter(li => li.side === "use" || li.side === "buyer_debit" || li.side === "seller_debit");

  sectionHeader(doc, "INCOMING WIRES");
  for (const item of incoming) {
    tableRow(doc, [
      { text: item.description || "", width: 280 },
      { text: item.paidBy ? `From: ${item.paidBy}` : "", width: 100 },
      { text: fmtCurrency(parseAmt(item.amount)), width: 100, align: "right" },
    ]);
  }
  const totalIn = incoming.reduce((s, i) => s + parseAmt(i.amount), 0);
  drawLine(doc);
  tableRow(doc, [{ text: "TOTAL INCOMING:", width: 380, bold: true }, { text: fmtCurrency(totalIn), width: 100, align: "right", bold: true }]);

  doc.moveDown(0.5);
  sectionHeader(doc, "OUTGOING WIRES");
  for (const item of outgoing) {
    tableRow(doc, [
      { text: item.description || "", width: 280 },
      { text: item.paidTo ? `To: ${item.paidTo}` : "", width: 100 },
      { text: fmtCurrency(parseAmt(item.amount)), width: 100, align: "right" },
    ]);
  }
  const totalOut = outgoing.reduce((s, i) => s + parseAmt(i.amount), 0);
  drawLine(doc);
  tableRow(doc, [{ text: "TOTAL OUTGOING:", width: 380, bold: true }, { text: fmtCurrency(totalOut), width: 100, align: "right", bold: true }]);

  doc.moveDown(0.5);
  drawLine(doc);
  doc.moveDown(0.2);
  tableRow(doc, [{ text: "NET FLOW:", width: 380, bold: true }, { text: fmtCurrency(totalIn - totalOut), width: 100, align: "right", bold: true }]);

  if (data.wires.length > 0) {
    doc.moveDown(0.5);
    sectionHeader(doc, "WIRE TRANSFER DETAILS");
    tableRow(doc, [
      { text: "Reference", width: 150, bold: true },
      { text: "Bank", width: 100, bold: true },
      { text: "Status", width: 70, bold: true },
      { text: "Amount", width: 80, align: "right", bold: true },
    ]);
    drawLine(doc);
    for (const wire of data.wires) {
      tableRow(doc, [
        { text: wire.reference || "", width: 150 },
        { text: wire.bankName || "", width: 100 },
        { text: (wire.status || "pending").replace(/_/g, " "), width: 70 },
        { text: fmtCurrency(parseAmt(wire.amount)), width: 80, align: "right" },
      ]);
    }
  }
}

function render1031Exchange(doc: PDFKit.PDFDocument, data: ClosingData) {
  doc.addPage();
  doc.fontSize(12).font("Helvetica-Bold").fillColor("#1a365d").text("1031 EXCHANGE SETTLEMENT STATEMENT", { align: "center" });
  doc.fillColor("#000000");
  doc.moveDown(0.5);

  const relinquished = data.lineItems.filter(li => li.hudSection === "relinquished" || (li.side === "source" && !li.hudSection));
  const replacement = data.lineItems.filter(li => li.hudSection === "replacement" || (li.side === "use" && !li.hudSection));
  const exchangeFunds = data.lineItems.filter(li => li.hudSection === "exchange_funds");

  sectionHeader(doc, "RELINQUISHED PROPERTY PROCEEDS");
  for (const item of relinquished) {
    tableRow(doc, [{ text: item.description || "", width: 380 }, { text: fmtCurrency(parseAmt(item.amount)), width: 100, align: "right" }]);
  }
  const totalR = relinquished.reduce((s, i) => s + parseAmt(i.amount), 0);
  drawLine(doc);
  tableRow(doc, [{ text: "TOTAL RELINQUISHED:", width: 380, bold: true }, { text: fmtCurrency(totalR), width: 100, align: "right", bold: true }]);

  doc.moveDown(0.5);
  sectionHeader(doc, "REPLACEMENT PROPERTY COSTS");
  for (const item of replacement) {
    tableRow(doc, [{ text: item.description || "", width: 380 }, { text: fmtCurrency(parseAmt(item.amount)), width: 100, align: "right" }]);
  }
  const totalRep = replacement.reduce((s, i) => s + parseAmt(i.amount), 0);
  drawLine(doc);
  tableRow(doc, [{ text: "TOTAL REPLACEMENT:", width: 380, bold: true }, { text: fmtCurrency(totalRep), width: 100, align: "right", bold: true }]);

  if (exchangeFunds.length > 0) {
    doc.moveDown(0.5);
    sectionHeader(doc, "EXCHANGE FUNDS");
    for (const item of exchangeFunds) {
      tableRow(doc, [{ text: item.description || "", width: 380 }, { text: fmtCurrency(parseAmt(item.amount)), width: 100, align: "right" }]);
    }
  }
}

function renderPortfolio(doc: PDFKit.PDFDocument, data: ClosingData) {
  doc.addPage();
  const label = typeLabels[data.closing.transactionType] || "PORTFOLIO SETTLEMENT STATEMENT";
  doc.fontSize(12).font("Helvetica-Bold").fillColor("#1a365d").text(label.toUpperCase(), { align: "center" });
  doc.fillColor("#000000");
  doc.moveDown(0.5);

  const sources = data.lineItems.filter(li => li.side === "source" || li.side === "buyer_credit" || li.side === "seller_credit");
  const uses = data.lineItems.filter(li => li.side === "use" || li.side === "buyer_debit" || li.side === "seller_debit");

  sectionHeader(doc, "CAPITAL SUMMARY");
  for (const item of sources) {
    tableRow(doc, [{ text: item.description || "", width: 380 }, { text: fmtCurrency(parseAmt(item.amount)), width: 100, align: "right" }]);
  }
  const totalCap = sources.reduce((s, i) => s + parseAmt(i.amount), 0);
  drawLine(doc);
  tableRow(doc, [{ text: "TOTAL CAPITAL:", width: 380, bold: true }, { text: fmtCurrency(totalCap), width: 100, align: "right", bold: true }]);

  doc.moveDown(0.5);
  sectionHeader(doc, "ALLOCATIONS");
  for (const item of uses) {
    tableRow(doc, [{ text: item.description || "", width: 380 }, { text: fmtCurrency(parseAmt(item.amount)), width: 100, align: "right" }]);
  }
  const totalAlloc = uses.reduce((s, i) => s + parseAmt(i.amount), 0);
  drawLine(doc);
  tableRow(doc, [{ text: "TOTAL ALLOCATED:", width: 380, bold: true }, { text: fmtCurrency(totalAlloc), width: 100, align: "right", bold: true }]);
}

function renderLenderFunding(doc: PDFKit.PDFDocument, data: ClosingData) {
  doc.addPage();
  doc.fontSize(12).font("Helvetica-Bold").fillColor("#1a365d").text("LENDER FUNDING STATEMENT", { align: "center" });
  doc.fillColor("#000000");
  doc.moveDown(0.3);
  doc.fontSize(9).font("Helvetica").text(`Loan Amount: ${fmtCurrency(parseAmt(data.closing.loanAmount))}`, { align: "center" });
  doc.moveDown(0.5);

  const proceeds = data.lineItems.filter(li => li.side === "source" || li.side === "buyer_credit" || li.side === "seller_credit");
  const disbursements = data.lineItems.filter(li => li.side === "use" || li.side === "buyer_debit" || li.side === "seller_debit");

  sectionHeader(doc, "LOAN PROCEEDS");
  for (const item of proceeds) {
    tableRow(doc, [{ text: item.description || "", width: 380 }, { text: fmtCurrency(parseAmt(item.amount)), width: 100, align: "right" }]);
  }
  const totalP = proceeds.reduce((s, i) => s + parseAmt(i.amount), 0);
  drawLine(doc);
  tableRow(doc, [{ text: "TOTAL PROCEEDS:", width: 380, bold: true }, { text: fmtCurrency(totalP), width: 100, align: "right", bold: true }]);

  doc.moveDown(0.5);
  sectionHeader(doc, "DISBURSEMENTS");
  for (const item of disbursements) {
    tableRow(doc, [{ text: item.description || "", width: 380 }, { text: fmtCurrency(parseAmt(item.amount)), width: 100, align: "right" }]);
  }
  const totalD = disbursements.reduce((s, i) => s + parseAmt(i.amount), 0);
  drawLine(doc);
  tableRow(doc, [{ text: "TOTAL DISBURSED:", width: 380, bold: true }, { text: fmtCurrency(totalD), width: 100, align: "right", bold: true }]);
}

function renderProrations(doc: PDFKit.PDFDocument, data: ClosingData) {
  if (data.prorations.length === 0) return;
  if (doc.y > doc.page.height - 150) doc.addPage();

  sectionHeader(doc, "PRORATIONS & ADJUSTMENTS");
  tableRow(doc, [
    { text: "Item", width: 120, bold: true },
    { text: "Annual", width: 70, align: "right", bold: true },
    { text: "Daily Rate", width: 60, align: "right", bold: true },
    { text: "Method", width: 50, bold: true },
    { text: "Seller", width: 80, align: "right", bold: true },
    { text: "Buyer", width: 80, align: "right", bold: true },
  ]);
  drawLine(doc);

  let totalBuyer = 0;
  let totalSeller = 0;
  for (const p of data.prorations) {
    const pr = p.computed || p;
    totalBuyer += parseAmt(pr.buyerCredit || p.buyerCredit);
    totalSeller += parseAmt(pr.sellerCredit || p.sellerCredit);
    tableRow(doc, [
      { text: p.itemName || "", width: 120 },
      { text: fmtCurrency(parseAmt(p.annualAmount)), width: 70, align: "right" },
      { text: `$${pr.dailyRate || p.dailyRate || "0"}`, width: 60, align: "right" },
      { text: p.method === "calendar_day" ? "365" : "360", width: 50 },
      { text: fmtCurrency(parseAmt(pr.sellerCredit || p.sellerCredit)), width: 80, align: "right" },
      { text: fmtCurrency(parseAmt(pr.buyerCredit || p.buyerCredit)), width: 80, align: "right" },
    ]);
  }
  drawLine(doc);
  doc.moveDown(0.1);
  tableRow(doc, [
    { text: "TOTALS:", width: 300, bold: true },
    { text: fmtCurrency(totalSeller), width: 80, align: "right", bold: true },
    { text: fmtCurrency(totalBuyer), width: 80, align: "right", bold: true },
  ]);
}

function renderPayoffsEscrows(doc: PDFKit.PDFDocument, data: ClosingData) {
  if (data.payoffs.length > 0) {
    if (doc.y > doc.page.height - 150) doc.addPage();
    sectionHeader(doc, "PAYOFFS & LIENS");
    tableRow(doc, [
      { text: "Payee", width: 120, bold: true },
      { text: "Type", width: 80, bold: true },
      { text: "Account #", width: 80, bold: true },
      { text: "Balance", width: 70, align: "right", bold: true },
      { text: "Per Diem", width: 50, align: "right", bold: true },
      { text: "Total", width: 80, align: "right", bold: true },
    ]);
    drawLine(doc);
    for (const p of data.payoffs) {
      tableRow(doc, [
        { text: p.lender || "", width: 120 },
        { text: p.lienType || "", width: 80 },
        { text: p.accountNumber || "", width: 80 },
        { text: fmtCurrency(parseAmt(p.currentBalance)), width: 70, align: "right" },
        { text: p.perDiemInterest ? `$${p.perDiemInterest}` : "", width: 50, align: "right" },
        { text: fmtCurrency(parseAmt(p.totalPayoff)), width: 80, align: "right" },
      ]);
    }
  }

  if (data.escrows.length > 0) {
    if (doc.y > doc.page.height - 150) doc.addPage();
    sectionHeader(doc, "ESCROWS & RESERVES");
    tableRow(doc, [
      { text: "Type", width: 180, bold: true },
      { text: "Holder", width: 100, bold: true },
      { text: "Status", width: 100, bold: true },
      { text: "Amount", width: 100, align: "right", bold: true },
    ]);
    drawLine(doc);
    for (const e of data.escrows) {
      tableRow(doc, [
        { text: e.escrowType || "", width: 180 },
        { text: e.holder || "", width: 100 },
        { text: e.status || "held", width: 100 },
        { text: fmtCurrency(parseAmt(e.amount)), width: 100, align: "right" },
      ]);
    }
  }

  if (data.commissions.length > 0) {
    if (doc.y > doc.page.height - 150) doc.addPage();
    sectionHeader(doc, "COMMISSIONS");
    tableRow(doc, [
      { text: "Recipient", width: 130, bold: true },
      { text: "Role", width: 80, bold: true },
      { text: "Rate", width: 50, bold: true },
      { text: "Basis", width: 70, align: "right", bold: true },
      { text: "Amount", width: 80, align: "right", bold: true },
    ]);
    drawLine(doc);
    for (const c of data.commissions) {
      tableRow(doc, [
        { text: c.recipientName || "", width: 130 },
        { text: c.recipientRole || "", width: 80 },
        { text: c.rate ? `${c.rate}%` : "", width: 50 },
        { text: c.basisAmount ? fmtCurrency(parseAmt(c.basisAmount)) : "", width: 70, align: "right" },
        { text: fmtCurrency(parseAmt(c.amount)), width: 80, align: "right" },
      ]);
    }
  }
}

function renderWires(doc: PDFKit.PDFDocument, data: ClosingData) {
  if (data.wires.length === 0) return;
  if (doc.y > doc.page.height - 150) doc.addPage();

  sectionHeader(doc, "WIRE TRANSFERS");
  tableRow(doc, [
    { text: "Reference", width: 130, bold: true },
    { text: "Bank", width: 90, bold: true },
    { text: "ABA/Account", width: 100, bold: true },
    { text: "Status", width: 60, bold: true },
    { text: "Amount", width: 80, align: "right", bold: true },
  ]);
  drawLine(doc);
  for (const w of data.wires) {
    tableRow(doc, [
      { text: w.reference || "", width: 130 },
      { text: w.bankName || "", width: 90 },
      { text: [w.routingNumber, w.accountNumber].filter(Boolean).join(" / ") || "", width: 100 },
      { text: (w.status || "pending").replace(/_/g, " "), width: 60 },
      { text: fmtCurrency(parseAmt(w.amount)), width: 80, align: "right" },
    ]);
  }
  const totalW = data.wires.reduce((s, w) => s + parseAmt(w.amount), 0);
  drawLine(doc);
  tableRow(doc, [
    { text: "TOTAL WIRES:", width: 380, bold: true },
    { text: fmtCurrency(totalW), width: 80, align: "right", bold: true },
  ]);
}

export function generateClosingStatementPDF(data: ClosingData): PDFKit.PDFDocument {
  const doc = new PDFDocument({
    size: "LETTER",
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    bufferPages: true,
    info: {
      Title: `${data.closing.title || "Closing Statement"} - ${typeLabels[data.closing.transactionType] || data.closing.transactionType}`,
      Author: "Sentinel Counsel LLP",
      Subject: "Real Estate Closing Statement",
      Keywords: "closing statement, settlement, real estate",
    },
  });

  renderCoverPage(doc, data);

  const txType = data.closing.transactionType;
  switch (txType) {
    case "hud1":
    case "hud1a":
      renderHud1Sections(doc, data);
      break;
    case "closing_disclosure":
    case "seller_closing_disclosure":
      renderCDSections(doc, data);
      break;
    case "alta_combined":
    case "alta_buyer":
    case "alta_seller":
      renderAltaSections(doc, data);
      break;
    case "sources_and_uses":
    case "construction_sources_uses":
      renderSourcesUses(doc, data);
      break;
    case "funds_flow":
      renderFundsFlow(doc, data);
      break;
    case "1031_exchange":
    case "qi_statement":
      render1031Exchange(doc, data);
      break;
    case "portfolio_settlement":
    case "capital_stack":
    case "investor_waterfall":
      renderPortfolio(doc, data);
      break;
    case "lender_funding":
    case "cmbs_funding_memo":
      renderLenderFunding(doc, data);
      break;
    default:
      renderLineItemsPage(doc, data);
      break;
  }

  renderProrations(doc, data);
  renderPayoffsEscrows(doc, data);
  renderWires(doc, data);

  const pageRange = doc.bufferedPageRange();
  if (pageRange && typeof pageRange.count === "number" && pageRange.count > 0) {
    const totalPages = pageRange.count;
    const startPage = pageRange.start || 0;
    for (let i = startPage; i < startPage + totalPages; i++) {
      doc.switchToPage(i);
      addPageFooter(doc, i - startPage + 1, totalPages, data.closing);
    }
  }

  return doc;
}
