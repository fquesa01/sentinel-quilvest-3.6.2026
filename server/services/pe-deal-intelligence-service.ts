import PDFDocument from 'pdfkit';
import OpenAI from 'openai';

// Using Replit's AI Integrations service for OpenAI access
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

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

Data Room Documents (${documents.length}):
${documents.slice(0, 20).map(d => `- ${d.name} (${d.category || 'uncategorized'})`).join('\n')}

Workstreams Status:
${workstreams.map(w => `- ${w.name}: ${w.status} (${w.progress}% complete)`).join('\n') || 'No workstreams defined'}

Outstanding Diligence Questions: ${questions.filter(q => q.status !== 'answered').length}
Risk Flags Identified: ${riskFlags.length}
${riskFlags.map(r => `- [${r.severity}] ${r.title}: ${r.description}`).join('\n')}
  `.trim();

  // Generate comprehensive analysis using AI
  const analysisPrompt = `You are an experienced private equity deal team member conducting due diligence. 
Based on the available deal information, generate a comprehensive due diligence analysis.

${dealContext}

Generate a detailed analysis for each of the 20 standard due diligence sections. For each section:
1. Assess completeness (complete, partial, not_started, or flagged if issues found)
2. List key findings (at least 2-3 per section)
3. Identify risk flags with severity (deal_breaker, price_chip, watch_item, acceptable)
4. Recommend next steps

Also provide:
- Executive Summary (2-3 paragraphs)
- Top 5 Key Risks
- Top 5 Recommendations

Be specific and actionable. If information is not available, note what's missing.

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

