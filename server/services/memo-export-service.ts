import PDFDocument from "pdfkit";
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow,
  TableCell, WidthType, AlignmentType, BorderStyle, ShadingType, Header,
  Footer, PageNumber, NumberFormat,
} from "docx";
import type { InvestorMemo, FinancialModel } from "@shared/schema";

function stripBold(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, "$1");
}

function parseBoldSegments(text: string): { text: string; bold: boolean }[] {
  const segments: { text: string; bold: boolean }[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    const match = remaining.match(/\*\*(.+?)\*\*/);
    if (match && match.index !== undefined) {
      if (match.index > 0) segments.push({ text: remaining.slice(0, match.index), bold: false });
      segments.push({ text: match[1], bold: true });
      remaining = remaining.slice(match.index + match[0].length);
    } else {
      segments.push({ text: remaining, bold: false });
      break;
    }
  }
  return segments;
}

function parseMarkdownTable(lines: string[]): { headers: string[]; rows: string[][] } | null {
  if (lines.length < 2) return null;
  const parseRow = (line: string) => {
    const cleaned = line.replace(/^`+/, "").replace(/`+$/, "").trim();
    const stripped = cleaned.replace(/^\|/, "").replace(/\|$/, "");
    return stripped.split("|").map((c) => c.trim());
  };
  const isSeparator = (line: string) => {
    const cleaned = line.replace(/^`+/, "").replace(/`+$/, "").trim();
    return /^\|?[\s-:|]+\|?$/.test(cleaned) && cleaned.includes("-");
  };
  const headers = parseRow(lines[0]);
  if (headers.length === 0 || headers.every((h) => h === "")) return null;
  const dataStart = isSeparator(lines[1]) ? 2 : 1;
  const rows = lines.slice(dataStart)
    .filter((l) => !isSeparator(l))
    .map((l) => {
      const cells = parseRow(l);
      while (cells.length < headers.length) cells.push("");
      return cells.slice(0, headers.length);
    })
    .filter((r) => r.some((c) => c !== ""));
  return { headers, rows };
}

