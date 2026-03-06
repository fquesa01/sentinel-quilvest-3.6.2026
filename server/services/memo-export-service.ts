import PDFDocument from "pdfkit";
import type { InvestorMemo, FinancialModel } from "@shared/schema";

export async function generateMemoPDF(
  memo: InvestorMemo,
  model: FinancialModel | null
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "LETTER",
        margins: { top: 72, bottom: 72, left: 72, right: 72 },
        info: {
          Title: `Investor Memo - ${memo.dealName}`,
          Author: "Sentinel Counsel LLP",
          Subject: "Confidential Investment Memorandum",
        },
      });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const navy = "#1a2332";
      const primary = "#6366f1";
      const gray = "#64748b";
      const pageWidth = doc.page.width - 144;

      // Cover Page
      doc.rect(0, 0, doc.page.width, doc.page.height).fill("#0f172a");

      doc.fontSize(12).fillColor("#94a3b8")
        .text("CONFIDENTIAL", 72, 80, { align: "left" });

      doc.fontSize(36).fillColor("white")
        .text(memo.dealName, 72, 200, { width: pageWidth });

      doc.fontSize(16).fillColor("#94a3b8")
        .text("Investment Memorandum", 72, 260, { width: pageWidth });

      doc.moveTo(72, 310).lineTo(72 + 80, 310).strokeColor(primary).lineWidth(3).stroke();

      if (memo.investmentThesis) {
        doc.fontSize(11).fillColor("#cbd5e1")
          .text(memo.investmentThesis.slice(0, 300), 72, 340, { width: pageWidth, lineGap: 4 });
      }

      const infoY = 500;
      const infoItems = [
        { label: "Innovation Score", value: `${memo.innovationScore || "N/A"} / 100` },
        { label: "Overall Score", value: `${memo.overallScore || "N/A"} / 100` },
        { label: "Documents Analyzed", value: `${memo.metadata?.documentsProcessed || 0}` },
        { label: "Research Sources", value: `${memo.metadata?.researchSourcesCount || 0}` },
      ];

      infoItems.forEach((item, i) => {
        const x = 72 + (i % 2) * 240;
        const y = infoY + Math.floor(i / 2) * 50;
        doc.fontSize(9).fillColor("#94a3b8").text(item.label, x, y);
        doc.fontSize(14).fillColor("white").text(item.value, x, y + 14);
      });

      doc.fontSize(10).fillColor("#475569")
        .text("Prepared by Sentinel Counsel LLP", 72, doc.page.height - 100, { width: pageWidth })
        .text(`Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, 72, doc.page.height - 85, { width: pageWidth });

      // Content Pages
      const sections = (memo.sections || {}) as Record<string, { title: string; content: string }>;

      for (const [key, section] of Object.entries(sections)) {
        if (!section.content) continue;

        doc.addPage();
        doc.fillColor(navy);

        doc.fontSize(20).fillColor(navy).text(section.title, 72, 72, { width: pageWidth });
        doc.moveTo(72, 100).lineTo(72 + 60, 100).strokeColor(primary).lineWidth(2).stroke();

        let yPos = 120;
        const lines = section.content.split("\n");

        for (const line of lines) {
          if (yPos > doc.page.height - 100) {
            doc.addPage();
            yPos = 72;
          }

          if (line.startsWith("## ")) {
            yPos += 8;
            doc.fontSize(14).fillColor(navy).text(line.slice(3), 72, yPos, { width: pageWidth });
            yPos += 22;
          } else if (line.startsWith("### ")) {
            yPos += 6;
            doc.fontSize(12).fillColor(navy).text(line.slice(4), 72, yPos, { width: pageWidth });
            yPos += 18;
          } else if (line.startsWith("- ") || line.startsWith("* ")) {
            doc.fontSize(10).fillColor(gray).text(`•  ${line.slice(2)}`, 82, yPos, { width: pageWidth - 10, lineGap: 2 });
            yPos += doc.heightOfString(`•  ${line.slice(2)}`, { width: pageWidth - 10 }) + 4;
          } else if (line.trim() === "") {
            yPos += 8;
          } else {
            doc.fontSize(10).fillColor("#334155").text(line, 72, yPos, { width: pageWidth, lineGap: 3 });
            yPos += doc.heightOfString(line, { width: pageWidth }) + 6;
          }
        }
      }

      // Financial Model Page
      if (model?.scenarios) {
        doc.addPage();
        doc.fontSize(20).fillColor(navy).text("Financial Model Summary", 72, 72, { width: pageWidth });
        doc.moveTo(72, 100).lineTo(72 + 60, 100).strokeColor(primary).lineWidth(2).stroke();

        const scenarios = model.scenarios as any;
        const baseProjections = scenarios?.base?.projections || [];
        const baseValuation = scenarios?.base?.valuation || {};

        if (baseProjections.length > 0) {
          let y = 120;
          doc.fontSize(14).fillColor(navy).text("Base Case Projections ($000s)", 72, y);
          y += 25;

          const colWidth = Math.min(80, (pageWidth - 100) / baseProjections.length);
          const labelX = 72;

          doc.fontSize(8).fillColor(gray);
          doc.text("Metric", labelX, y, { width: 100 });
          baseProjections.forEach((p: any, i: number) => {
            doc.text(p.year, 172 + i * colWidth, y, { width: colWidth, align: "right" });
          });
          y += 15;
          doc.moveTo(72, y).lineTo(72 + pageWidth, y).strokeColor("#e2e8f0").lineWidth(0.5).stroke();
          y += 5;

          const metrics = [
            { label: "Revenue", field: "revenue" },
            { label: "EBITDA", field: "ebitda" },
            { label: "EBITDA Margin", field: "ebitdaMargin", isPercent: true },
            { label: "Free Cash Flow", field: "freeCashFlow" },
          ];

          for (const metric of metrics) {
            if (y > doc.page.height - 100) { doc.addPage(); y = 72; }
            doc.fontSize(9).fillColor("#334155").text(metric.label, labelX, y, { width: 100 });
            baseProjections.forEach((p: any, i: number) => {
              const val = p[metric.field];
              const formatted = val == null ? "—" : metric.isPercent ? `${val.toFixed(1)}%` : `$${(val / 1000).toFixed(1)}M`;
              doc.text(formatted, 172 + i * colWidth, y, { width: colWidth, align: "right" });
            });
            y += 15;
          }

          if (baseValuation.dcf) {
            y += 20;
            doc.fontSize(14).fillColor(navy).text("Valuation Summary", 72, y);
            y += 25;
            const valItems = [
              { label: "Enterprise Value (DCF)", value: `$${(baseValuation.dcf.enterpriseValue / 1000).toFixed(1)}M` },
              { label: "EV / Revenue", value: `${baseValuation.dcf.impliedEvRevenue?.toFixed(1) || "N/A"}x` },
              { label: "EV / EBITDA", value: `${baseValuation.dcf.impliedEvEbitda?.toFixed(1) || "N/A"}x` },
              { label: "WACC", value: `${baseValuation.dcf.wacc?.toFixed(1) || "N/A"}%` },
            ];
            for (const item of valItems) {
              doc.fontSize(9).fillColor(gray).text(item.label, labelX, y, { width: 200 });
              doc.fontSize(9).fillColor(navy).text(item.value, 280, y, { width: 100, align: "right" });
              y += 15;
            }
          }
        }
      }

      // Footer on last page
      doc.fontSize(8).fillColor("#94a3b8")
        .text(
          "This document is confidential and intended solely for the use of the individual or entity to whom it is addressed.",
          72, doc.page.height - 50,
          { width: pageWidth, align: "center" }
        );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

export async function generateMemoExcel(
  memo: InvestorMemo,
  model: FinancialModel | null
): Promise<Buffer> {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  // Summary Sheet
  const summaryData = [
    ["Investor Memo - " + memo.dealName],
    [""],
    ["Status", memo.status],
    ["Innovation Score", memo.innovationScore || "N/A"],
    ["Overall Score", memo.overallScore || "N/A"],
    ["Documents Processed", memo.metadata?.documentsProcessed || 0],
    ["Research Sources", memo.metadata?.researchSourcesCount || 0],
    ["Generated", new Date(memo.createdAt).toLocaleDateString()],
  ];
  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");

  // Financial Model Sheets
  if (model?.scenarios) {
    const scenarios = model.scenarios as any;

    for (const [scenarioName, scenarioData] of Object.entries(scenarios) as [string, any][]) {
      const projections = scenarioData?.projections || [];
      if (projections.length === 0) continue;

      const headers = ["Metric", ...projections.map((p: any) => p.year)];
      const metrics = [
        { label: "Revenue", field: "revenue" },
        { label: "Revenue Growth %", field: "revenueGrowth" },
        { label: "COGS", field: "cogs" },
        { label: "Gross Profit", field: "grossProfit" },
        { label: "Gross Margin %", field: "grossMargin" },
        { label: "Operating Expenses", field: "operatingExpenses" },
        { label: "EBITDA", field: "ebitda" },
        { label: "EBITDA Margin %", field: "ebitdaMargin" },
        { label: "D&A", field: "depreciation" },
        { label: "EBIT", field: "ebit" },
        { label: "Taxes", field: "taxes" },
        { label: "NOPAT", field: "nopat" },
        { label: "CapEx", field: "capex" },
        { label: "Change in WC", field: "changeInWC" },
        { label: "Free Cash Flow", field: "freeCashFlow" },
      ];

      const rows = [headers];
      for (const metric of metrics) {
        rows.push([metric.label, ...projections.map((p: any) => p[metric.field] ?? "")]);
      }

      const ws = XLSX.utils.aoa_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, `${scenarioName.charAt(0).toUpperCase() + scenarioName.slice(1)} Case`);
    }

    // Valuation sheet
    const baseVal = scenarios.base?.valuation;
    if (baseVal) {
      const valRows: any[][] = [["Valuation Summary"], [""]];

      if (baseVal.dcf) {
        valRows.push(["DCF Valuation"]);
        valRows.push(["WACC", baseVal.dcf.wacc]);
        valRows.push(["Terminal Growth", baseVal.dcf.terminalGrowth]);
        valRows.push(["Terminal Value", baseVal.dcf.terminalValue]);
        valRows.push(["Enterprise Value", baseVal.dcf.enterpriseValue]);
        valRows.push(["Equity Value", baseVal.dcf.equityValue]);
        valRows.push(["Implied EV/Revenue", baseVal.dcf.impliedEvRevenue]);
        valRows.push(["Implied EV/EBITDA", baseVal.dcf.impliedEvEbitda]);
        valRows.push([""]);
      }

      if (baseVal.lbo) {
        valRows.push(["LBO Analysis"]);
        valRows.push(["Entry Multiple", baseVal.lbo.entryMultiple]);
        valRows.push(["Exit Multiple", baseVal.lbo.exitMultiple]);
        valRows.push(["Hold Period", baseVal.lbo.holdPeriod]);
        valRows.push(["IRR", baseVal.lbo.irr]);
        valRows.push(["MOIC", baseVal.lbo.moic]);
        valRows.push([""]);
      }

      if (baseVal.comparableTransactions) {
        valRows.push(["Comparable Transactions"]);
        valRows.push(["Median EV/Revenue", baseVal.comparableTransactions.medianEvRevenue]);
        valRows.push(["Median EV/EBITDA", baseVal.comparableTransactions.medianEvEbitda]);
        valRows.push(["Implied Low", baseVal.comparableTransactions.impliedValuationRange?.low]);
        valRows.push(["Implied Mid", baseVal.comparableTransactions.impliedValuationRange?.mid]);
        valRows.push(["Implied High", baseVal.comparableTransactions.impliedValuationRange?.high]);
      }

      const valWs = XLSX.utils.aoa_to_sheet(valRows);
      XLSX.utils.book_append_sheet(wb, valWs, "Valuation");
    }
  }

  // Assumptions sheet
  if (model?.assumptions) {
    const assumptions = model.assumptions as Record<string, any>;
    const aRows: any[][] = [["Assumptions"], [""]];
    for (const [key, value] of Object.entries(assumptions)) {
      if (typeof value === "object") {
        aRows.push([key]);
        for (const [k, v] of Object.entries(value as Record<string, any>)) {
          aRows.push(["  " + k, v]);
        }
      } else {
        aRows.push([key, value]);
      }
    }
    const aWs = XLSX.utils.aoa_to_sheet(aRows);
    XLSX.utils.book_append_sheet(wb, aWs, "Assumptions");
  }

  // Tech Value Creation
  if (model?.techValueCreation) {
    const tv = model.techValueCreation as any;
    const tvRows: any[][] = [
      ["Platform Synergy Value Creation ($000s)"],
      [""],
      ["Year 1", tv.year1],
      ["Year 2", tv.year2],
      ["Year 3", tv.year3],
      [""],
      ["Synergy", "Score", "Timeline"],
      ...(tv.synergies || []).map((s: any) => [s.name, s.value, s.timeline]),
    ];
    const tvWs = XLSX.utils.aoa_to_sheet(tvRows);
    XLSX.utils.book_append_sheet(wb, tvWs, "Tech Synergies");
  }

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return Buffer.from(buffer);
}
