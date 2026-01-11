import PDFDocument from 'pdfkit';
import OpenAI from 'openai';
import { GoogleGenAI } from "@google/genai";

// Using Replit's AI Integrations service for OpenAI access
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

// Gemini AI for image generation (Nano Banana)
const geminiAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });

// Timeout helper for async operations with proper null typing
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => {
      console.log(`[PE Intelligence] Image generation timed out after ${timeoutMs}ms, using fallback`);
      resolve(null);
    }, timeoutMs))
  ]);
}

// Generate AI cover image using Gemini Nano Banana
async function generateCoverImage(targetCompany: string, sector: string): Promise<Buffer | null> {
  try {
    console.log(`[PE Intelligence] Generating AI cover image for ${targetCompany} (${sector})...`);
    
    const prompt = `Create a professional, minimalist abstract business graphic suitable for a Private Equity Due Diligence report cover. 
The design should feature: subtle geometric patterns representing data analysis and corporate structure, 
a sophisticated color palette of deep navy blue (#1e3a5f) and light blue accents (#0ea5e9) on white background,
abstract representations of financial growth and business connections,
clean modern lines suggesting professionalism and trust.
The style should be similar to McKinsey or Goldman Sachs report covers - elegant, corporate, and authoritative.
Industry context: ${sector} sector. No text, logos, or human faces. Pure abstract design.`;

    // Use timeout to prevent blocking report generation for too long
    const response = await withTimeout(
      geminiAI.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: prompt,
      }),
      15000 // 15 second timeout for image generation
    );

    // Check if response is null (timeout case) or missing candidates
    if (!response || !response.candidates || !response.candidates[0]?.content?.parts) {
      console.log(`[PE Intelligence] Image generation timed out, failed, or returned no image data`);
      return null;
    }

    // Extract image data from response
    if (response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if ((part as any).inlineData) {
          const imageData = (part as any).inlineData.data;
          const buffer = Buffer.from(imageData, "base64");
          console.log(`[PE Intelligence] Successfully generated AI cover image (${buffer.length} bytes)`);
          return buffer;
        }
      }
    }
    
    console.log(`[PE Intelligence] No image data in Gemini response`);
    return null;
  } catch (error: any) {
    console.error(`[PE Intelligence] AI image generation failed:`, error.message);
    return null;
  }
}

interface PEDeal {
  id: string;
  name: string;
  codeName: string | null;
  status: string;
  dealType: string;
  sector: string;
  subsector: string | null;
  geography: string;
  targetDescription: string | null;
  enterpriseValue: string | null;
  revenue: string | null;
  ebitda: string | null;
}

interface DiligenceSection {
  number: number;
  title: string;
  category: string;
  status: 'complete' | 'partial' | 'not_started' | 'flagged';
  findings: string[];
  riskFlags: {
    severity: 'deal_breaker' | 'price_chip' | 'watch_item' | 'acceptable';
    description: string;
  }[];
  nextSteps: string[];
  confidence: number;
}

interface PEDueDiligenceReport {
  dealId: string;
  targetCompany: string;
  generatedAt: string;
  sections: DiligenceSection[];
  overallScore: number;
  executiveSummary: string;
  keyRisks: string[];
  recommendations: string[];
  webResearch?: {
    mediaAnalysis: string;
    litigationResearch: string;
    regulatoryActions: string;
  };
}

const diligenceSections = [
  { num: 1, title: "Corporate Structure & Organization", category: "legal" },
  { num: 2, title: "Capitalization & Ownership", category: "legal" },
  { num: 3, title: "Subsidiaries & Joint Ventures", category: "legal" },
  { num: 4, title: "Financial Due Diligence", category: "financial" },
  { num: 5, title: "Quality of Earnings Analysis", category: "financial" },
  { num: 6, title: "Working Capital Analysis", category: "financial" },
  { num: 7, title: "Debt & Capital Structure", category: "financial" },
  { num: 8, title: "Tax Matters & Compliance", category: "tax" },
  { num: 9, title: "Legal & Litigation Review", category: "legal" },
  { num: 10, title: "Material Contracts Analysis", category: "commercial" },
  { num: 11, title: "Intellectual Property Assessment", category: "ip" },
  { num: 12, title: "Real Property & Leases", category: "real_estate" },
  { num: 13, title: "Environmental Compliance", category: "environmental" },
  { num: 14, title: "Human Resources & Labor", category: "hr" },
  { num: 15, title: "Insurance Coverage Review", category: "insurance" },
  { num: 16, title: "IT & Cybersecurity", category: "technology" },
  { num: 17, title: "Regulatory & Compliance", category: "regulatory" },
  { num: 18, title: "Customer & Vendor Analysis", category: "commercial" },
  { num: 19, title: "Integration Considerations", category: "integration" },
  { num: 20, title: "Risk Summary & Red Flags", category: "risk" },
];