function isTableLine(line: string): boolean {
  const cleaned = line.trim().replace(/^`+/, "").replace(/`+$/, "").trim();
  return cleaned.startsWith("|") && cleaned.includes("|", 1);
}

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

      doc.rect(0, 0, doc.page.width, doc.page.height).fill("#0f172a");
      doc.fontSize(12).fillColor("#94a3b8").text("CONFIDENTIAL", 72, 80, { align: "left" });
      doc.fontSize(36).fillColor("white").text(memo.dealName, 72, 200, { width: pageWidth });
      doc.fontSize(16).fillColor("#94a3b8").text("Investment Memorandum", 72, 260, { width: pageWidth });
      doc.moveTo(72, 310).lineTo(72 + 80, 310).strokeColor(primary).lineWidth(3).stroke();

      if (memo.investmentThesis) {
        doc.fontSize(11).fillColor("#cbd5e1")
          .text(stripBold(memo.investmentThesis.slice(0, 300)), 72, 340, { width: pageWidth, lineGap: 4 });
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

      const sections = (memo.sections || {}) as Record<string, { title: string; content: string }>;

      for (const [, section] of Object.entries(sections)) {
        if (!section.content) continue;

        doc.addPage();
        doc.fillColor(navy);
        doc.fontSize(20).fillColor(navy).text(stripBold(section.title), 72, 72, { width: pageWidth });
        doc.moveTo(72, 100).lineTo(72 + 60, 100).strokeColor(primary).lineWidth(2).stroke();

        let yPos = 120;
        const lines = section.content.split("\n");
        let li = 0;

        const ensureSpace = (needed: number) => {
          if (yPos + needed > doc.page.height - 80) {
            doc.addPage();
            yPos = 72;
          }
        };

        while (li < lines.length) {
          const line = lines[li];
          const trimmed = line.trim();

          ensureSpace(20);

          if (trimmed.startsWith("# ")) {
            yPos += 10;
            doc.fontSize(16).fillColor(navy).text(stripBold(trimmed.slice(2)), 72, yPos, { width: pageWidth });
            yPos += 24;
            li++;
          } else if (trimmed.startsWith("## ")) {
            yPos += 8;
            doc.fontSize(13).fillColor(navy).text(stripBold(trimmed.slice(3)), 72, yPos, { width: pageWidth });
            yPos += 20;
            li++;
          } else if (trimmed.startsWith("**") && trimmed.endsWith("**") && trimmed.indexOf("**", 2) === trimmed.length - 2) {
            yPos += 8;
            doc.fontSize(13).fillColor(navy).text(trimmed.slice(2, -2), 72, yPos, { width: pageWidth });
            yPos += 20;
            li++;
          } else if (trimmed.startsWith("### ")) {
            yPos += 6;
            doc.fontSize(11).fillColor(navy).text(stripBold(trimmed.slice(4)), 72, yPos, { width: pageWidth });
            yPos += 17;
            li++;
          } else if (isTableLine(trimmed)) {
            const tableLines: string[] = [];
            while (li < lines.length && isTableLine(lines[li].trim())) {
              tableLines.push(lines[li].trim());
              li++;
            }
            const table = parseMarkdownTable(tableLines);
            if (table && table.headers.length > 0) {
              yPos += 4;
              const numCols = table.headers.length;
              const colW = pageWidth / numCols;

              ensureSpace(20);
              doc.rect(72, yPos, pageWidth, 16).fill("#f1f5f9");
              table.headers.forEach((h, ci) => {
                doc.fontSize(8).fillColor(navy).text(stripBold(h), 74 + ci * colW, yPos + 3, { width: colW - 4 });
              });
              yPos += 16;
              doc.moveTo(72, yPos).lineTo(72 + pageWidth, yPos).strokeColor("#cbd5e1").lineWidth(0.5).stroke();
              yPos += 2;

              for (const row of table.rows) {
                const cellTexts = row.map((c) => stripBold(c));
                const rowHeight = Math.max(14, ...cellTexts.map((t) => doc.fontSize(8).heightOfString(t, { width: colW - 4 }) + 6));
                ensureSpace(rowHeight);
                cellTexts.forEach((cell, ci) => {
                  doc.fontSize(8).fillColor("#334155").text(cell, 74 + ci * colW, yPos + 2, { width: colW - 4, lineGap: 1 });
                });
                yPos += rowHeight;
                doc.moveTo(72, yPos).lineTo(72 + pageWidth, yPos).strokeColor("#e2e8f0").lineWidth(0.3).stroke();
              }
              yPos += 8;
            }
          } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
            const cleanText = stripBold(trimmed.slice(2));
            const h = doc.fontSize(10).heightOfString(`  ${cleanText}`, { width: pageWidth - 20 });
            ensureSpace(h + 4);
            doc.fontSize(10).fillColor(gray).text(`  ${cleanText}`, 82, yPos, { width: pageWidth - 20, lineGap: 2 });
            doc.circle(80, yPos + 5, 2).fill(gray);
            yPos += h + 4;
            li++;
          } else if (/^\d+\.\s+/.test(trimmed)) {
            const match = trimmed.match(/^(\d+)\.\s+(.+)/);
            if (match) {
              const cleanText = stripBold(match[2]);
              const h = doc.fontSize(10).heightOfString(cleanText, { width: pageWidth - 20 });
              ensureSpace(h + 4);
              doc.fontSize(10).fillColor("#334155").text(`${match[1]}.`, 72, yPos, { width: 15 });
              doc.fontSize(10).fillColor("#334155").text(cleanText, 90, yPos, { width: pageWidth - 18, lineGap: 2 });
              yPos += h + 4;
            }
            li++;
          } else if (trimmed === "") {
            yPos += 8;
            li++;
          } else {
            const cleanText = stripBold(trimmed);
            const h = doc.fontSize(10).heightOfString(cleanText, { width: pageWidth });
            ensureSpace(h + 6);
            doc.fontSize(10).fillColor("#334155").text(cleanText, 72, yPos, { width: pageWidth, lineGap: 3 });
            yPos += h + 6;
            li++;
          }
        }
      }

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
              const formatted = val == null ? "\u2014" : metric.isPercent ? `${val.toFixed(1)}%` : `$${(val / 1000).toFixed(1)}M`;
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

