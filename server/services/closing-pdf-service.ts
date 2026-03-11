import PDFDocument from "pdfkit";
import { format } from "date-fns";
import https from "https";
import http from "http";

interface OrgBranding {
  firmName?: string;
  firmAddress?: string;
  firmPhone?: string;
  firmEmail?: string;
  firmWebsite?: string;
  logoUrl?: string;
  logoBuffer?: Buffer;
}

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
  firmName?: string;
  firmAddress?: string;
  orgBranding?: OrgBranding;
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
  if (!val) return "";
  try { return format(new Date(val), "MM/dd/yyyy"); } catch { return val; }
}

function isAllowedLogoUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (!["https:", "http:"].includes(parsed.protocol)) return false;
    const host = parsed.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0" || host.startsWith("169.254.") || host.startsWith("10.") || host.startsWith("192.168.") || host === "[::1]") return false;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;
    return true;
  } catch {
    return false;
  }
}

async function fetchLogoBuffer(url: string): Promise<Buffer | null> {
  if (!isAllowedLogoUrl(url)) return null;
  return new Promise((resolve) => {
    const fetcher = url.startsWith("https") ? https : http;
    const req = fetcher.get(url, { timeout: 5000 }, (res) => {
      if (res.statusCode !== 200) { resolve(null); return; }
      const contentType = res.headers["content-type"] || "";
      if (!contentType.startsWith("image/")) { resolve(null); return; }
      const chunks: Buffer[] = [];
      let size = 0;
      res.on("data", (chunk: Buffer) => { size += chunk.length; if (size > 5 * 1024 * 1024) { req.destroy(); resolve(null); return; } chunks.push(chunk); });
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", () => resolve(null));
    });
    req.on("error", () => resolve(null));
    req.on("timeout", () => { req.destroy(); resolve(null); });
  });
}

function renderLogo(doc: PDFKit.PDFDocument, data: ClosingData, x: number, y: number, maxW: number, maxH: number): number {
  const logo = data.orgBranding?.logoBuffer;
  if (!logo || logo.length === 0) return 0;
  try {
    doc.image(logo, x, y, { fit: [maxW, maxH] });
    return maxH + 4;
  } catch {
    return 0;
  }
}

function renderOfficialFormHeader(doc: PDFKit.PDFDocument, data: ClosingData) {
  const firmName = getFirmName(data);
  const address = getOrgAddress(data);
  const contact = getOrgContact(data);
  const startY = doc.y;
  const logoHeight = renderLogo(doc, data, doc.page.width - 50 - 60, 50, 60, 30);
  doc.fontSize(7).font("Helvetica").fillColor("#666666");
  doc.text(firmName, 50, 50, { width: 200 });
  if (address) doc.text(address, 50, doc.y, { width: 200 });
  const contactParts = [contact.phone, contact.email].filter(Boolean);
  if (contactParts.length > 0) doc.text(contactParts.join(" | "), 50, doc.y, { width: 200 });
  doc.fillColor("#000000");
  const headerEnd = Math.max(doc.y, 50 + logoHeight);
  doc.y = headerEnd + 2;
  drawLine(doc);
  doc.y += 4;
}

function getFirmName(data: ClosingData): string {
  if (data.orgBranding?.firmName) return data.orgBranding.firmName;
  if (data.firmName) return data.firmName;
  const titleCo = data.parties.find(p => p.role === "title_company" || p.role === "settlement_agent" || p.role === "escrow_agent");
  if (titleCo) return titleCo.company || titleCo.name;
  return "Settlement Agent";
}

function getOrgAddress(data: ClosingData): string {
  if (data.orgBranding?.firmAddress) return data.orgBranding.firmAddress;
  if (data.firmAddress) return data.firmAddress;
  const titleCo = data.parties.find(p => p.role === "title_company" || p.role === "settlement_agent" || p.role === "escrow_agent");
  return titleCo?.address || "";
}

function getOrgContact(data: ClosingData): { phone?: string; email?: string; website?: string } {
  if (data.orgBranding) {
    return { phone: data.orgBranding.firmPhone, email: data.orgBranding.firmEmail, website: data.orgBranding.firmWebsite };
  }
  const titleCo = data.parties.find(p => p.role === "title_company" || p.role === "settlement_agent" || p.role === "escrow_agent");
  return { phone: titleCo?.phone, email: titleCo?.email };
}

function addPageFooter(doc: PDFKit.PDFDocument, pageNum: number, totalPages: number, closing: any, firmName: string) {
  const y = doc.page.height - 30;
  doc.save();
  doc.fontSize(7).font("Helvetica").fillColor("#999999");
  doc.text(`Page ${pageNum} of ${totalPages}`, 50, y, { align: "center", width: doc.page.width - 100 });
  doc.text(`${closing.title || "Closing Statement"} | File #${closing.fileNumber || "N/A"} | ${firmName} | ${format(new Date(), "MM/dd/yyyy")}`, 50, y + 8, { align: "center", width: doc.page.width - 100 });
  doc.restore();
  doc.fillColor("#000000");
}

function drawLine(doc: PDFKit.PDFDocument, y?: number) {
  const lineY = y ?? doc.y;
  doc.save();
  doc.moveTo(50, lineY).lineTo(doc.page.width - 50, lineY).strokeColor("#cccccc").lineWidth(0.5).stroke();
  doc.restore();
}

function drawBox(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number) {
  doc.save();
  doc.rect(x, y, w, h).strokeColor("#333333").lineWidth(0.5).stroke();
  doc.restore();
}

function drawBoxFill(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number, color: string) {
  doc.save();
  doc.rect(x, y, w, h).fillColor(color).fill().strokeColor("#333333").lineWidth(0.5).stroke();
  doc.restore();
  doc.fillColor("#000000");
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

function renderFormField(doc: PDFKit.PDFDocument, label: string, value: string, x: number, y: number, w: number, h: number = 20) {
  drawBox(doc, x, y, w, h);
  doc.fontSize(6).font("Helvetica").fillColor("#666666").text(label, x + 2, y + 1, { width: w - 4 });
  doc.fontSize(8).font("Helvetica").fillColor("#000000").text(value || "", x + 2, y + 8, { width: w - 4 });
}

function renderFirmBranding(doc: PDFKit.PDFDocument, data: ClosingData) {
  const firmName = getFirmName(data);
  const address = getOrgAddress(data);
  const contact = getOrgContact(data);
  const hasLogo = data.orgBranding?.logoBuffer && data.orgBranding.logoBuffer.length > 0;

  const brandingHeight = hasLogo ? 60 : 40;
  drawBoxFill(doc, 50, doc.y, doc.page.width - 100, brandingHeight, "#1a365d");
  const brandY = doc.y;

  if (hasLogo) {
    renderLogo(doc, data, 60, brandY + 5, 50, 50);
  }

  const textX = hasLogo ? 120 : 50;
  const textW = hasLogo ? doc.page.width - 170 : doc.page.width - 100;
  doc.fontSize(14).font("Helvetica-Bold").fillColor("#ffffff").text(firmName.toUpperCase(), textX, brandY + (hasLogo ? 8 : 5), { align: hasLogo ? "left" : "center", width: textW });
  if (address) {
    doc.fontSize(8).font("Helvetica").text(address, textX, brandY + (hasLogo ? 25 : 22), { align: hasLogo ? "left" : "center", width: textW });
  }
  const contactParts = [contact.phone, contact.email, contact.website].filter(Boolean);
  if (contactParts.length > 0) {
    doc.fontSize(7).text(contactParts.join(" | "), textX, brandY + (hasLogo ? 36 : 31), { align: hasLogo ? "left" : "center", width: textW });
  }
  doc.fillColor("#000000");
  doc.y = brandY + brandingHeight + 4;
}

function renderCoverPage(doc: PDFKit.PDFDocument, data: ClosingData) {
  const c = data.closing;
  const typeLabel = typeLabels[c.transactionType] || c.transactionType;
  const firmName = getFirmName(data);

  doc.moveDown(2);
  renderFirmBranding(doc, data);
  doc.moveDown(0.3);
  doc.fontSize(8).fillColor("#999999").text("CONFIDENTIAL", { align: "center" });
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
    ["Closing Date:", fmtDate(c.closingDate) || "N/A"],
    ["Disbursement Date:", fmtDate(c.disbursementDate) || "N/A"],
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
      doc.text(`${(p.role || "party").replace(/_/g, " ").toUpperCase()}: ${p.name}${p.company ? ` (${p.company})` : ""}`, 130);
    }
  }

  doc.moveDown(3);
  doc.fontSize(8).fillColor("#999999").text(`Generated: ${format(new Date(), "MMMM d, yyyy 'at' h:mm a")}`, { align: "center" });
  doc.fillColor("#000000");
}