export async function generatePEDueDiligenceReport(
  deal: PEDeal,
  documents: any[],
  workstreams: any[],
  questions: any[],
  riskFlags: any[],
  targetCompany: string,
  enableWebResearch: boolean
): Promise<PEDueDiligenceReport> {
  console.log(`[PE Intelligence] Generating report for ${targetCompany}`);
  console.log(`[PE Intelligence] Documents: ${documents.length}, Workstreams: ${workstreams.length}, Questions: ${questions.length}`);

  // Build document insights from AI summaries and extracted text
  const buildDocumentInsights = (docs: any[]): string => {
    if (!docs.length) return 'No documents available in the data room.';
    
    const MAX_TOTAL_CHARS = 40000; // ~10k tokens, leaving room for prompt and response
    const MAX_PER_DOC = 2500; // Max chars per document content
    let totalChars = 0;
    
    const insights: string[] = [];
    for (const doc of docs.slice(0, 50)) { // Consider up to 50 docs
      if (totalChars >= MAX_TOTAL_CHARS) {
        insights.push(`[... ${docs.length - insights.length} additional documents not shown due to size limits]`);
        break;
      }
      
      const docInfo: string[] = [];
      docInfo.push(`Document: ${doc.name || 'Untitled'}`);
      if (doc.dataRoom) docInfo.push(`Data Room: ${doc.dataRoom}`);
      if (doc.category) docInfo.push(`Category: ${doc.category}`);
      if (doc.documentType) docInfo.push(`Type: ${doc.documentType}`);
      
      // Use comprehensive summary if available (covers ALL pages), otherwise fall back to aiSummary or extractedText
      if (doc.comprehensiveSummary) {
        const summary = doc.comprehensiveSummary.substring(0, MAX_PER_DOC * 2);
        docInfo.push(`Full Document Analysis (${doc.totalCharacters || 'unknown'} chars, ${doc.chunksProcessed || 'unknown'} sections):`);
        docInfo.push(summary);
        if (doc.comprehensiveSummary.length > MAX_PER_DOC * 2) {
          docInfo.push(`[...additional analysis truncated for token limits]`);
        }
      } else if (doc.aiSummary) {
        const summary = doc.aiSummary.substring(0, MAX_PER_DOC);
        docInfo.push(`Summary: ${summary}${doc.aiSummary.length > MAX_PER_DOC ? '...[truncated]' : ''}`);
      } 
      // Fall back to extracted text (truncated to avoid token limits)
      else if (doc.extractedText) {
        const truncatedText = doc.extractedText.substring(0, MAX_PER_DOC);
        docInfo.push(`Content: ${truncatedText}${doc.extractedText.length > MAX_PER_DOC ? '...[truncated]' : ''}`);
      } else {
        docInfo.push(`Content: [No text extracted]`);
      }
      
      const docEntry = docInfo.join('\n');
      totalChars += docEntry.length;
      insights.push(docEntry);
    }
    
    console.log(`[PE Intelligence] Built insights from ${insights.length} documents (${totalChars} chars)`);
    return insights.join('\n\n---\n\n');
  };

  const documentInsights = buildDocumentInsights(documents);
  
  // Build context from deal data
  const dealContext = `
Target Company: ${targetCompany}
Deal Type: ${deal.dealType}
Sector: ${deal.sector}${deal.subsector ? ` / ${deal.subsector}` : ''}
Geography: ${deal.geography}
Description: ${deal.targetDescription || 'Not provided'}
Enterprise Value: ${deal.enterpriseValue || 'TBD'}
Revenue: ${deal.revenue || 'TBD'}
EBITDA: ${deal.ebitda || 'TBD'}
Status: ${deal.status}

Workstreams Status:
${workstreams.map(w => `- ${w.name}: ${w.status} (${w.progress}% complete)`).join('\n') || 'No workstreams defined'}

Outstanding Diligence Questions: ${questions.filter(q => q.status !== 'answered').length}
Risk Flags Identified: ${riskFlags.length}
${riskFlags.map(r => `- [${r.severity}] ${r.title}: ${r.description}`).join('\n')}

=== DATA ROOM DOCUMENTS AND INSIGHTS (${documents.length} documents) ===
${documentInsights}
  `.trim();

  // Generate comprehensive analysis using AI
  const analysisPrompt = `You are an experienced private equity deal team member conducting due diligence. 
Based on the available deal information AND THE ACTUAL DOCUMENTS PROVIDED, generate a comprehensive due diligence analysis.

CRITICAL INSTRUCTIONS:
- You MUST analyze and reference the actual document content provided below
- Cite specific documents by name when making findings (e.g., "According to the greco appraisal.pdf...")
- Extract and use actual data points from documents (valuations, financial figures, key terms, risks, etc.)
- If a document provides relevant information for a section, mark that section as "complete" or "partial" based on document coverage
- Only mark sections as "not_started" if NO documents address that area

${dealContext}

Generate a detailed analysis for each of the 20 standard due diligence sections. For each section:
1. Assess completeness (complete, partial, not_started, or flagged if issues found) - BASE THIS ON ACTUAL DOCUMENTS AVAILABLE
2. List key findings (at least 2-3 per section) - CITE SPECIFIC DOCUMENTS AND EXTRACT REAL DATA
3. Identify risk flags with severity (deal_breaker, price_chip, watch_item, acceptable)
4. Recommend next steps

Also provide:
- Executive Summary (2-3 paragraphs) - Reference key document findings
- Top 5 Key Risks - Based on actual document analysis
- Top 5 Recommendations

Be specific and actionable. Reference actual document names and data points. If a specific type of information is not available in the documents, note what additional documents are needed.

Respond in JSON format:
{
  "executiveSummary": "string",
  "keyRisks": ["string"],
  "recommendations": ["string"],
  "sections": [
    {
      "number": 1,
      "title": "Corporate Structure & Organization",
      "category": "legal",
      "status": "complete|partial|not_started|flagged",
      "findings": ["string"],
      "riskFlags": [{"severity": "deal_breaker|price_chip|watch_item|acceptable", "description": "string"}],
      "nextSteps": ["string"],
      "confidence": 0.0-1.0
    }
  ],
  "overallScore": 0-100
}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'You are a PE due diligence expert. Respond only with valid JSON.' },
      { role: 'user', content: analysisPrompt }
    ],
    temperature: 0.3,
    max_tokens: 8000,
    response_format: { type: "json_object" },
  });

  let reportData: PEDueDiligenceReport;
  try {
    const parsed = JSON.parse(response.choices[0].message.content || '{}');
    reportData = {
      dealId: deal.id,
      targetCompany,
      generatedAt: new Date().toISOString(),
      executiveSummary: parsed.executiveSummary || 'Analysis pending.',
      keyRisks: parsed.keyRisks || [],
      recommendations: parsed.recommendations || [],
      sections: parsed.sections || diligenceSections.map(s => ({
        number: s.num,
        title: s.title,
        category: s.category,
        status: 'not_started' as const,
        findings: ['Analysis pending'],
        riskFlags: [],
        nextSteps: ['Complete section review'],
        confidence: 0.5
      })),
      overallScore: parsed.overallScore || 65,
    };
  } catch (e) {
    console.error('[PE Intelligence] Failed to parse AI response:', e);
    reportData = {
      dealId: deal.id,
      targetCompany,
      generatedAt: new Date().toISOString(),
      executiveSummary: 'AI analysis failed. Please try again.',
      keyRisks: [],
      recommendations: [],
      sections: diligenceSections.map(s => ({
        number: s.num,
        title: s.title,
        category: s.category,
        status: 'not_started' as const,
        findings: ['Analysis pending'],
        riskFlags: [],
        nextSteps: ['Complete section review'],
        confidence: 0.5
      })),
      overallScore: 50,
    };
  }

  // Web research if enabled
  if (enableWebResearch) {
    console.log('[PE Intelligence] Performing web research...');
    try {
      const webResponse = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a research analyst. Provide current information about the target company based on your knowledge. Focus on media coverage, litigation history, and regulatory issues.'
          },
          {
            role: 'user',
            content: `Research the following company for PE due diligence:

Company: ${targetCompany}
Sector: ${deal.sector}

Provide:
1. Media Coverage Analysis - Recent news, press releases, reputation
2. Litigation Research - Known lawsuits, legal disputes, settlements
3. Regulatory Actions - Any regulatory filings, enforcement actions, compliance issues

Format as JSON:
{
  "mediaAnalysis": "string with findings",
  "litigationResearch": "string with findings", 
  "regulatoryActions": "string with findings"
}`
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: "json_object" },
      });

      const webData = JSON.parse(webResponse.choices[0].message.content || '{}');
      reportData.webResearch = {
        mediaAnalysis: webData.mediaAnalysis || 'No significant media coverage found.',
        litigationResearch: webData.litigationResearch || 'No litigation records identified.',
        regulatoryActions: webData.regulatoryActions || 'No regulatory actions found.',
      };
    } catch (e) {
      console.error('[PE Intelligence] Web research failed:', e);
      reportData.webResearch = {
        mediaAnalysis: 'Web research unavailable.',
        litigationResearch: 'Web research unavailable.',
        regulatoryActions: 'Web research unavailable.',
      };
    }
  }

  return reportData;
}

// Design constants for professional PDF styling
const COLORS = {
  primary: '#1e3a5f',        // Deep navy blue
  secondary: '#2d5a87',      // Medium blue
  accent: '#0ea5e9',         // Bright sky blue
  success: '#059669',        // Emerald green
  warning: '#d97706',        // Amber
  danger: '#dc2626',         // Red
  muted: '#64748b',          // Slate gray
  light: '#f1f5f9',          // Very light gray
  white: '#ffffff',
  black: '#0f172a',          // Slate 900
  text: '#334155',           // Slate 700
  textLight: '#94a3b8',      // Slate 400
  cardBorder: '#e2e8f0',     // Slate 200
  cardBg: '#f8fafc',         // Slate 50
};

const CATEGORY_COLORS: Record<string, { bg: string; accent: string; text: string }> = {
  legal: { bg: '#eff6ff', accent: '#3b82f6', text: '#1e40af' },
  financial: { bg: '#ecfdf5', accent: '#10b981', text: '#047857' },
  tax: { bg: '#fef3c7', accent: '#f59e0b', text: '#b45309' },
  commercial: { bg: '#f0fdf4', accent: '#22c55e', text: '#15803d' },
  ip: { bg: '#faf5ff', accent: '#a855f7', text: '#7e22ce' },
  real_estate: { bg: '#fdf4ff', accent: '#d946ef', text: '#a21caf' },
  environmental: { bg: '#ecfdf5', accent: '#14b8a6', text: '#0f766e' },
  hr: { bg: '#fff1f2', accent: '#f43f5e', text: '#be123c' },
  insurance: { bg: '#f0f9ff', accent: '#0ea5e9', text: '#0369a1' },
  technology: { bg: '#f5f3ff', accent: '#8b5cf6', text: '#6d28d9' },
  regulatory: { bg: '#fefce8', accent: '#eab308', text: '#a16207' },
  integration: { bg: '#f0fdfa', accent: '#2dd4bf', text: '#0f766e' },
  risk: { bg: '#fef2f2', accent: '#ef4444', text: '#b91c1c' },
  web: { bg: '#eff6ff', accent: '#3b82f6', text: '#1d4ed8' },
};

// Helper function to draw a rounded rectangle
function drawRoundedRect(doc: PDFKit.PDFDocument, x: number, y: number, width: number, height: number, radius: number, fillColor?: string, strokeColor?: string) {
  doc.save();
  doc.moveTo(x + radius, y);
  doc.lineTo(x + width - radius, y);
  doc.quadraticCurveTo(x + width, y, x + width, y + radius);
  doc.lineTo(x + width, y + height - radius);
  doc.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  doc.lineTo(x + radius, y + height);
  doc.quadraticCurveTo(x, y + height, x, y + height - radius);
  doc.lineTo(x, y + radius);
  doc.quadraticCurveTo(x, y, x + radius, y);
  doc.closePath();
  
  if (fillColor) {
    doc.fillColor(fillColor).fill();
  }
  if (strokeColor) {
    doc.strokeColor(strokeColor).lineWidth(1).stroke();
  }
  doc.restore();
}

// Helper to draw score circle
function drawScoreCircle(doc: PDFKit.PDFDocument, x: number, y: number, score: number, size: number = 80) {
  const scoreColor = score >= 80 ? COLORS.success : score >= 60 ? COLORS.warning : COLORS.danger;
  const bgColor = score >= 80 ? '#dcfce7' : score >= 60 ? '#fef3c7' : '#fee2e2';
  
  // Draw outer circle background
  doc.save();
  doc.circle(x, y, size).fillColor(bgColor).fill();
  
  // Draw progress arc
  const startAngle = -Math.PI / 2;
  const endAngle = startAngle + (2 * Math.PI * score / 100);
  
  doc.save();
  doc.lineWidth(8);
  doc.strokeColor(scoreColor);
  doc.path(`M ${x} ${y - size + 10}`);
  
  // Draw arc manually
  const arcRadius = size - 10;
  for (let angle = startAngle; angle <= endAngle; angle += 0.1) {
    const px = x + Math.cos(angle) * arcRadius;
    const py = y + Math.sin(angle) * arcRadius;
    if (angle === startAngle) {
      doc.moveTo(px, py);
    } else {
      doc.lineTo(px, py);
    }
  }
  doc.stroke();
  doc.restore();
  
  // Draw score number
  doc.font('Helvetica-Bold').fontSize(28).fillColor(scoreColor);
  doc.text(score.toString(), x - 25, y - 15, { width: 50, align: 'center' });
  doc.fontSize(10).fillColor(COLORS.muted);
  doc.text('SCORE', x - 25, y + 15, { width: 50, align: 'center' });
  doc.restore();
}

// Helper to draw status badge
function drawStatusBadge(doc: PDFKit.PDFDocument, x: number, y: number, status: string) {
  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    complete: { bg: '#dcfce7', text: '#15803d', label: 'COMPLETE' },
    partial: { bg: '#fef3c7', text: '#b45309', label: 'PARTIAL' },
    not_started: { bg: '#f1f5f9', text: '#64748b', label: 'NOT STARTED' },
    flagged: { bg: '#fee2e2', text: '#b91c1c', label: 'FLAGGED' },
  };
  
  const config = statusConfig[status] || statusConfig.not_started;
  const labelWidth = doc.widthOfString(config.label) + 16;
  
  drawRoundedRect(doc, x, y, labelWidth, 18, 4, config.bg);
  doc.font('Helvetica-Bold').fontSize(8).fillColor(config.text);
  doc.text(config.label, x + 8, y + 5);
  
  return labelWidth;
}

// Helper to draw risk severity indicator
function drawRiskBadge(doc: PDFKit.PDFDocument, x: number, y: number, severity: string) {
  const severityConfig: Record<string, { bg: string; text: string; icon: string }> = {
    deal_breaker: { bg: '#fee2e2', text: '#b91c1c', icon: '!!' },
    price_chip: { bg: '#fef3c7', text: '#b45309', icon: '!' },
    watch_item: { bg: '#e0f2fe', text: '#0369a1', icon: '?' },
    acceptable: { bg: '#dcfce7', text: '#15803d', icon: '✓' },
  };
  
  const config = severityConfig[severity] || severityConfig.watch_item;
  const label = severity.replace(/_/g, ' ').toUpperCase();
  const labelWidth = doc.widthOfString(label) + 24;
  
  drawRoundedRect(doc, x, y, labelWidth, 16, 3, config.bg);
  doc.font('Helvetica-Bold').fontSize(7).fillColor(config.text);
  doc.text(config.icon, x + 4, y + 4);
  doc.text(label, x + 16, y + 4);
  
  return labelWidth;
}

export async function generatePEDueDiligencePDF(
  reportData: PEDueDiligenceReport,
  targetCompany: string,
  deal: PEDeal
): Promise<Buffer> {
  const doc = new PDFDocument({ 
    size: 'LETTER',
    margins: { top: 60, bottom: 60, left: 56, right: 56 },
    bufferPages: true,
  });

  const pageWidth = doc.page.width;
  const contentWidth = pageWidth - 112;
  const leftMargin = 56;

  // Generate AI cover image using Gemini Nano Banana
  let coverImage: Buffer | null = null;
  try {
    coverImage = await generateCoverImage(targetCompany, deal.sector);
  } catch (e) {
    console.log('[PE Intelligence] Cover image generation skipped');
  }

  // ========== COVER PAGE ==========
  // Navy blue header banner
  doc.rect(0, 0, pageWidth, 200).fill(COLORS.primary);
  
  // Add AI-generated cover image if available (as decorative element)
  if (coverImage) {
    try {
      // Position AI image as decorative element in top-right corner
      doc.image(coverImage, pageWidth - 180, 20, { 
        width: 140,
        height: 140,
        fit: [140, 140],
        align: 'center',
        valign: 'center'
      });
      console.log('[PE Intelligence] AI cover image embedded in PDF');
    } catch (imgError: any) {
      console.error('[PE Intelligence] Failed to embed cover image:', imgError.message);
    }
  }
  
  // Accent line
  doc.rect(0, 200, pageWidth, 6).fill(COLORS.accent);
  
  // Title text on banner
  doc.font('Helvetica-Bold').fontSize(14).fillColor(COLORS.accent);
  doc.text('SENTINEL COUNSEL LLP', leftMargin, 50);
  
  doc.font('Helvetica-Bold').fontSize(32).fillColor(COLORS.white);
  doc.text('Due Diligence Report', leftMargin, 90);
  
  doc.font('Helvetica').fontSize(16).fillColor('#94b8db');
  doc.text('Private Equity Transaction Analysis', leftMargin, 135);
  
  // Target company name in prominent box
  const targetBoxY = 240;
  drawRoundedRect(doc, leftMargin, targetBoxY, contentWidth, 80, 8, COLORS.cardBg, COLORS.cardBorder);
  
  doc.font('Helvetica').fontSize(11).fillColor(COLORS.muted);
  doc.text('TARGET COMPANY', leftMargin + 20, targetBoxY + 15);
  
  doc.font('Helvetica-Bold').fontSize(24).fillColor(COLORS.primary);
  doc.text(targetCompany, leftMargin + 20, targetBoxY + 35, { width: contentWidth - 40 });
  
  // Deal info grid
  const infoY = 350;
  const colWidth = contentWidth / 3;
  
  const infoItems = [
    { label: 'Deal Type', value: deal.dealType || 'M&A' },
    { label: 'Sector', value: deal.sector || 'Technology' },
    { label: 'Generated', value: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) },
  ];
  
  infoItems.forEach((item, i) => {
    const x = leftMargin + (i * colWidth);
    doc.font('Helvetica').fontSize(10).fillColor(COLORS.muted);
    doc.text(item.label.toUpperCase(), x, infoY);
    doc.font('Helvetica-Bold').fontSize(12).fillColor(COLORS.text);
    doc.text(item.value, x, infoY + 16);
  });
  
  // Overall score visualization
  const scoreY = 450;
  drawRoundedRect(doc, leftMargin, scoreY, contentWidth, 140, 8, COLORS.cardBg, COLORS.cardBorder);
  
  doc.font('Helvetica-Bold').fontSize(12).fillColor(COLORS.text);
  doc.text('OVERALL ASSESSMENT', leftMargin + 20, scoreY + 15);
  
  // Draw score circle
  drawScoreCircle(doc, leftMargin + 70, scoreY + 85, reportData.overallScore, 45);
  
  // Score interpretation
  const scoreLabel = reportData.overallScore >= 80 ? 'Strong Position' : 
                    reportData.overallScore >= 60 ? 'Moderate Concerns' : 'Significant Issues';
  const scoreDesc = reportData.overallScore >= 80 ? 'Deal fundamentals appear sound with manageable risks.' :
                   reportData.overallScore >= 60 ? 'Some areas require attention before proceeding.' :
                   'Critical issues identified requiring immediate resolution.';
  
  doc.font('Helvetica-Bold').fontSize(16).fillColor(COLORS.primary);
  doc.text(scoreLabel, leftMargin + 140, scoreY + 50);
  
  doc.font('Helvetica').fontSize(10).fillColor(COLORS.text);
  doc.text(scoreDesc, leftMargin + 140, scoreY + 75, { width: contentWidth - 180 });
  
  // Section summary
  const complete = reportData.sections.filter(s => s.status === 'complete').length;
  const partial = reportData.sections.filter(s => s.status === 'partial').length;
  const flagged = reportData.sections.filter(s => s.status === 'flagged').length;
  
  doc.font('Helvetica').fontSize(9).fillColor(COLORS.muted);
  doc.text(`${complete} Complete  •  ${partial} In Progress  •  ${flagged} Flagged`, leftMargin + 140, scoreY + 110);
  
  // Confidentiality notice at bottom
  doc.font('Helvetica').fontSize(9).fillColor(COLORS.muted);
  doc.text('CONFIDENTIAL — ATTORNEY WORK PRODUCT — PRIVILEGED', 0, doc.page.height - 80, { align: 'center', width: pageWidth });
  
  // ========== EXECUTIVE SUMMARY PAGE ==========
  doc.addPage();
  
  // Page header bar
  doc.rect(0, 0, pageWidth, 50).fill(COLORS.primary);
  doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.white);
  doc.text('EXECUTIVE SUMMARY', leftMargin, 20);
  doc.font('Helvetica').fontSize(9).fillColor('#94b8db');
  doc.text(targetCompany, pageWidth - 200, 20, { width: 144, align: 'right' });
  
  let y = 80;
  
  // Executive summary text in card
  drawRoundedRect(doc, leftMargin, y, contentWidth, 160, 6, COLORS.cardBg, COLORS.cardBorder);
  
  doc.font('Helvetica').fontSize(10).fillColor(COLORS.text);
  doc.text(reportData.executiveSummary, leftMargin + 16, y + 16, { 
    width: contentWidth - 32, 
    align: 'justify',
    lineGap: 4 
  });
  
  y += 180;
  
  // Key Risks section
  drawRoundedRect(doc, leftMargin, y, (contentWidth - 16) / 2, 220, 6, '#fef2f2', '#fecaca');
  
  doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.danger);
  doc.text('KEY RISKS', leftMargin + 12, y + 12);
  
  doc.font('Helvetica').fontSize(9).fillColor(COLORS.text);
  let riskY = y + 32;
  reportData.keyRisks.slice(0, 5).forEach((risk, i) => {
    doc.font('Helvetica-Bold').fillColor(COLORS.danger).text(`${i + 1}.`, leftMargin + 12, riskY);
    doc.font('Helvetica').fillColor(COLORS.text);
    doc.text(risk, leftMargin + 28, riskY, { width: (contentWidth - 60) / 2, lineGap: 2 });
    riskY += 38;
  });
  
  // Recommendations section
  const recX = leftMargin + (contentWidth + 16) / 2;
  drawRoundedRect(doc, recX, y, (contentWidth - 16) / 2, 220, 6, '#ecfdf5', '#a7f3d0');
  
  doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.success);
  doc.text('RECOMMENDATIONS', recX + 12, y + 12);
  
  doc.font('Helvetica').fontSize(9).fillColor(COLORS.text);
  let recY = y + 32;
  reportData.recommendations.slice(0, 5).forEach((rec, i) => {
    doc.font('Helvetica-Bold').fillColor(COLORS.success).text(`${i + 1}.`, recX + 12, recY);
    doc.font('Helvetica').fillColor(COLORS.text);
    doc.text(rec, recX + 28, recY, { width: (contentWidth - 60) / 2, lineGap: 2 });
    recY += 38;
  });
  
  // ========== DUE DILIGENCE SECTIONS ==========
  let sectionIndex = 0;
  
  for (const section of reportData.sections) {
    // Start new page for every 2 sections
    if (sectionIndex % 2 === 0) {
      doc.addPage();
      
      // Page header
      doc.rect(0, 0, pageWidth, 50).fill(COLORS.primary);
      doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.white);
      doc.text('DUE DILIGENCE FINDINGS', leftMargin, 20);
      doc.font('Helvetica').fontSize(9).fillColor('#94b8db');
      doc.text(targetCompany, pageWidth - 200, 20, { width: 144, align: 'right' });
      
      y = 70;
    }
    
    const categoryStyle = CATEGORY_COLORS[section.category] || CATEGORY_COLORS.legal;
    const sectionHeight = Math.max(200, 80 + (section.findings.length * 18) + (section.riskFlags.length * 24) + (section.nextSteps.length * 18));
    
    // Check if section fits on page
    if (y + sectionHeight > doc.page.height - 100) {
      doc.addPage();
      doc.rect(0, 0, pageWidth, 50).fill(COLORS.primary);
      doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.white);
      doc.text('DUE DILIGENCE FINDINGS', leftMargin, 20);
      doc.font('Helvetica').fontSize(9).fillColor('#94b8db');
      doc.text(targetCompany, pageWidth - 200, 20, { width: 144, align: 'right' });
      y = 70;
    }
    
    // Section card with colored left border
    drawRoundedRect(doc, leftMargin, y, contentWidth, sectionHeight, 6, COLORS.white, COLORS.cardBorder);
    doc.rect(leftMargin, y + 6, 4, sectionHeight - 12).fill(categoryStyle.accent);
    
    // Section header
    doc.font('Helvetica-Bold').fontSize(12).fillColor(COLORS.primary);
    doc.text(`${section.number}. ${section.title}`, leftMargin + 16, y + 12);
    
    // Status badge
    const badgeX = leftMargin + 16;
    drawStatusBadge(doc, badgeX, y + 32, section.status);
    
    // Confidence indicator
    doc.font('Helvetica').fontSize(8).fillColor(COLORS.muted);
    doc.text(`${Math.round(section.confidence * 100)}% confidence`, leftMargin + 120, y + 36);
    
    // Category tag
    doc.font('Helvetica').fontSize(8).fillColor(categoryStyle.text);
    doc.text(section.category.toUpperCase().replace('_', ' '), leftMargin + 200, y + 36);
    
    let contentY = y + 58;
    
    // Findings
    if (section.findings.length > 0) {
      doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.text);
      doc.text('Findings:', leftMargin + 16, contentY);
      contentY += 14;
      
      doc.font('Helvetica').fontSize(9).fillColor(COLORS.text);
      section.findings.forEach(finding => {
        doc.text(`•  ${finding}`, leftMargin + 24, contentY, { width: contentWidth - 50, lineGap: 2 });
        contentY += 16;
      });
    }
    
    // Risk Flags
    if (section.riskFlags.length > 0) {
      contentY += 6;
      doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.danger);
      doc.text('Risk Flags:', leftMargin + 16, contentY);
      contentY += 14;
      
      section.riskFlags.forEach(flag => {
        drawRiskBadge(doc, leftMargin + 24, contentY, flag.severity);
        doc.font('Helvetica').fontSize(9).fillColor(COLORS.text);
        doc.text(flag.description, leftMargin + 110, contentY, { width: contentWidth - 140, lineGap: 2 });
        contentY += 22;
      });
    }
    
    // Next Steps
    if (section.nextSteps.length > 0) {
      contentY += 6;
      doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.secondary);
      doc.text('Next Steps:', leftMargin + 16, contentY);
      contentY += 14;
      
      doc.font('Helvetica').fontSize(9).fillColor(COLORS.text);
      section.nextSteps.forEach(step => {
        doc.text(`→  ${step}`, leftMargin + 24, contentY, { width: contentWidth - 50, lineGap: 2 });
        contentY += 16;
      });
    }
    
    y += sectionHeight + 16;
    sectionIndex++;
  }
  
  // ========== WEB RESEARCH SECTIONS ==========
  if (reportData.webResearch) {
    doc.addPage();
    
    // Page header
    doc.rect(0, 0, pageWidth, 50).fill(COLORS.secondary);
    doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.white);
    doc.text('EXTERNAL RESEARCH — LIVE WEB SEARCH', leftMargin, 20);
    doc.font('Helvetica').fontSize(9).fillColor('#94b8db');
    doc.text(targetCompany, pageWidth - 200, 20, { width: 144, align: 'right' });
    
    y = 70;
    
    const webSections = [
      { num: 21, title: 'Media Coverage Analysis', content: reportData.webResearch.mediaAnalysis, color: COLORS.success },
      { num: 22, title: 'Litigation Research', content: reportData.webResearch.litigationResearch, color: COLORS.warning },
      { num: 23, title: 'Regulatory Actions & Enforcement', content: reportData.webResearch.regulatoryActions, color: COLORS.danger },
    ];
    
    for (const webSection of webSections) {
      const height = 120;
      
      if (y + height > doc.page.height - 100) {
        doc.addPage();
        doc.rect(0, 0, pageWidth, 50).fill(COLORS.secondary);
        doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.white);
        doc.text('EXTERNAL RESEARCH — LIVE WEB SEARCH', leftMargin, 20);
        y = 70;
      }
      
      drawRoundedRect(doc, leftMargin, y, contentWidth, height, 6, COLORS.white, COLORS.cardBorder);
      doc.rect(leftMargin, y + 6, 4, height - 12).fill(webSection.color);
      
      doc.font('Helvetica-Bold').fontSize(12).fillColor(COLORS.primary);
      doc.text(`${webSection.num}. ${webSection.title}`, leftMargin + 16, y + 12);
      
      doc.font('Helvetica').fontSize(9).fillColor(COLORS.text);
      doc.text(webSection.content, leftMargin + 16, y + 34, { 
        width: contentWidth - 32, 
        lineGap: 3,
        height: height - 50 
      });
      
      y += height + 16;
    }
  }
  
  // ========== FOOTER ON ALL PAGES ==========
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);
    
    // Footer line
    doc.rect(leftMargin, doc.page.height - 45, contentWidth, 1).fill(COLORS.cardBorder);
    
    // Footer text
    doc.font('Helvetica').fontSize(8).fillColor(COLORS.muted);
    doc.text(
      `Page ${i + 1} of ${pages.count}`,
      leftMargin,
      doc.page.height - 35
    );
    
    doc.text(
      'CONFIDENTIAL — ATTORNEY WORK PRODUCT',
      0,
      doc.page.height - 35,
      { align: 'center', width: pageWidth }
    );
    
    doc.text(
      new Date().toLocaleDateString(),
      pageWidth - leftMargin - 100,
      doc.page.height - 35,
      { width: 100, align: 'right' }
    );
  }

  // Return a promise that resolves to the completed PDF buffer
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
}