function mdToDocxParagraphs(content: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  const lines = content.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith("# ")) {
      paragraphs.push(new Paragraph({
        children: parseBoldSegments(trimmed.slice(2)).map((s) =>
          new TextRun({ text: s.text, bold: true, size: 32 })
        ),
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 240, after: 120 },
      }));
      i++;
    } else if (trimmed.startsWith("## ")) {
      paragraphs.push(new Paragraph({
        children: parseBoldSegments(trimmed.slice(3)).map((s) =>
          new TextRun({ text: s.text, bold: true, size: 26, color: "1a2332" })
        ),
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      }));
      i++;
    } else if (trimmed.startsWith("### ")) {
      paragraphs.push(new Paragraph({
        children: parseBoldSegments(trimmed.slice(4)).map((s) =>
          new TextRun({ text: s.text, bold: true, size: 22, color: "1a2332" })
        ),
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 160, after: 80 },
      }));
      i++;
    } else if (trimmed.startsWith("**") && trimmed.endsWith("**") && trimmed.length > 4) {
      const headerText = trimmed.slice(2, -2);
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: headerText, bold: true, size: 24, color: "1a2332" })],
        spacing: { before: 200, after: 100 },
      }));
      i++;
    } else if (isTableLine(trimmed)) {
      const tableLines: string[] = [];
      while (i < lines.length && isTableLine(lines[i].trim())) {
        tableLines.push(lines[i].trim());
        i++;
      }
      const table = parseMarkdownTable(tableLines);
      if (table && table.headers.length > 0) {
        const headerRow = new TableRow({
          tableHeader: true,
          children: table.headers.map((h) =>
            new TableCell({
              children: [new Paragraph({
                children: parseBoldSegments(h).map((s) =>
                  new TextRun({ text: s.text, bold: true, size: 18, color: "1a2332" })
                ),
              })],
              shading: { type: ShadingType.SOLID, color: "f1f5f9" },
            })
          ),
        });
        const dataRows = table.rows.map((row) =>
          new TableRow({
            children: row.map((cell) =>
              new TableCell({
                children: [new Paragraph({
                  children: parseBoldSegments(cell).map((s) =>
                    new TextRun({ text: s.text, bold: s.bold, size: 18, color: "334155" })
                  ),
                })],
              })
            ),
          })
        );
        paragraphs.push(new Paragraph({ spacing: { before: 100 }, children: [] }));
        const tbl = new Table({
          rows: [headerRow, ...dataRows],
          width: { size: 100, type: WidthType.PERCENTAGE },
        });
        paragraphs.push(tbl as any);
        paragraphs.push(new Paragraph({ spacing: { after: 100 }, children: [] }));
      } else {
        tableLines.forEach((tl) => {
          paragraphs.push(new Paragraph({
            children: [new TextRun({ text: stripBold(tl), size: 20 })],
            spacing: { after: 40 },
          }));
        });
      }
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      paragraphs.push(new Paragraph({
        children: parseBoldSegments(trimmed.slice(2)).map((s) =>
          new TextRun({ text: s.text, bold: s.bold, size: 20, color: "334155" })
        ),
        bullet: { level: 0 },
        spacing: { after: 40 },
      }));
      i++;
    } else if (/^\d+\.\s+/.test(trimmed)) {
      const match = trimmed.match(/^\d+\.\s+(.+)/);
      if (match) {
        paragraphs.push(new Paragraph({
          children: parseBoldSegments(match[1]).map((s) =>
            new TextRun({ text: s.text, bold: s.bold, size: 20, color: "334155" })
          ),
          numbering: { reference: "default-numbering", level: 0 },
          spacing: { after: 40 },
        }));
      }
      i++;
    } else if (trimmed === "") {
      paragraphs.push(new Paragraph({ spacing: { after: 80 }, children: [] }));
      i++;
    } else {
      paragraphs.push(new Paragraph({
        children: parseBoldSegments(trimmed).map((s) =>
          new TextRun({ text: s.text, bold: s.bold, size: 20, color: "334155" })
        ),
        spacing: { after: 60 },
      }));
      i++;
    }
  }

  return paragraphs;
}