export function generatePEDueDiligencePDF(
  reportData: PEDueDiligenceReport,
  targetCompany: string,
  deal: PEDeal
): PDFKit.PDFDocument {
  const doc = new PDFDocument({ 
    size: 'LETTER',
    margins: { top: 72, bottom: 72, left: 72, right: 72 },
    bufferPages: true,
  });

  // Title Page
  doc.fontSize(28).font('Helvetica-Bold').text('PRIVATE EQUITY', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(24).text('DUE DILIGENCE REPORT', { align: 'center' });
  doc.moveDown(2);
  doc.fontSize(18).font('Helvetica').text(targetCompany, { align: 'center' });
  doc.moveDown(1);
  doc.fontSize(12).fillColor('#666666').text(`Deal Type: ${deal.dealType}`, { align: 'center' });
  doc.text(`Sector: ${deal.sector}`, { align: 'center' });
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
  doc.moveDown(3);
  
  // Overall Score
  const scoreColor = reportData.overallScore >= 80 ? '#22c55e' : 
                     reportData.overallScore >= 60 ? '#f59e0b' : '#ef4444';
  doc.fillColor(scoreColor).fontSize(48).font('Helvetica-Bold').text(`${reportData.overallScore}`, { align: 'center' });
  doc.fillColor('#666666').fontSize(12).font('Helvetica').text('OVERALL SCORE', { align: 'center' });
  
  doc.moveDown(3);
  doc.fillColor('#999999').fontSize(10).text('CONFIDENTIAL - ATTORNEY WORK PRODUCT', { align: 'center' });

  // Executive Summary
  doc.addPage();
  doc.fillColor('#000000').fontSize(18).font('Helvetica-Bold').text('Executive Summary');
  doc.moveDown(0.5);
  doc.fontSize(11).font('Helvetica').fillColor('#333333');
  doc.text(reportData.executiveSummary, { align: 'justify', lineGap: 4 });

  // Key Risks
  doc.moveDown(1.5);
  doc.fillColor('#ef4444').fontSize(14).font('Helvetica-Bold').text('Key Risks');
  doc.moveDown(0.3);
  doc.fillColor('#333333').fontSize(11).font('Helvetica');
  reportData.keyRisks.forEach((risk, i) => {
    doc.text(`${i + 1}. ${risk}`, { indent: 20, lineGap: 3 });
  });

  // Recommendations
  doc.moveDown(1);
  doc.fillColor('#22c55e').fontSize(14).font('Helvetica-Bold').text('Recommendations');
  doc.moveDown(0.3);
  doc.fillColor('#333333').fontSize(11).font('Helvetica');
  reportData.recommendations.forEach((rec, i) => {
    doc.text(`${i + 1}. ${rec}`, { indent: 20, lineGap: 3 });
  });

  // Due Diligence Sections
  reportData.sections.forEach((section, index) => {
    if (index % 3 === 0) doc.addPage();
    
    const statusColors: Record<string, string> = {
      complete: '#22c55e',
      partial: '#f59e0b',
      not_started: '#6b7280',
      flagged: '#ef4444',
    };

    doc.fillColor('#000000').fontSize(14).font('Helvetica-Bold');
    doc.text(`${section.number}. ${section.title}`);
    
    doc.fillColor(statusColors[section.status] || '#6b7280').fontSize(10).font('Helvetica');
    doc.text(`Status: ${section.status.toUpperCase()} | Confidence: ${Math.round(section.confidence * 100)}%`);
    doc.moveDown(0.3);

    // Findings
    doc.fillColor('#333333').fontSize(10).font('Helvetica-Bold').text('Findings:');
    doc.font('Helvetica').fontSize(10);
    section.findings.forEach(finding => {
      doc.text(`• ${finding}`, { indent: 15, lineGap: 2 });
    });

    // Risk Flags
    if (section.riskFlags.length > 0) {
      doc.moveDown(0.3);
      doc.fillColor('#ef4444').font('Helvetica-Bold').text('Risk Flags:');
      doc.font('Helvetica').fillColor('#333333');
      section.riskFlags.forEach(flag => {
        doc.text(`• [${flag.severity.toUpperCase()}] ${flag.description}`, { indent: 15, lineGap: 2 });
      });
    }

    // Next Steps
    if (section.nextSteps.length > 0) {
      doc.moveDown(0.3);
      doc.fillColor('#3b82f6').font('Helvetica-Bold').text('Next Steps:');
      doc.font('Helvetica').fillColor('#333333');
      section.nextSteps.forEach(step => {
        doc.text(`• ${step}`, { indent: 15, lineGap: 2 });
      });
    }

    doc.moveDown(1);
  });

  // Web Research sections if available
  if (reportData.webResearch) {
    doc.addPage();
    doc.fillColor('#000000').fontSize(18).font('Helvetica-Bold').text('External Research (Live Web Search)');
    doc.moveDown(1);

    doc.fillColor('#22c55e').fontSize(14).font('Helvetica-Bold').text('21. Media Coverage Analysis');
    doc.moveDown(0.3);
    doc.fillColor('#333333').fontSize(10).font('Helvetica');
    doc.text(reportData.webResearch.mediaAnalysis, { lineGap: 3 });
    doc.moveDown(1);

    doc.fillColor('#f59e0b').fontSize(14).font('Helvetica-Bold').text('22. Litigation Research');
    doc.moveDown(0.3);
    doc.fillColor('#333333').fontSize(10).font('Helvetica');
    doc.text(reportData.webResearch.litigationResearch, { lineGap: 3 });
    doc.moveDown(1);

    doc.fillColor('#ef4444').fontSize(14).font('Helvetica-Bold').text('23. Regulatory Actions');
    doc.moveDown(0.3);
    doc.fillColor('#333333').fontSize(10).font('Helvetica');
    doc.text(reportData.webResearch.regulatoryActions, { lineGap: 3 });
  }

  // Footer on all pages
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);
    doc.fontSize(8).fillColor('#999999');
    doc.text(
      `Page ${i + 1} of ${pages.count} | ${targetCompany} Due Diligence Report | Confidential`,
      72,
      doc.page.height - 50,
      { align: 'center', width: doc.page.width - 144 }
    );
  }

  doc.end();
  return doc;
}