function renderLineItemsPage(doc: PDFKit.PDFDocument, data: ClosingData) {
  doc.addPage();

  sectionHeader(doc, "LINE ITEMS");

  const colWidths = { num: 35, desc: 200, category: 90, side: 70, amount: 90 };

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

function renderHudSectionItems(doc: PDFKit.PDFDocument, items: any[], sectionNum: string, sectionLabel: string) {
  const boxY = doc.y;
  drawBoxFill(doc, 50, boxY, doc.page.width - 100, 16, "#e8edf3");
  doc.fontSize(8).font("Helvetica-Bold").fillColor("#1a365d")
    .text(`${sectionNum}. ${sectionLabel}`, 55, boxY + 3, { width: doc.page.width - 110 });
  doc.fillColor("#000000");
  doc.y = boxY + 18;

  if (items.length === 0) {
    doc.fontSize(7.5).font("Helvetica").fillColor("#888888").text("(No items entered)", 60);
    doc.fillColor("#000000");
    doc.moveDown(0.2);
    return 0;
  }

  let sectionTotal = 0;
  for (const item of items) {
    if (doc.y > doc.page.height - 50) doc.addPage();
    const amt = parseAmt(item.amount);
    sectionTotal += amt;
    const y = doc.y;
    doc.fontSize(7.5).font("Helvetica");
    doc.text(item.lineNumber || "", 55, y, { width: 35 });
    doc.text(item.description || "", 90, y, { width: 290 });
    doc.text(fmtCurrency(amt), 395, y, { width: 80, align: "right" });
    doc.y = y + 12;
  }

  const totalY = doc.y;
  drawLine(doc, totalY);
  doc.y = totalY + 2;
  doc.fontSize(7.5).font("Helvetica-Bold");
  doc.text(`Section ${sectionNum} Total:`, 90, doc.y, { width: 290 });
  doc.text(fmtCurrency(sectionTotal), 395, doc.y - 12, { width: 80, align: "right" });
  doc.y = totalY + 14;
  return sectionTotal;
}

function renderHud1Sections(doc: PDFKit.PDFDocument, data: ClosingData, firstPage = false) {
  const c = data.closing;
  const firmName = getFirmName(data);
  const borrower = data.parties.find(p => p.role === "buyer" || p.role === "borrower");
  const seller = data.parties.find(p => p.role === "seller");
  const lender = data.parties.find(p => p.role === "lender");

  if (!firstPage) doc.addPage();
  renderOfficialFormHeader(doc, data);
  drawBoxFill(doc, 50, doc.y, doc.page.width - 100, 24, "#1a365d");
  const hudTitleY = doc.y;
  doc.fontSize(10).font("Helvetica-Bold").fillColor("#ffffff")
    .text("U.S. DEPARTMENT OF HOUSING AND URBAN DEVELOPMENT", 50, hudTitleY + 3, { align: "center", width: doc.page.width - 100 });
  doc.fillColor("#000000");
  doc.y = hudTitleY + 27;
  doc.fontSize(14).font("Helvetica-Bold").text("SETTLEMENT STATEMENT (HUD-1)", { align: "center" });
  doc.moveDown(0.2);
  doc.fontSize(7).font("Helvetica").fillColor("#666666")
    .text("OMB Approval No. 2502-0265", { align: "center" });
  doc.fillColor("#000000");
  doc.moveDown(0.5);

  const leftX = 50;
  const midX = (doc.page.width / 2) + 5;
  const halfW = (doc.page.width - 110) / 2;
  let fy = doc.y;

  const fieldH = 28;
  renderFormField(doc, "A. Settlement Agent", firmName, leftX, fy, halfW, fieldH);
  renderFormField(doc, "B. File Number", c.fileNumber || "", midX, fy, halfW, fieldH);
  fy += fieldH + 2;
  renderFormField(doc, "C. Property Location", c.propertyAddress || "", leftX, fy, doc.page.width - 100, fieldH);
  fy += fieldH + 2;
  renderFormField(doc, "D. Borrower", borrower?.name || "", leftX, fy, halfW / 1.5, fieldH);
  renderFormField(doc, "E. Seller", seller?.name || "", leftX + halfW / 1.5 + 5, fy, halfW / 1.5, fieldH);
  renderFormField(doc, "F. Lender", lender?.name || "", leftX + (halfW / 1.5 + 5) * 2, fy, halfW / 1.2, fieldH);
  fy += fieldH + 2;
  renderFormField(doc, "G. Settlement Date", fmtDate(c.closingDate), leftX, fy, halfW, fieldH);
  renderFormField(doc, "H. Disbursement Date", fmtDate(c.disbursementDate), midX, fy, halfW, fieldH);
  fy += fieldH + 4;
  doc.y = fy;

  drawBoxFill(doc, 50, doc.y, doc.page.width - 100, 18, "#1a365d");
  doc.fontSize(9).font("Helvetica-Bold").fillColor("#ffffff")
    .text("J. SUMMARY OF BORROWER'S TRANSACTION", 55, doc.y + 4, { width: doc.page.width - 110 });
  doc.fillColor("#000000");
  doc.y += 20;

  const jSections = [
    { num: "100", label: "GROSS AMOUNT DUE FROM BORROWER" },
    { num: "200", label: "AMOUNTS PAID BY/ON BEHALF OF BORROWER" },
    { num: "300", label: "CASH AT SETTLEMENT FROM/TO BORROWER" },
  ];
  let gross100 = 0, paid200 = 0;
  for (const sec of jSections) {
    const items = data.lineItems.filter(li => li.hudSection === sec.num);
    const total = renderHudSectionItems(doc, items, sec.num, sec.label);
    if (sec.num === "100") gross100 = total;
    if (sec.num === "200") paid200 = total;
  }

  if (doc.y > doc.page.height - 60) doc.addPage();
  drawBoxFill(doc, 50, doc.y, doc.page.width - 100, 14, "#f0f4f8");
  doc.fontSize(8).font("Helvetica-Bold")
    .text("CASH FROM BORROWER:", 55, doc.y + 2)
    .text(fmtCurrency(gross100 - paid200), 395, doc.y - 10, { width: 80, align: "right" });
  doc.y += 18;

  doc.addPage();
  drawBoxFill(doc, 50, 45, doc.page.width - 100, 18, "#1a365d");
  doc.fontSize(9).font("Helvetica-Bold").fillColor("#ffffff")
    .text("K. SUMMARY OF SELLER'S TRANSACTION", 55, 49, { width: doc.page.width - 110 });
  doc.fillColor("#000000");
  doc.y = 66;

  const kSections = [
    { num: "400", label: "GROSS AMOUNT DUE TO SELLER" },
    { num: "500", label: "REDUCTIONS IN AMOUNT DUE TO SELLER" },
    { num: "600", label: "CASH AT SETTLEMENT TO/FROM SELLER" },
  ];
  let gross400 = 0, red500 = 0;
  for (const sec of kSections) {
    const items = data.lineItems.filter(li => li.hudSection === sec.num);
    const total = renderHudSectionItems(doc, items, sec.num, sec.label);
    if (sec.num === "400") gross400 = total;
    if (sec.num === "500") red500 = total;
  }

  if (doc.y > doc.page.height - 60) doc.addPage();
  drawBoxFill(doc, 50, doc.y, doc.page.width - 100, 14, "#f0f4f8");
  doc.fontSize(8).font("Helvetica-Bold")
    .text("CASH TO SELLER:", 55, doc.y + 2)
    .text(fmtCurrency(gross400 - red500), 395, doc.y - 10, { width: 80, align: "right" });
  doc.y += 18;

  doc.addPage();
  drawBoxFill(doc, 50, 45, doc.page.width - 100, 18, "#1a365d");
  doc.fontSize(9).font("Helvetica-Bold").fillColor("#ffffff")
    .text("L. SETTLEMENT CHARGES", 55, 49, { width: doc.page.width - 110 });
  doc.fillColor("#000000");
  doc.y = 66;

  const lSections = [
    { num: "700", label: "TOTAL REAL ESTATE BROKER FEES" },
    { num: "800", label: "ITEMS PAYABLE IN CONNECTION WITH LOAN" },
    { num: "900", label: "ITEMS REQUIRED BY LENDER TO BE PAID IN ADVANCE" },
    { num: "1000", label: "RESERVES DEPOSITED WITH LENDER" },
    { num: "1100", label: "TITLE CHARGES" },
    { num: "1200", label: "GOVERNMENT RECORDING AND TRANSFER CHARGES" },
    { num: "1300", label: "ADDITIONAL SETTLEMENT CHARGES" },
  ];
  let totalCharges = 0;
  for (const sec of lSections) {
    const items = data.lineItems.filter(li => li.hudSection === sec.num);
    totalCharges += renderHudSectionItems(doc, items, sec.num, sec.label);
  }

  if (doc.y > doc.page.height - 60) doc.addPage();
  drawBoxFill(doc, 50, doc.y, doc.page.width - 100, 16, "#f0f4f8");
  doc.fontSize(9).font("Helvetica-Bold")
    .text("TOTAL SETTLEMENT CHARGES:", 55, doc.y + 3)
    .text(fmtCurrency(totalCharges), 395, doc.y - 9, { width: 80, align: "right" });
  doc.y += 20;

  doc.moveDown(0.5);
  doc.fontSize(7).font("Helvetica").fillColor("#666666");
  doc.text("I have carefully reviewed the HUD-1 Settlement Statement and to the best of my knowledge and belief, it is a true and accurate account of this transaction.", 50, doc.y, { width: doc.page.width - 100 });
  doc.fillColor("#000000");
  doc.moveDown(1.5);

  const sigY = doc.y;
  drawLine(doc, sigY);
  doc.fontSize(7).font("Helvetica").text("Borrower Signature", 55, sigY + 2);
  drawLine(doc, sigY);
  doc.text("Date", 300, sigY + 2);
  doc.y = sigY + 20;
  drawLine(doc, doc.y);
  doc.fontSize(7).font("Helvetica").text("Seller Signature", 55, doc.y + 2);
  doc.text("Date", 300, doc.y + 2);
  doc.y += 20;
  drawLine(doc, doc.y);
  doc.fontSize(7).font("Helvetica").text("Settlement Agent Signature", 55, doc.y + 2);
  doc.text("Date", 300, doc.y + 2);
}

function renderHud1aSections(doc: PDFKit.PDFDocument, data: ClosingData, firstPage = false) {
  const c = data.closing;
  const firmName = getFirmName(data);
  const borrower = data.parties.find(p => p.role === "buyer" || p.role === "borrower");
  const lender = data.parties.find(p => p.role === "lender");

  if (!firstPage) doc.addPage();
  renderOfficialFormHeader(doc, data);
  drawBoxFill(doc, 50, doc.y, doc.page.width - 100, 24, "#1a365d");
  const hud1aTitleY = doc.y;
  doc.fontSize(10).font("Helvetica-Bold").fillColor("#ffffff")
    .text("U.S. DEPARTMENT OF HOUSING AND URBAN DEVELOPMENT", 50, hud1aTitleY + 3, { align: "center", width: doc.page.width - 100 });
  doc.fillColor("#000000");
  doc.y = hud1aTitleY + 27;
  doc.fontSize(14).font("Helvetica-Bold").text("SETTLEMENT STATEMENT (HUD-1A)", { align: "center" });
  doc.moveDown(0.2);
  doc.fontSize(7).font("Helvetica").fillColor("#666666")
    .text("For Refinance and Subordinate Lien Transactions Only", { align: "center" });
  doc.fillColor("#000000");
  doc.moveDown(0.5);

  const halfW = (doc.page.width - 110) / 2;
  let fy = doc.y;
  renderFormField(doc, "A. Settlement Agent", firmName, 50, fy, halfW, 28);
  renderFormField(doc, "B. File Number", c.fileNumber || "", (doc.page.width / 2) + 5, fy, halfW, 28);
  fy += 32;
  renderFormField(doc, "C. Property Location", c.propertyAddress || "", 50, fy, doc.page.width - 100, 28);
  fy += 32;
  renderFormField(doc, "D. Borrower", borrower?.name || "", 50, fy, halfW, 28);
  renderFormField(doc, "E. Lender", lender?.name || lender?.company || "", (doc.page.width / 2) + 5, fy, halfW, 28);
  fy += 32;
  renderFormField(doc, "F. Settlement Date", fmtDate(c.closingDate), 50, fy, halfW / 2, 28);
  renderFormField(doc, "G. Loan Amount", fmtCurrency(parseAmt(c.loanAmount)), 50 + halfW / 2 + 4, fy, halfW / 2, 28);
  renderFormField(doc, "H. Disbursement Date", fmtDate(c.disbursementDate), (doc.page.width / 2) + 5, fy, halfW, 28);
  fy += 34;
  doc.y = fy;

  drawBoxFill(doc, 50, doc.y, doc.page.width - 100, 18, "#1a365d");
  doc.fontSize(9).font("Helvetica-Bold").fillColor("#ffffff")
    .text("SETTLEMENT CHARGES (Sections 700-1300)", 55, doc.y + 4, { width: doc.page.width - 110 });
  doc.fillColor("#000000");
  doc.y += 20;

  const hud1aSections = [
    { num: "700", label: "TOTAL REAL ESTATE BROKER FEES" },
    { num: "800", label: "ITEMS PAYABLE IN CONNECTION WITH LOAN" },
    { num: "900", label: "ITEMS REQUIRED BY LENDER TO BE PAID IN ADVANCE" },
    { num: "1000", label: "RESERVES DEPOSITED WITH LENDER" },
    { num: "1100", label: "TITLE CHARGES" },
    { num: "1200", label: "GOVERNMENT RECORDING AND TRANSFER CHARGES" },
    { num: "1300", label: "ADDITIONAL SETTLEMENT CHARGES" },
  ];

  let totalCharges = 0;
  for (const sec of hud1aSections) {
    const items = data.lineItems.filter(li => li.hudSection === sec.num);
    totalCharges += renderHudSectionItems(doc, items, sec.num, sec.label);
  }

  if (doc.y > doc.page.height - 60) doc.addPage();
  drawBoxFill(doc, 50, doc.y, doc.page.width - 100, 16, "#f0f4f8");
  doc.fontSize(9).font("Helvetica-Bold")
    .text("1400. TOTAL SETTLEMENT CHARGES:", 55, doc.y + 3)
    .text(fmtCurrency(totalCharges), 410, doc.y - 9, { width: 80, align: "right" });
  doc.y += 20;

  doc.moveDown(0.5);
  drawBoxFill(doc, 50, doc.y, doc.page.width - 100, 18, "#1a365d");
  doc.fontSize(9).font("Helvetica-Bold").fillColor("#ffffff")
    .text("LOAN DISBURSEMENT", 55, doc.y + 4, { width: doc.page.width - 110 });
  doc.fillColor("#000000");
  doc.y += 20;

  const loanAmt = parseAmt(c.loanAmount);
  const disbursementItems = [
    { label: "1500. Gross Amount Due from Borrower (Loan Amount)", amount: loanAmt },
    { label: "1501. Less: Total Settlement Charges (Line 1400)", amount: -totalCharges },
  ];
  const netDisbursement = loanAmt - totalCharges;

  for (const item of disbursementItems) {
    const y = doc.y;
    doc.fontSize(8).font("Helvetica");
    doc.text(item.label, 55, y, { width: 360 });
    doc.text(fmtCurrency(Math.abs(item.amount)), 410, y, { width: 80, align: "right" });
    doc.y = y + 14;
  }
  drawLine(doc);
  const netY = doc.y;
  doc.fontSize(8.5).font("Helvetica-Bold");
  doc.text("1502. Cash to/from Borrower:", 55, netY, { width: 360 });
  doc.text(fmtCurrency(netDisbursement), 410, netY, { width: 80, align: "right" });
  doc.y = netY + 18;

  if (doc.y > doc.page.height - 80) doc.addPage();
  doc.moveDown(1);
  doc.fontSize(7).font("Helvetica").fillColor("#666666");
  doc.text("I have carefully reviewed the HUD-1A Settlement Statement and to the best of my knowledge and belief, it is a true and accurate account of this transaction.", 50, doc.y, { width: doc.page.width - 100 });
  doc.fillColor("#000000");
  doc.moveDown(1.5);
  const sigY = doc.y;
  drawLine(doc, sigY);
  doc.fontSize(7).font("Helvetica").text("Borrower Signature", 55, sigY + 2);
  doc.text("Date", 300, sigY + 2);
  doc.y = sigY + 25;
  drawLine(doc, doc.y);
  doc.fontSize(7).font("Helvetica").text("Settlement Agent Signature", 55, doc.y + 2);
  doc.text("Date", 300, doc.y + 2);
}

function renderCDPage1(doc: PDFKit.PDFDocument, data: ClosingData) {
  const c = data.closing;
  const borrower = data.parties.find(p => p.role === "buyer" || p.role === "borrower");
  const seller = data.parties.find(p => p.role === "seller");
  const lender = data.parties.find(p => p.role === "lender");

  drawBoxFill(doc, 50, 45, doc.page.width - 100, 22, "#1a365d");
  doc.fontSize(12).font("Helvetica-Bold").fillColor("#ffffff")
    .text("CLOSING DISCLOSURE", 50, 49, { align: "center", width: doc.page.width - 100 });
  doc.fillColor("#000000");
  doc.y = 70;

  doc.fontSize(7).font("Helvetica").fillColor("#666666")
    .text("This form is a statement of final loan terms and closing costs. Compare this document with your Loan Estimate.", { align: "center" });
  doc.fillColor("#000000");
  doc.moveDown(0.4);

  const halfW = (doc.page.width - 110) / 2;
  let fy = doc.y;
  renderFormField(doc, "Closing Date", fmtDate(c.closingDate), 50, fy, halfW / 2, 24);
  renderFormField(doc, "Disbursement Date", fmtDate(c.disbursementDate), 50 + halfW / 2 + 4, fy, halfW / 2, 24);
  renderFormField(doc, "File #", c.fileNumber || "", (doc.page.width / 2) + 5, fy, halfW, 24);
  fy += 28;
  renderFormField(doc, "Property", c.propertyAddress || "", 50, fy, doc.page.width - 100, 24);
  fy += 28;
  renderFormField(doc, "Borrower", borrower?.name || "", 50, fy, halfW, 24);
  renderFormField(doc, "Seller", seller?.name || "", (doc.page.width / 2) + 5, fy, halfW, 24);
  fy += 28;
  renderFormField(doc, "Lender", lender?.name || lender?.company || "", 50, fy, halfW, 24);
  renderFormField(doc, "Sale Price", fmtCurrency(parseAmt(c.purchasePrice)), (doc.page.width / 2) + 5, fy, halfW / 2, 24);
  renderFormField(doc, "Loan Amount", fmtCurrency(parseAmt(c.loanAmount)), (doc.page.width / 2) + halfW / 2 + 9, fy, halfW / 2, 24);
  fy += 30;
  doc.y = fy;
}

function renderCDSectionItems(doc: PDFKit.PDFDocument, items: any[], sectionLabel: string) {
  if (doc.y > doc.page.height - 80) doc.addPage();
  const headerY = doc.y;
  drawBoxFill(doc, 55, headerY, doc.page.width - 110, 14, "#f0f4f8");
  doc.fontSize(8).font("Helvetica-Bold").text(sectionLabel, 60, headerY + 3, { width: doc.page.width - 120 });
  doc.y = headerY + 16;

  if (items.length === 0) {
    doc.fontSize(7.5).font("Helvetica").fillColor("#888888").text("(No items entered)", 60);
    doc.fillColor("#000000");
    doc.moveDown(0.2);
    return 0;
  }

  let total = 0;
  for (const item of items) {
    if (doc.y > doc.page.height - 50) doc.addPage();
    const amt = parseAmt(item.amount);
    total += amt;
    const y = doc.y;
    doc.fontSize(7.5).font("Helvetica");
    doc.text(item.lineNumber || "", 60, y, { width: 30 });
    doc.text(item.description || "", 90, y, { width: 310 });
    doc.text(fmtCurrency(amt), 410, y, { width: 80, align: "right" });
    doc.y = y + 12;
  }
  drawLine(doc);
  doc.moveDown(0.1);
  const ty = doc.y;
  doc.fontSize(7.5).font("Helvetica-Bold");
  doc.text(`${sectionLabel} Total:`, 90, ty, { width: 310 });
  doc.text(fmtCurrency(total), 410, ty, { width: 80, align: "right" });
  doc.y = ty + 14;
  return total;
}

function cdFilterItems(data: ClosingData, ...keys: string[]): any[] {
  return data.lineItems.filter(li => keys.includes((li as any).cdSection));
}

function renderCDSections(doc: PDFKit.PDFDocument, data: ClosingData, firstPage = false) {
  const c = data.closing;
  const firmName = getFirmName(data);

  if (!firstPage) doc.addPage();
  renderOfficialFormHeader(doc, data);
  renderCDPage1(doc, data);

  drawBoxFill(doc, 50, doc.y, doc.page.width - 100, 14, "#e8edf3");
  doc.fontSize(8).font("Helvetica-Bold").fillColor("#1a365d")
    .text("PAGE 1 OF 5 — LOAN TERMS", 55, doc.y + 2, { width: doc.page.width - 110 });
  doc.fillColor("#000000");
  doc.y += 16;

  renderCDSectionItems(doc, cdFilterItems(data, "loan_terms"), "LOAN TERMS");

  const loanAmt = parseAmt(c.loanAmount);
  if (loanAmt > 0) {
    doc.moveDown(0.3);
    const boxY = doc.y;
    drawBox(doc, 55, boxY, doc.page.width - 110, 50);
    doc.fontSize(7).font("Helvetica-Bold").text("Loan Amount", 60, boxY + 3);
    doc.fontSize(9).font("Helvetica").text(fmtCurrency(loanAmt), 60, boxY + 14);
    doc.fontSize(7).font("Helvetica-Bold").text("Interest Rate", 200, boxY + 3);
    doc.fontSize(9).font("Helvetica").text("See Loan Estimate", 200, boxY + 14);
    doc.fontSize(7).font("Helvetica-Bold").text("Loan Purpose", 360, boxY + 3);
    doc.fontSize(9).font("Helvetica").text("Purchase", 360, boxY + 14);
    doc.fontSize(7).font("Helvetica-Bold").text("Loan Product", 60, boxY + 30);
    doc.fontSize(9).font("Helvetica").text("See Loan Estimate", 60, boxY + 38);
    doc.y = boxY + 54;
  }

  doc.addPage();
  drawBoxFill(doc, 50, 45, doc.page.width - 100, 14, "#e8edf3");
  doc.fontSize(8).font("Helvetica-Bold").fillColor("#1a365d")
    .text("PAGE 2 OF 5 — PROJECTED PAYMENTS", 55, 47, { width: doc.page.width - 110 });
  doc.fillColor("#000000");
  doc.y = 62;

  renderCDSectionItems(doc, cdFilterItems(data, "projected_payments"), "PROJECTED PAYMENTS");
  doc.moveDown(0.5);
  renderCDSectionItems(doc, cdFilterItems(data, "closing_costs", "costs_at_closing"), "COSTS AT CLOSING");

  doc.addPage();
  drawBoxFill(doc, 50, 45, doc.page.width - 100, 14, "#e8edf3");
  doc.fontSize(8).font("Helvetica-Bold").fillColor("#1a365d")
    .text("PAGE 3 OF 5 — CLOSING COST DETAILS", 55, 47, { width: doc.page.width - 110 });
  doc.fillColor("#000000");
  doc.y = 62;

  const closingCostSections = [
    { keys: ["origination_charges"], label: "A. ORIGINATION CHARGES" },
    { keys: ["services_not_shopped"], label: "B. SERVICES BORROWER DID NOT SHOP FOR" },
    { keys: ["services_shopped"], label: "C. SERVICES BORROWER DID SHOP FOR" },
    { keys: ["taxes_govt", "government_fees"], label: "D. TAXES AND OTHER GOVERNMENT FEES" },
    { keys: ["prepaids"], label: "E. PREPAIDS" },
    { keys: ["initial_escrow", "escrow_at_closing"], label: "F. INITIAL ESCROW PAYMENT AT CLOSING" },
    { keys: ["other_costs", "other"], label: "G. OTHER" },
    { keys: ["total_closing_costs"], label: "H. TOTAL CLOSING COSTS (Borrower-Paid)" },
  ];

  let totalAllClosingCosts = 0;
  for (const sec of closingCostSections) {
    const items = data.lineItems.filter(li => sec.keys.includes((li as any).cdSection));
    if (items.length > 0) {
      totalAllClosingCosts += renderCDSectionItems(doc, items, sec.label);
      doc.moveDown(0.2);
    }
  }

  const unallocatedCosts = data.lineItems.filter(li =>
    (li as any).cdSection === "closing_costs" &&
    !closingCostSections.some(sec => sec.keys.includes((li as any).cdSection))
  );
  if (unallocatedCosts.length > 0) {
    totalAllClosingCosts += renderCDSectionItems(doc, unallocatedCosts, "CLOSING COSTS (General)");
  }

  if (doc.y > doc.page.height - 40) doc.addPage();
  drawBoxFill(doc, 50, doc.y, doc.page.width - 100, 16, "#f0f4f8");
  doc.fontSize(8.5).font("Helvetica-Bold")
    .text("TOTAL CLOSING COSTS:", 55, doc.y + 3)
    .text(fmtCurrency(totalAllClosingCosts), 410, doc.y - 9, { width: 80, align: "right" });
  doc.y += 20;

  doc.addPage();
  drawBoxFill(doc, 50, 45, doc.page.width - 100, 14, "#e8edf3");
  doc.fontSize(8).font("Helvetica-Bold").fillColor("#1a365d")
    .text("PAGE 4 OF 5 — CALCULATING CASH TO CLOSE", 55, 47, { width: doc.page.width - 110 });
  doc.fillColor("#000000");
  doc.y = 62;

  renderCDSectionItems(doc, cdFilterItems(data, "cash_to_close"), "CALCULATING CASH TO CLOSE");
  doc.moveDown(0.5);
  renderCDSectionItems(doc, cdFilterItems(data, "summaries", "summaries_borrower"), "SUMMARIES OF TRANSACTIONS — BORROWER'S TRANSACTION");

  const borrowerDebits = data.lineItems.filter(li => li.side === "buyer_debit");
  const borrowerCredits = data.lineItems.filter(li => li.side === "buyer_credit");
  if (borrowerDebits.length > 0 || borrowerCredits.length > 0) {
    const totalDebits = borrowerDebits.reduce((s, i) => s + parseAmt(i.amount), 0);
    const totalCredits = borrowerCredits.reduce((s, i) => s + parseAmt(i.amount), 0);
    doc.moveDown(0.3);
    drawBoxFill(doc, 55, doc.y, doc.page.width - 110, 26, "#f0f4f8");
    const bsY = doc.y;
    doc.fontSize(7.5).font("Helvetica-Bold")
      .text("Due from Borrower at Closing:", 60, bsY + 3)
      .text(fmtCurrency(totalDebits), 410, bsY + 3, { width: 80, align: "right" })
      .text("Paid Already by/on Behalf of Borrower:", 60, bsY + 14)
      .text(`(${fmtCurrency(totalCredits)})`, 410, bsY + 14, { width: 80, align: "right" });
    doc.y = bsY + 30;
  }

  doc.addPage();
  drawBoxFill(doc, 50, 45, doc.page.width - 100, 14, "#e8edf3");
  doc.fontSize(8).font("Helvetica-Bold").fillColor("#1a365d")
    .text("PAGE 5 OF 5 — SELLER'S TRANSACTION & ADDITIONAL INFORMATION", 55, 47, { width: doc.page.width - 110 });
  doc.fillColor("#000000");
  doc.y = 62;

  renderCDSectionItems(doc, cdFilterItems(data, "summaries", "summaries_seller"), "SUMMARIES OF TRANSACTIONS — SELLER'S TRANSACTION");

  const sellerCredits = data.lineItems.filter(li => li.side === "seller_credit");
  const sellerDebits = data.lineItems.filter(li => li.side === "seller_debit");
  if (sellerCredits.length > 0 || sellerDebits.length > 0) {
    const totalSC = sellerCredits.reduce((s, i) => s + parseAmt(i.amount), 0);
    const totalSD = sellerDebits.reduce((s, i) => s + parseAmt(i.amount), 0);
    doc.moveDown(0.3);
    drawBoxFill(doc, 55, doc.y, doc.page.width - 110, 26, "#f0f4f8");
    const ssY = doc.y;
    doc.fontSize(7.5).font("Helvetica-Bold")
      .text("Due to Seller at Closing:", 60, ssY + 3)
      .text(fmtCurrency(totalSC), 410, ssY + 3, { width: 80, align: "right" })
      .text("Reductions in Amount Due to Seller:", 60, ssY + 14)
      .text(`(${fmtCurrency(totalSD)})`, 410, ssY + 14, { width: 80, align: "right" });
    doc.y = ssY + 30;
  }

  doc.moveDown(0.5);
  renderCDSectionItems(doc, cdFilterItems(data, "additional_info"), "ADDITIONAL INFORMATION ABOUT THIS LOAN");

  doc.moveDown(0.5);
  if (doc.y > doc.page.height - 120) doc.addPage();
  const contactHeaderY = doc.y;
  drawBoxFill(doc, 55, contactHeaderY, doc.page.width - 110, 14, "#f0f4f8");
  doc.fontSize(8).font("Helvetica-Bold").text("CONTACT INFORMATION", 60, contactHeaderY + 3, { width: doc.page.width - 120 });
  doc.y = contactHeaderY + 16;

  for (const party of data.parties) {
    if (doc.y > doc.page.height - 30) doc.addPage();
    const pY = doc.y;
    doc.fontSize(7).font("Helvetica-Bold").text((party.role || "").replace(/_/g, " ").toUpperCase(), 60, pY, { width: 80 });
    doc.font("Helvetica").text(`${party.name}${party.company ? ` (${party.company})` : ""}`, 140, pY, { width: 200 });
    if (party.email) doc.text(party.email, 350, pY, { width: 140 });
    doc.y = pY + 12;
  }

  doc.moveDown(1);
  doc.fontSize(7).font("Helvetica").fillColor("#666666");
  doc.text("By signing, you are only confirming that you have received this form. You do not have to accept this loan because you have received this form or signed a loan application.", 50, doc.y, { width: doc.page.width - 100 });
  doc.fillColor("#000000");
  doc.moveDown(1);
  const sigY = doc.y;
  drawLine(doc, sigY);
  doc.fontSize(7).font("Helvetica").text("Applicant Signature", 55, sigY + 2);
  doc.text("Date", 300, sigY + 2);
  doc.y = sigY + 20;
  drawLine(doc, doc.y);
  doc.fontSize(7).font("Helvetica").text("Co-Applicant Signature", 55, doc.y + 2);
  doc.text("Date", 300, doc.y + 2);
}

function renderCashSettlement(doc: PDFKit.PDFDocument, data: ClosingData) {
  doc.addPage();
  const c = data.closing;
  const buyer = data.parties.find(p => p.role === "buyer" || p.role === "borrower");
  const seller = data.parties.find(p => p.role === "seller");
  const firmName = getFirmName(data);

  doc.fontSize(12).font("Helvetica-Bold").fillColor("#1a365d").text("CASH SETTLEMENT STATEMENT", { align: "center" });
  doc.fillColor("#000000");
  doc.moveDown(0.3);
  doc.fontSize(9).font("Helvetica").text(firmName, { align: "center" });
  doc.moveDown(0.5);

  const halfW = (doc.page.width - 110) / 2;
  let fy = doc.y;
  renderFormField(doc, "Buyer", buyer?.name || "", 50, fy, halfW, 24);
  renderFormField(doc, "Seller", seller?.name || "", (doc.page.width / 2) + 5, fy, halfW, 24);
  fy += 28;
  renderFormField(doc, "Property", c.propertyAddress || "", 50, fy, doc.page.width - 100, 24);
  fy += 28;
  renderFormField(doc, "Settlement Date", fmtDate(c.closingDate), 50, fy, halfW / 2, 24);
  renderFormField(doc, "Purchase Price", fmtCurrency(parseAmt(c.purchasePrice)), 50 + halfW / 2 + 4, fy, halfW / 2, 24);
  renderFormField(doc, "File Number", c.fileNumber || "", (doc.page.width / 2) + 5, fy, halfW, 24);
  fy += 30;
  doc.y = fy;

  const buyerDebits = data.lineItems.filter(li => li.side === "buyer_debit" || (li.side === "use" && li.paidBy === "buyer"));
  const buyerCredits = data.lineItems.filter(li => li.side === "buyer_credit" || (li.side === "source" && li.paidBy === "buyer"));
  const sellerDebits = data.lineItems.filter(li => li.side === "seller_debit" || (li.side === "use" && li.paidBy === "seller"));
  const sellerCredits = data.lineItems.filter(li => li.side === "seller_credit" || (li.side === "source" && li.paidBy === "seller"));

  sectionHeader(doc, "BUYER'S STATEMENT");
  doc.fontSize(8.5).font("Helvetica-Bold").text("Debits (Buyer Charges):", 55);
  doc.moveDown(0.2);
  for (const item of buyerDebits) {
    tableRow(doc, [
      { text: item.description || "", width: 380 },
      { text: fmtCurrency(parseAmt(item.amount)), width: 100, align: "right" },
    ]);
  }
  const totalBuyerDebits = buyerDebits.reduce((s, i) => s + parseAmt(i.amount), 0);
  drawLine(doc);
  tableRow(doc, [{ text: "Total Buyer Debits:", width: 380, bold: true }, { text: fmtCurrency(totalBuyerDebits), width: 100, align: "right", bold: true }]);

  doc.moveDown(0.3);
  doc.fontSize(8.5).font("Helvetica-Bold").text("Credits (Buyer Credits):", 55);
  doc.moveDown(0.2);
  for (const item of buyerCredits) {
    tableRow(doc, [
      { text: item.description || "", width: 380 },
      { text: fmtCurrency(parseAmt(item.amount)), width: 100, align: "right" },
    ]);
  }
  const totalBuyerCredits = buyerCredits.reduce((s, i) => s + parseAmt(i.amount), 0);
  drawLine(doc);
  tableRow(doc, [{ text: "Total Buyer Credits:", width: 380, bold: true }, { text: fmtCurrency(totalBuyerCredits), width: 100, align: "right", bold: true }]);

  drawBoxFill(doc, 50, doc.y, doc.page.width - 100, 16, "#f0f4f8");
  doc.fontSize(8.5).font("Helvetica-Bold")
    .text("CASH DUE FROM BUYER:", 55, doc.y + 3)
    .text(fmtCurrency(totalBuyerDebits - totalBuyerCredits), 395, doc.y - 9, { width: 80, align: "right" });
  doc.y += 20;

  if (doc.y > doc.page.height - 200) doc.addPage();
  sectionHeader(doc, "SELLER'S STATEMENT");
  doc.fontSize(8.5).font("Helvetica-Bold").text("Credits (Seller Proceeds):", 55);
  doc.moveDown(0.2);
  for (const item of sellerCredits) {
    tableRow(doc, [
      { text: item.description || "", width: 380 },
      { text: fmtCurrency(parseAmt(item.amount)), width: 100, align: "right" },
    ]);
  }
  const totalSellerCredits = sellerCredits.reduce((s, i) => s + parseAmt(i.amount), 0);
  drawLine(doc);
  tableRow(doc, [{ text: "Total Seller Credits:", width: 380, bold: true }, { text: fmtCurrency(totalSellerCredits), width: 100, align: "right", bold: true }]);

  doc.moveDown(0.3);
  doc.fontSize(8.5).font("Helvetica-Bold").text("Debits (Seller Charges):", 55);
  doc.moveDown(0.2);
  for (const item of sellerDebits) {
    tableRow(doc, [
      { text: item.description || "", width: 380 },
      { text: fmtCurrency(parseAmt(item.amount)), width: 100, align: "right" },
    ]);
  }
  const totalSellerDebits = sellerDebits.reduce((s, i) => s + parseAmt(i.amount), 0);
  drawLine(doc);
  tableRow(doc, [{ text: "Total Seller Debits:", width: 380, bold: true }, { text: fmtCurrency(totalSellerDebits), width: 100, align: "right", bold: true }]);

  drawBoxFill(doc, 50, doc.y, doc.page.width - 100, 16, "#f0f4f8");
  doc.fontSize(8.5).font("Helvetica-Bold")
    .text("CASH TO SELLER:", 55, doc.y + 3)
    .text(fmtCurrency(totalSellerCredits - totalSellerDebits), 395, doc.y - 9, { width: 80, align: "right" });
  doc.y += 20;

  if (doc.y > doc.page.height - 100) doc.addPage();
  doc.moveDown(1);
  const sigY = doc.y;
  drawLine(doc, sigY);
  doc.fontSize(7).font("Helvetica").text("Buyer Signature", 55, sigY + 2);
  doc.text("Date", 300, sigY + 2);
  doc.y = sigY + 25;
  drawLine(doc, doc.y);
  doc.fontSize(7).font("Helvetica").text("Seller Signature", 55, doc.y + 2);
  doc.text("Date", 300, doc.y + 2);
}

function isBuyerItem(li: any): boolean {
  return li.paidBy === "buyer" || li.side === "buyer_debit" || li.side === "buyer_credit" || li.side === "source";
}

function isSellerItem(li: any): boolean {
  return li.paidBy === "seller" || li.side === "seller_debit" || li.side === "seller_credit";
}

function renderAltaSections(doc: PDFKit.PDFDocument, data: ClosingData) {
  doc.addPage();
  const txType = data.closing.transactionType;
  const isCombo = txType === "alta_combined";
  const isBuyerOnly = txType === "alta_buyer";
  const isSellerOnly = txType === "alta_seller";
  const firmName = getFirmName(data);
  const buyer = data.parties.find(p => p.role === "buyer" || p.role === "borrower");
  const seller = data.parties.find(p => p.role === "seller");

  drawBoxFill(doc, 50, 45, doc.page.width - 100, 20, "#1a365d");
  doc.fontSize(10).font("Helvetica-Bold").fillColor("#ffffff")
    .text("AMERICAN LAND TITLE ASSOCIATION", 50, 48, { align: "center", width: doc.page.width - 100 });
  doc.fillColor("#000000");
  doc.y = 68;

  const variantLabel = isCombo ? "SETTLEMENT STATEMENT — COMBINED" : isBuyerOnly ? "SETTLEMENT STATEMENT — BUYER" : "SETTLEMENT STATEMENT — SELLER";
  doc.fontSize(12).font("Helvetica-Bold").text(variantLabel, { align: "center" });
  doc.moveDown(0.2);
  doc.fontSize(9).font("Helvetica").text(firmName, { align: "center" });
  doc.moveDown(0.4);

  const halfW = (doc.page.width - 110) / 2;
  let fy = doc.y;
  renderFormField(doc, "Property", data.closing.propertyAddress || "", 50, fy, doc.page.width - 100, 24);
  fy += 28;
  renderFormField(doc, "Settlement Date", fmtDate(data.closing.closingDate), 50, fy, halfW / 2, 24);
  renderFormField(doc, "Sale Price", fmtCurrency(parseAmt(data.closing.purchasePrice)), 50 + halfW / 2 + 4, fy, halfW / 2, 24);
  renderFormField(doc, "File Number", data.closing.fileNumber || "", (doc.page.width / 2) + 5, fy, halfW, 24);
  fy += 28;

  if (isCombo || isBuyerOnly) {
    renderFormField(doc, "Buyer/Borrower", buyer?.name || "", 50, fy, halfW, 24);
  }
  if (isCombo || isSellerOnly) {
    renderFormField(doc, "Seller", seller?.name || "", isCombo ? (doc.page.width / 2) + 5 : 50, fy, halfW, 24);
  }
  fy += 28;
  doc.y = fy;

  const cats = ["financial", "prorations", "commissions", "title", "taxes", "payoffs", "escrows", "other"];
  const catLabels: Record<string, string> = {
    financial: "FINANCIAL", prorations: "PRORATIONS & ADJUSTMENTS", commissions: "COMMISSIONS",
    title: "TITLE CHARGES", taxes: "GOVERNMENT & TAXES", payoffs: "PAYOFFS & LIENS",
    escrows: "ESCROW & RESERVES", other: "OTHER CHARGES",
  };

  let grandTotalDebit = 0;
  let grandTotalCredit = 0;

  if (isCombo) {
    tableRow(doc, [
      { text: "", width: 200 },
      { text: "Buyer Debit", width: 80, align: "right", bold: true },
      { text: "Buyer Credit", width: 80, align: "right", bold: true },
      { text: "Seller Debit", width: 80, align: "right", bold: true },
      { text: "Seller Credit", width: 80, align: "right", bold: true },
    ]);
    drawLine(doc);

    for (const cat of cats) {
      const allItems = data.lineItems.filter(li => (li as any).altaCategory === cat);
      if (allItems.length === 0) continue;
      sectionHeader(doc, catLabels[cat] || cat.toUpperCase());
      for (const item of allItems) {
        const amt = parseAmt(item.amount);
        const isBD = item.side === "buyer_debit";
        const isBC = item.side === "buyer_credit";
        const isSD = item.side === "seller_debit";
        const isSC = item.side === "seller_credit";
        tableRow(doc, [
          { text: item.description || "", width: 200 },
          { text: isBD ? fmtCurrency(amt) : "", width: 80, align: "right" },
          { text: isBC ? fmtCurrency(amt) : "", width: 80, align: "right" },
          { text: isSD ? fmtCurrency(amt) : "", width: 80, align: "right" },
          { text: isSC ? fmtCurrency(amt) : "", width: 80, align: "right" },
        ]);
      }
    }
  } else {
    const sideFilter = isBuyerOnly ? isBuyerItem : isSellerItem;
    const partyLabel = isBuyerOnly ? "BUYER" : "SELLER";

    tableRow(doc, [
      { text: "Description", width: 250, bold: true },
      { text: `${partyLabel} Debit`, width: 100, align: "right", bold: true },
      { text: `${partyLabel} Credit`, width: 100, align: "right", bold: true },
    ]);
    drawLine(doc);

    for (const cat of cats) {
      const allCatItems = data.lineItems.filter(li => (li as any).altaCategory === cat);
      const items = allCatItems.filter(sideFilter);
      if (items.length === 0) continue;
      sectionHeader(doc, catLabels[cat] || cat.toUpperCase());

      for (const item of items) {
        const amt = parseAmt(item.amount);
        const isDebit = item.side === (isBuyerOnly ? "buyer_debit" : "seller_debit") || item.side === "use";
        const isCredit = item.side === (isBuyerOnly ? "buyer_credit" : "seller_credit") || item.side === "source";
        if (isDebit) grandTotalDebit += amt;
        if (isCredit) grandTotalCredit += amt;
        tableRow(doc, [
          { text: item.description || "", width: 250 },
          { text: isDebit ? fmtCurrency(amt) : "", width: 100, align: "right" },
          { text: isCredit ? fmtCurrency(amt) : "", width: 100, align: "right" },
        ]);
      }
    }

    doc.moveDown(0.5);
    drawLine(doc);
    tableRow(doc, [
      { text: "TOTALS:", width: 250, bold: true },
      { text: fmtCurrency(grandTotalDebit), width: 100, align: "right", bold: true },
      { text: fmtCurrency(grandTotalCredit), width: 100, align: "right", bold: true },
    ]);

    const net = grandTotalCredit - grandTotalDebit;
    drawBoxFill(doc, 50, doc.y, doc.page.width - 100, 16, "#f0f4f8");
    const netLabel = isBuyerOnly ? "CASH DUE FROM BUYER:" : "CASH DUE TO SELLER:";
    doc.fontSize(8.5).font("Helvetica-Bold")
      .text(netLabel, 55, doc.y + 3)
      .text(fmtCurrency(Math.abs(net)), 410, doc.y - 9, { width: 80, align: "right" });
    doc.y += 20;
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
  drawBoxFill(doc, 50, doc.y, doc.page.width - 100, 16, "#f0f4f8");
  const diff = totalSources - totalUses;
  doc.fontSize(8.5).font("Helvetica-Bold")
    .text(Math.abs(diff) < 0.01 ? "BALANCE: VERIFIED" : "BALANCE: UNBALANCED", 55, doc.y + 3)
    .text(fmtCurrency(diff), 395, doc.y - 9, { width: 80, align: "right" });
  doc.y += 20;
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
  drawBoxFill(doc, 50, doc.y, doc.page.width - 100, 16, "#f0f4f8");
  doc.fontSize(8.5).font("Helvetica-Bold")
    .text("NET FLOW:", 55, doc.y + 3)
    .text(fmtCurrency(totalIn - totalOut), 395, doc.y - 9, { width: 80, align: "right" });
  doc.y += 20;

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
  const firmName = getFirmName(data);
  doc.fontSize(12).font("Helvetica-Bold").fillColor("#1a365d").text(label.toUpperCase(), { align: "center" });
  doc.fillColor("#000000");
  doc.moveDown(0.2);
  doc.fontSize(9).font("Helvetica").text(firmName, { align: "center" });
  doc.moveDown(0.5);

  const sources = data.lineItems.filter(li => li.side === "source" || li.side === "buyer_credit" || li.side === "seller_credit");
  const uses = data.lineItems.filter(li => li.side === "use" || li.side === "buyer_debit" || li.side === "seller_debit");

  sectionHeader(doc, "PORTFOLIO SUMMARY");

  const halfW = (doc.page.width - 110) / 2;
  let fy = doc.y;
  renderFormField(doc, "Property", data.closing.propertyAddress || "", 50, fy, doc.page.width - 100, 24);
  fy += 28;
  renderFormField(doc, "Purchase Price", fmtCurrency(parseAmt(data.closing.purchasePrice)), 50, fy, halfW, 24);
  renderFormField(doc, "File Number", data.closing.fileNumber || "", (doc.page.width / 2) + 5, fy, halfW, 24);
  fy += 28;
  renderFormField(doc, "Closing Date", fmtDate(data.closing.closingDate), 50, fy, halfW, 24);
  renderFormField(doc, "Status", (data.closing.status || "draft").replace(/_/g, " ").toUpperCase(), (doc.page.width / 2) + 5, fy, halfW, 24);
  fy += 30;
  doc.y = fy;

  sectionHeader(doc, "CAPITAL SOURCES");
  for (const item of sources) {
    tableRow(doc, [{ text: item.description || "", width: 380 }, { text: fmtCurrency(parseAmt(item.amount)), width: 100, align: "right" }]);
  }
  const totalCap = sources.reduce((s, i) => s + parseAmt(i.amount), 0);
  drawLine(doc);
  tableRow(doc, [{ text: "TOTAL SOURCES:", width: 380, bold: true }, { text: fmtCurrency(totalCap), width: 100, align: "right", bold: true }]);

  doc.moveDown(0.5);
  sectionHeader(doc, "ALLOCATIONS & USES");
  for (const item of uses) {
    tableRow(doc, [{ text: item.description || "", width: 380 }, { text: fmtCurrency(parseAmt(item.amount)), width: 100, align: "right" }]);
  }
  const totalAlloc = uses.reduce((s, i) => s + parseAmt(i.amount), 0);
  drawLine(doc);
  tableRow(doc, [{ text: "TOTAL ALLOCATED:", width: 380, bold: true }, { text: fmtCurrency(totalAlloc), width: 100, align: "right", bold: true }]);

  doc.moveDown(0.5);
  drawBoxFill(doc, 50, doc.y, doc.page.width - 100, 16, "#f0f4f8");
  const diff = totalCap - totalAlloc;
  doc.fontSize(8.5).font("Helvetica-Bold")
    .text(Math.abs(diff) < 0.01 ? "BALANCE: VERIFIED" : "VARIANCE:", 55, doc.y + 3)
    .text(fmtCurrency(diff), 410, doc.y - 9, { width: 80, align: "right" });
  doc.y += 20;

  const properties = new Map<string, any[]>();
  for (const item of data.lineItems) {
    const prop = (item as any).propertyName || (item as any).property || null;
    if (prop) {
      if (!properties.has(prop)) properties.set(prop, []);
      properties.get(prop)!.push(item);
    }
  }

  if (properties.size > 1) {
    for (const [propertyName, items] of properties) {
      doc.addPage();
      drawBoxFill(doc, 50, 45, doc.page.width - 100, 18, "#1a365d");
      doc.fontSize(9).font("Helvetica-Bold").fillColor("#ffffff")
        .text(`PROPERTY: ${propertyName}`, 55, 49, { width: doc.page.width - 110 });
      doc.fillColor("#000000");
      doc.y = 66;

      const propSources = items.filter(li => li.side === "source" || li.side === "buyer_credit" || li.side === "seller_credit");
      const propUses = items.filter(li => li.side === "use" || li.side === "buyer_debit" || li.side === "seller_debit");

      if (propSources.length > 0) {
        sectionHeader(doc, "Sources");
        for (const item of propSources) {
          tableRow(doc, [{ text: item.description || "", width: 380 }, { text: fmtCurrency(parseAmt(item.amount)), width: 100, align: "right" }]);
        }
        const total = propSources.reduce((s, i) => s + parseAmt(i.amount), 0);
        drawLine(doc);
        tableRow(doc, [{ text: "Subtotal:", width: 380, bold: true }, { text: fmtCurrency(total), width: 100, align: "right", bold: true }]);
      }

      if (propUses.length > 0) {
        doc.moveDown(0.3);
        sectionHeader(doc, "Uses & Allocations");
        for (const item of propUses) {
          tableRow(doc, [{ text: item.description || "", width: 380 }, { text: fmtCurrency(parseAmt(item.amount)), width: 100, align: "right" }]);
        }
        const total = propUses.reduce((s, i) => s + parseAmt(i.amount), 0);
        drawLine(doc);
        tableRow(doc, [{ text: "Subtotal:", width: 380, bold: true }, { text: fmtCurrency(total), width: 100, align: "right", bold: true }]);
      }
    }
  }
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

function renderConstructionSourcesUses(doc: PDFKit.PDFDocument, data: ClosingData) {
  doc.addPage();
  doc.fontSize(12).font("Helvetica-Bold").fillColor("#1a365d").text("CONSTRUCTION SOURCES & USES", { align: "center" });
  doc.fillColor("#000000");
  doc.moveDown(0.5);

  const costCategories = [
    { key: "hard_costs", label: "HARD COSTS" },
    { key: "soft_costs", label: "SOFT COSTS" },
    { key: "interest_reserve", label: "INTEREST RESERVES" },
    { key: "developer_fees", label: "DEVELOPER FEES" },
    { key: "contingency", label: "CONTINGENCY" },
  ];

  let totalCosts = 0;
  sectionHeader(doc, "USES OF FUNDS");
  for (const cat of costCategories) {
    const items = data.lineItems.filter(li => li.hudSection === cat.key || (li as any).altaCategory === cat.key);
    if (items.length === 0) continue;
    doc.fontSize(9).font("Helvetica-Bold").text(cat.label, 55);
    doc.moveDown(0.2);
    for (const item of items) {
      const amt = parseAmt(item.amount);
      totalCosts += amt;
      tableRow(doc, [{ text: item.description || "", width: 380 }, { text: fmtCurrency(amt), width: 100, align: "right" }]);
    }
    const catTotal = items.reduce((s, i) => s + parseAmt(i.amount), 0);
    drawLine(doc);
    tableRow(doc, [{ text: `${cat.label} Subtotal:`, width: 380, bold: true }, { text: fmtCurrency(catTotal), width: 100, align: "right", bold: true }]);
    doc.moveDown(0.3);
  }

  drawLine(doc);
  tableRow(doc, [{ text: "TOTAL PROJECT COST:", width: 380, bold: true }, { text: fmtCurrency(totalCosts), width: 100, align: "right", bold: true }]);
  doc.moveDown(0.5);

  const sources = data.lineItems.filter(li => li.side === "source" && !li.hudSection && !(li as any).altaCategory);
  sectionHeader(doc, "SOURCES OF FUNDS");
  for (const item of sources) {
    tableRow(doc, [{ text: item.description || "", width: 380 }, { text: fmtCurrency(parseAmt(item.amount)), width: 100, align: "right" }]);
  }
  const totalSources = sources.reduce((s, i) => s + parseAmt(i.amount), 0);
  drawLine(doc);
  tableRow(doc, [{ text: "TOTAL SOURCES:", width: 380, bold: true }, { text: fmtCurrency(totalSources), width: 100, align: "right", bold: true }]);

  doc.moveDown(0.5);
  const variance = totalSources - totalCosts;
  doc.fontSize(9).font("Helvetica-Bold")
    .text(Math.abs(variance) < 0.01 ? "BALANCE: VERIFIED" : "VARIANCE:", 55)
    .text(fmtCurrency(variance), 410, doc.y - 12, { width: 80, align: "right" });
}

function renderConstructionDraw(doc: PDFKit.PDFDocument, data: ClosingData) {
  doc.addPage();
  doc.fontSize(12).font("Helvetica-Bold").fillColor("#1a365d").text("CONSTRUCTION DRAW SCHEDULE", { align: "center" });
  doc.fillColor("#000000");
  doc.moveDown(0.3);
  const loanAmt = parseAmt(data.closing.loanAmount);
  doc.fontSize(9).font("Helvetica").text(`Total Commitment: ${fmtCurrency(loanAmt)}`, { align: "center" });
  doc.moveDown(0.5);

  const draws = data.lineItems.filter(li => li.hudSection === "draw" || (li as any).altaCategory === "draw");
  const retainage = data.lineItems.filter(li => li.hudSection === "retainage" || (li as any).altaCategory === "retainage");
  const changeOrders = data.lineItems.filter(li => li.hudSection === "change_order" || (li as any).altaCategory === "change_order");

  sectionHeader(doc, "DRAW REQUESTS");
  tableRow(doc, [
    { text: "#", width: 30, bold: true },
    { text: "Description", width: 250, bold: true },
    { text: "Amount", width: 100, align: "right", bold: true },
    { text: "Cumulative", width: 100, align: "right", bold: true },
  ]);
  drawLine(doc);
  let cumulative = 0;
  for (let i = 0; i < draws.length; i++) {
    const amt = parseAmt(draws[i].amount);
    cumulative += amt;
    tableRow(doc, [
      { text: `${i + 1}`, width: 30 },
      { text: draws[i].description || "", width: 250 },
      { text: fmtCurrency(amt), width: 100, align: "right" },
      { text: fmtCurrency(cumulative), width: 100, align: "right" },
    ]);
  }
  drawLine(doc);
  tableRow(doc, [
    { text: "", width: 30 },
    { text: "TOTAL DRAWN:", width: 250, bold: true },
    { text: fmtCurrency(cumulative), width: 100, align: "right", bold: true },
    { text: "", width: 100 },
  ]);

  if (retainage.length > 0) {
    doc.moveDown(0.5);
    sectionHeader(doc, "RETAINAGE HELD");
    for (const item of retainage) {
      tableRow(doc, [{ text: item.description || "", width: 380 }, { text: fmtCurrency(parseAmt(item.amount)), width: 100, align: "right" }]);
    }
    const totalRet = retainage.reduce((s, i) => s + parseAmt(i.amount), 0);
    drawLine(doc);
    tableRow(doc, [{ text: "TOTAL RETAINAGE:", width: 380, bold: true }, { text: fmtCurrency(totalRet), width: 100, align: "right", bold: true }]);
  }

  if (changeOrders.length > 0) {
    doc.moveDown(0.5);
    sectionHeader(doc, "CHANGE ORDERS");
    for (const item of changeOrders) {
      tableRow(doc, [{ text: item.description || "", width: 380 }, { text: fmtCurrency(parseAmt(item.amount)), width: 100, align: "right" }]);
    }
  }

  doc.moveDown(0.5);
  const remaining = loanAmt - cumulative;
  doc.fontSize(9).font("Helvetica-Bold")
    .text(`REMAINING BALANCE: ${fmtCurrency(remaining)}`, 55);
  doc.text(`${loanAmt > 0 ? ((cumulative / loanAmt) * 100).toFixed(1) : "0"}% drawn`, 55);
}

function renderCMBSFundingMemo(doc: PDFKit.PDFDocument, data: ClosingData) {
  doc.addPage();
  doc.fontSize(12).font("Helvetica-Bold").fillColor("#1a365d").text("CMBS FUNDING MEMO", { align: "center" });
  doc.fillColor("#000000");
  doc.moveDown(0.3);
  doc.fontSize(9).font("Helvetica")
    .text(`Property: ${data.closing.propertyAddress || "N/A"}`, { align: "center" })
    .text(`Loan Amount: ${fmtCurrency(parseAmt(data.closing.loanAmount))}`, { align: "center" });
  doc.moveDown(0.5);

  const tranches = [
    { key: "senior_tranche", label: "SENIOR TRANCHE (A-NOTE)" },
    { key: "mezz_tranche", label: "MEZZANINE TRANCHE (B-NOTE)" },
    { key: "pref_equity", label: "PREFERRED EQUITY" },
  ];

  let totalFunding = 0;
  sectionHeader(doc, "TRANCHE FUNDING");
  for (const t of tranches) {
    const items = data.lineItems.filter(li => li.hudSection === t.key || (li as any).altaCategory === t.key);
    if (items.length === 0) continue;
    doc.fontSize(9).font("Helvetica-Bold").text(t.label, 55);
    doc.moveDown(0.2);
    for (const item of items) {
      const amt = parseAmt(item.amount);
      totalFunding += amt;
      tableRow(doc, [{ text: item.description || "", width: 380 }, { text: fmtCurrency(amt), width: 100, align: "right" }]);
    }
    const subtotal = items.reduce((s, i) => s + parseAmt(i.amount), 0);
    drawLine(doc);
    tableRow(doc, [{ text: `Subtotal:`, width: 380, bold: true }, { text: fmtCurrency(subtotal), width: 100, align: "right", bold: true }]);
    doc.moveDown(0.3);
  }

  drawLine(doc);
  tableRow(doc, [{ text: "TOTAL FUNDING:", width: 380, bold: true }, { text: fmtCurrency(totalFunding), width: 100, align: "right", bold: true }]);

  const defeasance = data.lineItems.filter(li => li.hudSection === "defeasance" || (li as any).altaCategory === "defeasance");
  if (defeasance.length > 0) {
    doc.moveDown(0.5);
    sectionHeader(doc, "DEFEASANCE / YIELD MAINTENANCE");
    for (const item of defeasance) {
      tableRow(doc, [{ text: item.description || "", width: 380 }, { text: fmtCurrency(parseAmt(item.amount)), width: 100, align: "right" }]);
    }
  }

  const disbursements = data.lineItems.filter(li => li.side === "use" && !li.hudSection && !(li as any).altaCategory);
  if (disbursements.length > 0) {
    doc.moveDown(0.5);
    sectionHeader(doc, "DISBURSEMENTS");
    for (const item of disbursements) {
      tableRow(doc, [{ text: item.description || "", width: 380 }, { text: fmtCurrency(parseAmt(item.amount)), width: 100, align: "right" }]);
    }
    const totalD = disbursements.reduce((s, i) => s + parseAmt(i.amount), 0);
    drawLine(doc);
    tableRow(doc, [{ text: "TOTAL DISBURSED:", width: 380, bold: true }, { text: fmtCurrency(totalD), width: 100, align: "right", bold: true }]);
  }
}

function renderCapitalStack(doc: PDFKit.PDFDocument, data: ClosingData) {
  doc.addPage();
  doc.fontSize(12).font("Helvetica-Bold").fillColor("#1a365d").text("CAPITAL STACK SUMMARY", { align: "center" });
  doc.fillColor("#000000");
  doc.moveDown(0.3);
  const purchasePrice = parseAmt(data.closing.purchasePrice);
  doc.fontSize(9).font("Helvetica").text(`Purchase Price / Total Value: ${fmtCurrency(purchasePrice)}`, { align: "center" });
  doc.moveDown(0.5);

  const layers = [
    { key: "senior_debt", label: "SENIOR DEBT" },
    { key: "mezz_debt", label: "MEZZANINE DEBT" },
    { key: "pref_equity", label: "PREFERRED EQUITY" },
    { key: "sponsor_equity", label: "SPONSOR / COMMON EQUITY" },
  ];

  let totalStack = 0;
  let cumulativePercent = 0;

  sectionHeader(doc, "CAPITAL STRUCTURE");
  tableRow(doc, [
    { text: "Layer", width: 200, bold: true },
    { text: "Amount", width: 100, align: "right", bold: true },
    { text: "% of Stack", width: 80, align: "right", bold: true },
    { text: "LTV Range", width: 100, align: "right", bold: true },
  ]);
  drawLine(doc);

  const layerTotals: { label: string; total: number }[] = [];
  for (const layer of layers) {
    const items = data.lineItems.filter(li => li.hudSection === layer.key || (li as any).altaCategory === layer.key);
    const layerTotal = items.reduce((s, i) => s + parseAmt(i.amount), 0);
    totalStack += layerTotal;
    layerTotals.push({ label: layer.label, total: layerTotal });
  }

  let runningTotal = 0;
  for (const lt of layerTotals) {
    if (lt.total === 0) continue;
    const pct = totalStack > 0 ? (lt.total / totalStack) * 100 : 0;
    const ltvLow = purchasePrice > 0 ? (runningTotal / purchasePrice) * 100 : 0;
    runningTotal += lt.total;
    const ltvHigh = purchasePrice > 0 ? (runningTotal / purchasePrice) * 100 : 0;
    tableRow(doc, [
      { text: lt.label, width: 200 },
      { text: fmtCurrency(lt.total), width: 100, align: "right" },
      { text: `${pct.toFixed(1)}%`, width: 80, align: "right" },
      { text: `${ltvLow.toFixed(1)}% - ${ltvHigh.toFixed(1)}%`, width: 100, align: "right" },
    ]);
  }

  drawLine(doc);
  tableRow(doc, [
    { text: "TOTAL CAPITALIZATION:", width: 200, bold: true },
    { text: fmtCurrency(totalStack), width: 100, align: "right", bold: true },
    { text: "100.0%", width: 80, align: "right", bold: true },
    { text: "", width: 100 },
  ]);

  doc.moveDown(0.5);
  const seniorDebtTotal = layerTotals.find(l => l.label === "SENIOR DEBT")?.total || 0;
  const ltv = purchasePrice > 0 ? (seniorDebtTotal / purchasePrice) * 100 : 0;
  doc.fontSize(9).font("Helvetica-Bold").text(`Senior LTV: ${ltv.toFixed(1)}%`, 55);
  const variance = totalStack - purchasePrice;
  doc.text(Math.abs(variance) < 0.01 ? "BALANCE: VERIFIED" : `VARIANCE: ${fmtCurrency(variance)}`, 55);
}

function renderInvestorWaterfall(doc: PDFKit.PDFDocument, data: ClosingData) {
  doc.addPage();
  doc.fontSize(12).font("Helvetica-Bold").fillColor("#1a365d").text("INVESTOR DISTRIBUTION WATERFALL", { align: "center" });
  doc.fillColor("#000000");
  doc.moveDown(0.5);

  const tiers = [
    { key: "return_of_capital", label: "TIER 1: RETURN OF CAPITAL" },
    { key: "pref_return", label: "TIER 2: PREFERRED RETURN" },
    { key: "catch_up", label: "TIER 3: GP CATCH-UP" },
    { key: "promote", label: "TIER 4: PROMOTE / CARRIED INTEREST" },
    { key: "residual_split", label: "TIER 5: RESIDUAL SPLIT" },
  ];

  let totalDistributed = 0;
  for (const tier of tiers) {
    const items = data.lineItems.filter(li => li.hudSection === tier.key);
    if (items.length === 0) continue;

    sectionHeader(doc, tier.label);
    for (const item of items) {
      const amt = parseAmt(item.amount);
      totalDistributed += amt;
      tableRow(doc, [{ text: item.description || "", width: 380 }, { text: fmtCurrency(amt), width: 100, align: "right" }]);
    }
    const tierTotal = items.reduce((s, i) => s + parseAmt(i.amount), 0);
    drawLine(doc);
    tableRow(doc, [{ text: "Tier Subtotal:", width: 380, bold: true }, { text: fmtCurrency(tierTotal), width: 100, align: "right", bold: true }]);
  }

  doc.moveDown(0.5);
  drawLine(doc);
  doc.moveDown(0.3);
  doc.fontSize(10).font("Helvetica-Bold")
    .text("TOTAL DISTRIBUTED:", 55, doc.y, { continued: true })
    .text(fmtCurrency(totalDistributed), { align: "right" });
}

function renderGroundLease(doc: PDFKit.PDFDocument, data: ClosingData) {
  doc.addPage();
  doc.fontSize(12).font("Helvetica-Bold").fillColor("#1a365d").text("GROUND LEASE CLOSING STATEMENT", { align: "center" });
  doc.fillColor("#000000");
  doc.moveDown(0.3);
  doc.fontSize(9).font("Helvetica").text(`Property: ${data.closing.propertyAddress || "N/A"}`, { align: "center" });
  doc.moveDown(0.5);

  const sections = [
    { key: "prepaid_rent", label: "PREPAID RENT" },
    { key: "leasehold_financing", label: "LEASEHOLD FINANCING" },
    { key: "leasehold_taxes", label: "LEASEHOLD TAXES & ASSESSMENTS" },
    { key: "closing_costs", label: "CLOSING COSTS" },
  ];

  let totalCosts = 0;
  for (const sec of sections) {
    const items = data.lineItems.filter(li => li.hudSection === sec.key || (li as any).altaCategory === sec.key);
    if (items.length === 0) continue;
    sectionHeader(doc, sec.label);
    for (const item of items) {
      const amt = parseAmt(item.amount);
      totalCosts += amt;
      tableRow(doc, [{ text: item.description || "", width: 380 }, { text: fmtCurrency(amt), width: 100, align: "right" }]);
    }
    const subtotal = items.reduce((s, i) => s + parseAmt(i.amount), 0);
    drawLine(doc);
    tableRow(doc, [{ text: "Subtotal:", width: 380, bold: true }, { text: fmtCurrency(subtotal), width: 100, align: "right", bold: true }]);
  }

  drawLine(doc);
  tableRow(doc, [{ text: "TOTAL CLOSING COSTS:", width: 380, bold: true }, { text: fmtCurrency(totalCosts), width: 100, align: "right", bold: true }]);

  const deposits = data.lineItems.filter(li => li.side === "source" && !li.hudSection && !(li as any).altaCategory);
  if (deposits.length > 0) {
    doc.moveDown(0.5);
    sectionHeader(doc, "DEPOSITS & FUNDING");
    for (const item of deposits) {
      tableRow(doc, [{ text: item.description || "", width: 380 }, { text: fmtCurrency(parseAmt(item.amount)), width: 100, align: "right" }]);
    }
    const totalDeposits = deposits.reduce((s, i) => s + parseAmt(i.amount), 0);
    drawLine(doc);
    tableRow(doc, [{ text: "TOTAL DEPOSITS:", width: 380, bold: true }, { text: fmtCurrency(totalDeposits), width: 100, align: "right", bold: true }]);

    doc.moveDown(0.3);
    const net = totalDeposits - totalCosts;
    doc.fontSize(9).font("Helvetica-Bold")
      .text(Math.abs(net) < 0.01 ? "BALANCE: VERIFIED" : `NET DUE: ${fmtCurrency(net)}`, 55);
  }
}

function renderMasterClosing(doc: PDFKit.PDFDocument, data: ClosingData) {
  doc.addPage();
  doc.fontSize(12).font("Helvetica-Bold").fillColor("#1a365d").text("MASTER CLOSING STATEMENT", { align: "center" });
  doc.fillColor("#000000");
  doc.moveDown(0.3);
  doc.fontSize(9).font("Helvetica")
    .text(`Property: ${data.closing.propertyAddress || "N/A"}`, { align: "center" })
    .text(`Purchase Price: ${fmtCurrency(parseAmt(data.closing.purchasePrice))}`, { align: "center" });
  doc.moveDown(0.5);

  const buyerCredits = data.lineItems.filter(li => li.side === "buyer_credit");
  const buyerDebits = data.lineItems.filter(li => li.side === "buyer_debit");
  const sellerCredits = data.lineItems.filter(li => li.side === "seller_credit");
  const sellerDebits = data.lineItems.filter(li => li.side === "seller_debit");

  sectionHeader(doc, "BUYER'S STATEMENT");
  if (buyerCredits.length > 0) {
    doc.fontSize(9).font("Helvetica-Bold").text("Credits to Buyer:", 55);
    doc.moveDown(0.2);
    for (const item of buyerCredits) {
      tableRow(doc, [{ text: item.description || "", width: 380 }, { text: fmtCurrency(parseAmt(item.amount)), width: 100, align: "right" }]);
    }
  }
  if (buyerDebits.length > 0) {
    doc.moveDown(0.3);
    doc.fontSize(9).font("Helvetica-Bold").text("Charges to Buyer:", 55);
    doc.moveDown(0.2);
    for (const item of buyerDebits) {
      tableRow(doc, [{ text: item.description || "", width: 380 }, { text: fmtCurrency(parseAmt(item.amount)), width: 100, align: "right" }]);
    }
  }
  const buyerNet = buyerCredits.reduce((s, i) => s + parseAmt(i.amount), 0) - buyerDebits.reduce((s, i) => s + parseAmt(i.amount), 0);
  drawLine(doc);
  tableRow(doc, [{ text: "BUYER NET:", width: 380, bold: true }, { text: fmtCurrency(buyerNet), width: 100, align: "right", bold: true }]);

  doc.moveDown(0.5);
  sectionHeader(doc, "SELLER'S STATEMENT");
  if (sellerCredits.length > 0) {
    doc.fontSize(9).font("Helvetica-Bold").text("Credits to Seller:", 55);
    doc.moveDown(0.2);
    for (const item of sellerCredits) {
      tableRow(doc, [{ text: item.description || "", width: 380 }, { text: fmtCurrency(parseAmt(item.amount)), width: 100, align: "right" }]);
    }
  }
  if (sellerDebits.length > 0) {
    doc.moveDown(0.3);
    doc.fontSize(9).font("Helvetica-Bold").text("Charges to Seller:", 55);
    doc.moveDown(0.2);
    for (const item of sellerDebits) {
      tableRow(doc, [{ text: item.description || "", width: 380 }, { text: fmtCurrency(parseAmt(item.amount)), width: 100, align: "right" }]);
    }
  }
  const sellerNet = sellerCredits.reduce((s, i) => s + parseAmt(i.amount), 0) - sellerDebits.reduce((s, i) => s + parseAmt(i.amount), 0);
  drawLine(doc);
  tableRow(doc, [{ text: "SELLER NET:", width: 380, bold: true }, { text: fmtCurrency(sellerNet), width: 100, align: "right", bold: true }]);

  const sources = data.lineItems.filter(li => li.side === "source");
  const uses = data.lineItems.filter(li => li.side === "use");
  if (sources.length > 0 || uses.length > 0) {
    doc.moveDown(0.5);
    sectionHeader(doc, "SOURCES & USES RECONCILIATION");
    if (sources.length > 0) {
      doc.fontSize(9).font("Helvetica-Bold").text("Sources:", 55);
      for (const item of sources) {
        tableRow(doc, [{ text: item.description || "", width: 380 }, { text: fmtCurrency(parseAmt(item.amount)), width: 100, align: "right" }]);
      }
    }
    if (uses.length > 0) {
      doc.moveDown(0.3);
      doc.fontSize(9).font("Helvetica-Bold").text("Uses:", 55);
      for (const item of uses) {
        tableRow(doc, [{ text: item.description || "", width: 380 }, { text: fmtCurrency(parseAmt(item.amount)), width: 100, align: "right" }]);
      }
    }
  }
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
      { text: "Lender", width: 120, bold: true },
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

export async function generateClosingStatementPDF(data: ClosingData): Promise<PDFKit.PDFDocument> {
  if (data.orgBranding?.logoUrl && !data.orgBranding.logoBuffer) {
    const buf = await fetchLogoBuffer(data.orgBranding.logoUrl);
    if (buf) data.orgBranding.logoBuffer = buf;
  }

  const doc = new PDFDocument({
    size: "LETTER",
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    bufferPages: true,
    info: {
      Title: `${data.closing.title || "Closing Statement"} - ${typeLabels[data.closing.transactionType] || data.closing.transactionType}`,
      Author: getFirmName(data),
      Subject: "Real Estate Closing Statement",
      Keywords: "closing statement, settlement, real estate",
    },
  });

  const txType = data.closing.transactionType;
  const officialFormTypes = ["hud1", "hud1a", "closing_disclosure", "seller_closing_disclosure"];
  const isOfficialForm = officialFormTypes.includes(txType);

  if (!isOfficialForm) {
    renderCoverPage(doc, data);
  }

  switch (txType) {
    case "hud1":
      renderHud1Sections(doc, data, isOfficialForm);
      break;
    case "hud1a":
      renderHud1aSections(doc, data, isOfficialForm);
      break;
    case "closing_disclosure":
    case "seller_closing_disclosure":
      renderCDSections(doc, data, isOfficialForm);
      break;
    case "cash_settlement":
      renderCashSettlement(doc, data);
      break;
    case "alta_combined":
    case "alta_buyer":
    case "alta_seller":
      renderAltaSections(doc, data);
      break;
    case "sources_and_uses":
      renderSourcesUses(doc, data);
      break;
    case "construction_sources_uses":
      renderConstructionSourcesUses(doc, data);
      break;
    case "construction_draw":
      renderConstructionDraw(doc, data);
      break;
    case "cmbs_funding_memo":
      renderCMBSFundingMemo(doc, data);
      break;
    case "capital_stack":
      renderCapitalStack(doc, data);
      break;
    case "investor_waterfall":
      renderInvestorWaterfall(doc, data);
      break;
    case "ground_lease_closing":
      renderGroundLease(doc, data);
      break;
    case "master_closing":
      renderMasterClosing(doc, data);
      break;
    case "funds_flow":
      renderFundsFlow(doc, data);
      break;
    case "1031_exchange":
    case "qi_statement":
      render1031Exchange(doc, data);
      break;
    case "portfolio_settlement":
      renderPortfolio(doc, data);
      break;
    case "lender_funding":
      renderLenderFunding(doc, data);
      break;
    default:
      renderLineItemsPage(doc, data);
      break;
  }

  renderProrations(doc, data);
  renderPayoffsEscrows(doc, data);
  renderWires(doc, data);

  const firmName = getFirmName(data);
  const pageRange = doc.bufferedPageRange();
  if (pageRange && typeof pageRange.count === "number" && pageRange.count > 0) {
    const totalPages = pageRange.count;
    const startPage = pageRange.start || 0;
    for (let i = startPage; i < startPage + totalPages; i++) {
      doc.switchToPage(i);
      addPageFooter(doc, i - startPage + 1, totalPages, data.closing, firmName);
    }
  }

  return doc;
}