export async function generateMemoWord(
  memo: InvestorMemo,
  model: FinancialModel | null
): Promise<Buffer> {
  const sections = (memo.sections || {}) as Record<string, { title: string; content: string }>;
  const docSections: any[] = [];

  const coverChildren: Paragraph[] = [
    new Paragraph({ spacing: { before: 600 }, children: [] }),
    new Paragraph({
      children: [new TextRun({ text: "CONFIDENTIAL", size: 20, color: "94a3b8", font: "Calibri" })],
      spacing: { after: 400 },
    }),
    new Paragraph({
      children: [new TextRun({ text: memo.dealName, bold: true, size: 56, color: "1a2332", font: "Calibri" })],
      spacing: { after: 80 },
    }),
    new Paragraph({
      children: [new TextRun({ text: "Investment Memorandum", size: 28, color: "64748b", font: "Calibri" })],
      spacing: { after: 200 },
    }),
  ];

  if (memo.investmentThesis) {
    coverChildren.push(new Paragraph({
      children: [new TextRun({ text: stripBold(memo.investmentThesis.slice(0, 400)), size: 20, color: "475569", italics: true })],
      spacing: { after: 200 },
    }));
  }

  const metaItems = [
    `Innovation Score: ${memo.innovationScore ?? "N/A"} / 100`,
    `Overall Score: ${memo.overallScore ?? "N/A"} / 100`,
    `Documents Analyzed: ${memo.metadata?.documentsProcessed || 0}`,
    `Research Sources: ${memo.metadata?.researchSourcesCount || 0}`,
    `Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
  ];
  metaItems.forEach((item) => {
    coverChildren.push(new Paragraph({
      children: [new TextRun({ text: item, size: 20, color: "64748b" })],
      spacing: { after: 40 },
    }));
  });

  coverChildren.push(
    new Paragraph({ spacing: { before: 400 }, children: [] }),
    new Paragraph({
      children: [new TextRun({ text: "Prepared by Sentinel Counsel LLP", size: 18, color: "94a3b8" })],
    })
  );

  docSections.push({
    properties: {},
    children: coverChildren,
  });

  for (const [, section] of Object.entries(sections)) {
    if (!section.content) continue;

    const sectionChildren: Paragraph[] = [
      new Paragraph({
        children: [new TextRun({ text: stripBold(section.title), bold: true, size: 36, color: "1a2332" })],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 160 },
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 6, color: "6366f1", space: 8 },
        },
      }),
      ...mdToDocxParagraphs(section.content),
    ];

    docSections.push({
      properties: {},
      children: sectionChildren,
    });
  }

  if (model?.scenarios) {
    const scenarios = model.scenarios as any;
    const baseProjections = scenarios?.base?.projections || [];
    const baseValuation = scenarios?.base?.valuation || {};

    const finChildren: Paragraph[] = [
      new Paragraph({
        children: [new TextRun({ text: "Financial Model Summary", bold: true, size: 36, color: "1a2332" })],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 160 },
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 6, color: "6366f1", space: 8 },
        },
      }),
    ];

    if (baseProjections.length > 0) {
      finChildren.push(new Paragraph({
        children: [new TextRun({ text: "Base Case Projections ($000s)", bold: true, size: 24, color: "1a2332" })],
        spacing: { before: 120, after: 80 },
      }));

      const projMetrics = [
        { label: "Revenue", field: "revenue" },
        { label: "EBITDA", field: "ebitda" },
        { label: "EBITDA Margin", field: "ebitdaMargin", isPercent: true },
        { label: "Free Cash Flow", field: "freeCashFlow" },
        { label: "Gross Profit", field: "grossProfit" },
        { label: "Gross Margin", field: "grossMargin", isPercent: true },
      ];

      const headerCells = [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: "Metric", bold: true, size: 18 })] })],
          shading: { type: ShadingType.SOLID, color: "f1f5f9" },
        }),
        ...baseProjections.map((p: any) =>
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ text: String(p.year), bold: true, size: 18 })],
              alignment: AlignmentType.RIGHT,
            })],
            shading: { type: ShadingType.SOLID, color: "f1f5f9" },
          })
        ),
      ];

      const dataRows = projMetrics.map((m) =>
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: m.label, size: 18 })] })],
            }),
            ...baseProjections.map((p: any) => {
              const val = p[m.field];
              const formatted = val == null ? "\u2014" : m.isPercent ? `${val.toFixed(1)}%` : `$${(val / 1000).toFixed(1)}M`;
              return new TableCell({
                children: [new Paragraph({
                  children: [new TextRun({ text: formatted, size: 18 })],
                  alignment: AlignmentType.RIGHT,
                })],
              });
            }),
          ],
        })
      );

      finChildren.push(new Table({
        rows: [new TableRow({ tableHeader: true, children: headerCells }), ...dataRows],
        width: { size: 100, type: WidthType.PERCENTAGE },
      }) as any);
    }

    if (baseValuation.dcf) {
      finChildren.push(
        new Paragraph({ spacing: { before: 200 }, children: [] }),
        new Paragraph({
          children: [new TextRun({ text: "Valuation Summary", bold: true, size: 24, color: "1a2332" })],
          spacing: { before: 120, after: 80 },
        })
      );
      const valItems = [
        ["Enterprise Value (DCF)", `$${(baseValuation.dcf.enterpriseValue / 1000).toFixed(1)}M`],
        ["EV / Revenue", `${baseValuation.dcf.impliedEvRevenue?.toFixed(1) || "N/A"}x`],
        ["EV / EBITDA", `${baseValuation.dcf.impliedEvEbitda?.toFixed(1) || "N/A"}x`],
        ["WACC", `${baseValuation.dcf.wacc?.toFixed(1) || "N/A"}%`],
      ];
      const valRows = valItems.map(([label, value]) =>
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: label, size: 18, color: "64748b" })] })],
            }),
            new TableCell({
              children: [new Paragraph({
                children: [new TextRun({ text: value, bold: true, size: 18, color: "1a2332" })],
                alignment: AlignmentType.RIGHT,
              })],
            }),
          ],
        })
      );
      finChildren.push(new Table({
        rows: valRows,
        width: { size: 50, type: WidthType.PERCENTAGE },
      }) as any);
    }

    docSections.push({ properties: {}, children: finChildren });
  }

  const techAssessment = memo.techAssessment as any;
  if (techAssessment) {
    const techChildren: Paragraph[] = [
      new Paragraph({
        children: [new TextRun({ text: "Technology & Innovation Assessment", bold: true, size: 36, color: "1a2332" })],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 160 },
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 6, color: "6366f1", space: 8 },
        },
      }),
    ];

    if (techAssessment.innovationScore != null) {
      techChildren.push(new Paragraph({
        children: [new TextRun({ text: `Innovation Score: ${techAssessment.innovationScore} / 10`, bold: true, size: 24, color: "6366f1" })],
        spacing: { after: 120 },
      }));
    }

    if (techAssessment.profile) {
      const profile = techAssessment.profile;
      const profileItems = [
        ["Architecture", profile.architecture],
        ["Cloud", profile.cloud],
        ["Data Maturity", profile.dataMaturity],
        ["API Capability", profile.apiCapability],
        ["Security", profile.security],
        ["Team Size", profile.teamSize],
      ].filter(([, v]) => v);

      if (profileItems.length > 0) {
        techChildren.push(new Paragraph({
          children: [new TextRun({ text: "Target Technology Profile", bold: true, size: 24, color: "1a2332" })],
          spacing: { before: 120, after: 80 },
        }));
        profileItems.forEach(([label, value]) => {
          techChildren.push(new Paragraph({
            children: [
              new TextRun({ text: `${label}: `, bold: true, size: 20, color: "64748b" }),
              new TextRun({ text: String(value), size: 20, color: "334155" }),
            ],
            spacing: { after: 40 },
          }));
        });
      }
    }

    if (techAssessment.strengths?.length) {
      techChildren.push(new Paragraph({
        children: [new TextRun({ text: "Strengths", bold: true, size: 24, color: "16a34a" })],
        spacing: { before: 160, after: 60 },
      }));
      techAssessment.strengths.forEach((s: string) => {
        techChildren.push(new Paragraph({
          children: [new TextRun({ text: s, size: 20, color: "334155" })],
          bullet: { level: 0 },
          spacing: { after: 30 },
        }));
      });
    }

    if (techAssessment.weaknesses?.length) {
      techChildren.push(new Paragraph({
        children: [new TextRun({ text: "Weaknesses", bold: true, size: 24, color: "dc2626" })],
        spacing: { before: 160, after: 60 },
      }));
      techAssessment.weaknesses.forEach((w: string) => {
        techChildren.push(new Paragraph({
          children: [new TextRun({ text: w, size: 20, color: "334155" })],
          bullet: { level: 0 },
          spacing: { after: 30 },
        }));
      });
    }

    docSections.push({ properties: {}, children: techChildren });
  }

  const document = new Document({
    creator: "Sentinel Counsel LLP",
    title: `Investor Memo - ${memo.dealName}`,
    description: "Confidential Investment Memorandum",
    numbering: {
      config: [{
        reference: "default-numbering",
        levels: [{
          level: 0,
          format: NumberFormat.DECIMAL,
          text: "%1.",
          alignment: AlignmentType.START,
        }],
      }],
    },
    sections: docSections,
  });

  return await Packer.toBuffer(document);
}

export async function generateMemoExcel(
  memo: InvestorMemo,
  model: FinancialModel | null
): Promise<Buffer> {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

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
