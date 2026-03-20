import mammoth from "mammoth";
import PDFDocument from "pdfkit";

interface ParsedElement {
  type: "heading" | "paragraph" | "list-item" | "break";
  text: string;
  level?: number;
  bold?: boolean;
}

function parseHtmlToElements(html: string): ParsedElement[] {
  const elements: ParsedElement[] = [];

  const tags = html.split(/(<[^>]+>)/);
  let currentText = "";
  let inHeading = 0;
  let inListItem = false;
  let inBold = false;

  for (const tag of tags) {
    if (tag.startsWith("<")) {
      const tagLower = tag.toLowerCase();

      if (tagLower.match(/^<h(\d)/)) {
        const level = parseInt(tagLower.match(/^<h(\d)/)![1]);
        inHeading = level;
        currentText = "";
      } else if (tagLower.match(/^<\/h\d/)) {
        if (currentText.trim()) {
          elements.push({ type: "heading", text: currentText.trim(), level: inHeading });
        }
        inHeading = 0;
        currentText = "";
      } else if (tagLower.startsWith("<li")) {
        inListItem = true;
        currentText = "";
      } else if (tagLower.startsWith("</li")) {
        if (currentText.trim()) {
          elements.push({ type: "list-item", text: currentText.trim() });
        }
        inListItem = false;
        currentText = "";
      } else if (tagLower.startsWith("<p")) {
        currentText = "";
      } else if (tagLower.startsWith("</p")) {
        if (currentText.trim()) {
          elements.push({ type: "paragraph", text: currentText.trim(), bold: inBold });
        }
        currentText = "";
      } else if (tagLower.startsWith("<strong") || tagLower.startsWith("<b>") || tagLower.startsWith("<b ")) {
        inBold = true;
      } else if (tagLower.startsWith("</strong") || tagLower.startsWith("</b>")) {
        inBold = false;
      } else if (tagLower.startsWith("<br")) {
        elements.push({ type: "break", text: "" });
      }
    } else {
      const decoded = tag
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, " ");
      currentText += decoded;
    }
  }

  if (currentText.trim()) {
    elements.push({ type: "paragraph", text: currentText.trim() });
  }

  return elements;
}

export async function convertWordToPdf(buffer: Buffer): Promise<Buffer> {
  const htmlResult = await mammoth.convertToHtml({ buffer });
  const html = htmlResult.value;

  const elements = parseHtmlToElements(html);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "LETTER",
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      bufferPages: true,
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    for (const el of elements) {
      if (doc.y > doc.page.height - 80) {
        doc.addPage();
      }

      switch (el.type) {
        case "heading": {
          const fontSize = el.level === 1 ? 18 : el.level === 2 ? 15 : el.level === 3 ? 13 : 11;
          doc.moveDown(0.5);
          doc.fontSize(fontSize).font("Helvetica-Bold").text(el.text);
          doc.moveDown(0.3);
          break;
        }
        case "list-item":
          doc.fontSize(10).font("Helvetica").text(`  \u2022  ${el.text}`, { lineGap: 2 });
          break;
        case "paragraph":
          doc.fontSize(10).font(el.bold ? "Helvetica-Bold" : "Helvetica").text(el.text, { lineGap: 2 });
          doc.moveDown(0.3);
          break;
        case "break":
          doc.moveDown(0.3);
          break;
      }
    }

    if (elements.length === 0) {
      doc.fontSize(10).font("Helvetica").text("(Empty document)");
    }

    doc.end();
  });
}
