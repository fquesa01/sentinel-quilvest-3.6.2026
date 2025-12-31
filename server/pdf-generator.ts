import PDFDocument from 'pdfkit';
import type { BusinessSummary } from '@shared/business-summary-types';
import { format } from 'date-fns';

/**
 * Render markdown-like content to PDF with proper formatting
 * Handles bullet points, bold text, headers, and paragraphs
 */
function renderMarkdownContent(doc: PDFKit.PDFDocument, content: string): void {
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip empty lines (just add some space)
    if (!line.trim()) {
      doc.moveDown(0.3);
      continue;
    }
    
    // Check if we need a new page
    if (doc.y > doc.page.height - 80) {
      doc.addPage();
    }
    
    // Handle ### Subheadings
    if (line.match(/^###\s+/)) {
      const headerText = line.replace(/^###\s+/, '').trim();
      doc.moveDown(0.3);
      doc.fontSize(11).font('Helvetica-Bold').text(headerText);
      doc.moveDown(0.2);
      continue;
    }
    
    // Handle ### Subheadings (alternative format with numbers)
    if (line.match(/^####\s+/)) {
      const headerText = line.replace(/^####\s+/, '').trim();
      doc.fontSize(10).font('Helvetica-Bold').text(headerText);
      doc.moveDown(0.2);
      continue;
    }
    
    // Handle bullet points (- or * or •)
    if (line.match(/^\s*[-*•]\s+/)) {
      const bulletText = line.replace(/^\s*[-*•]\s+/, '').trim();
      doc.fontSize(9).font('Helvetica');
      
      // Handle bold text within bullet points
      const formattedText = bulletText.replace(/\*\*(.+?)\*\*/g, (_, text) => text);
      doc.text(`• ${formattedText}`, { indent: 15 });
      continue;
    }
    
    // Handle numbered lists (1. 2. 3. etc.)
    if (line.match(/^\s*\d+\.\s+/)) {
      const numMatch = line.match(/^\s*(\d+)\.\s+(.+)/);
      if (numMatch) {
        const num = numMatch[1];
        const listText = numMatch[2].replace(/\*\*(.+?)\*\*/g, (_, text) => text);
        doc.fontSize(9).font('Helvetica');
        doc.text(`${num}. ${listText}`, { indent: 15 });
      }
      continue;
    }
    
    // Handle tables (simple detection: lines with | characters)
    if (line.includes('|')) {
      doc.fontSize(8).font('Courier');
      doc.text(line.replace(/\|/g, ' | ').trim());
      continue;
    }
    
    // Regular paragraph text
    const cleanText = line
      .replace(/\*\*(.+?)\*\*/g, '$1')  // Remove bold markers
      .replace(/\*(.+?)\*/g, '$1')      // Remove italic markers
      .replace(/`(.+?)`/g, '$1')        // Remove code markers
      .trim();
    
    if (cleanText) {
      doc.fontSize(9).font('Helvetica').text(cleanText);
    }
  }
}

type DocumentExportData = {
  id: string;
  subject: string | null;
  body: string;
  sender: string | null;
  recipients: string[] | null;
  timestamp: Date | null;
  sourceType: string | null;
  tags?: Array<{ tagName: string; category: string; color: string }>;
  annotations?: string | null;
};

export function generateDocumentExportPDF(
  documents: DocumentExportData[],
  options: {
    includeMetadata?: boolean;
    includeAttachments?: boolean;
    includeHighlights?: boolean;
  } = {}
): PDFKit.PDFDocument {
  const { includeMetadata = true, includeAttachments = true, includeHighlights = true } = options;
  
  const doc = new PDFDocument({
    size: 'LETTER',
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    info: {
      Title: `Document Export - ${documents.length} Document${documents.length > 1 ? 's' : ''}`,
      Author: 'Sentinel Counsel LLP',
      Subject: 'Document Export for Review',
      Keywords: 'compliance, document export, evidence',
    }
  });

  // Title Page
  doc.fontSize(20).font('Helvetica-Bold')
    .text('DOCUMENT EXPORT', { align: 'center' });
  
  doc.moveDown(0.5);
  doc.fontSize(12).font('Helvetica')
    .text(`${documents.length} Document${documents.length > 1 ? 's' : ''}`, { align: 'center' });
  
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor('#666666')
    .text(`Export Generated: ${format(new Date(), 'PPpp')}`, { align: 'center' });
  
  doc.moveDown(1);
  doc.fontSize(8).fillColor('#999999')
    .text('CONFIDENTIAL - ATTORNEY WORK PRODUCT', { align: 'center' });
  doc.text('Sentinel Counsel LLP', { align: 'center' });
  
  doc.fillColor('#000000');

  // Add each document
  documents.forEach((document, index) => {
    doc.addPage();
    
    // Document Header
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a56db')
      .text(`Document ${index + 1} of ${documents.length}`);
    doc.moveDown(0.3);
    doc.fillColor('#000000');
    
    // Subject
    doc.fontSize(12).font('Helvetica-Bold')
      .text(document.subject || 'Untitled Document');
    doc.moveDown(0.5);
    
    // Metadata Section
    if (includeMetadata) {
      doc.fontSize(10).font('Helvetica-Bold').text('Metadata:');
      doc.fontSize(9).font('Helvetica');
      
      if (document.sender) {
        doc.text(`From: ${document.sender}`);
      }
      
      if (document.recipients && document.recipients.length > 0) {
        doc.text(`To: ${document.recipients.join(', ')}`);
      }
      
      if (document.timestamp) {
        doc.text(`Date: ${format(new Date(document.timestamp), 'PPpp')}`);
      }
      
      if (document.sourceType) {
        doc.text(`Source: ${document.sourceType}`);
      }
      
      doc.text(`Document ID: ${document.id}`);
      doc.moveDown(0.5);
    }
    
    // Tags Section
    if (document.tags && document.tags.length > 0) {
      doc.fontSize(10).font('Helvetica-Bold').text('Tags:');
      doc.fontSize(9).font('Helvetica');
      document.tags.forEach(tag => {
        doc.text(`• ${tag.tagName} (${tag.category})`);
      });
      doc.moveDown(0.5);
    }
    
    // Annotations Section
    if (includeHighlights && document.annotations) {
      doc.fontSize(10).font('Helvetica-Bold').text('Annotations:');
      doc.fontSize(9).font('Helvetica');
      doc.text(document.annotations);
      doc.moveDown(0.5);
    }
    
    // Document Body
    doc.fontSize(10).font('Helvetica-Bold').text('Content:');
    doc.fontSize(9).font('Helvetica');
    
    // Add horizontal line
    doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
    doc.moveDown(0.5);
    
    // Add body content with word wrapping
    const bodyText = document.body || 'No content available';
    doc.fontSize(9).font('Helvetica').text(bodyText, {
      align: 'left',
      lineGap: 2,
    });
    
    // Add horizontal line at end
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
  });

  // Footer on all pages - must be done before end() for buffered pages
  // Note: bufferedPageRange() returns {start, count} where start is 0-indexed
  const pageRange = doc.bufferedPageRange();
  if (pageRange && typeof pageRange.count === 'number' && pageRange.count > 0) {
    const totalPages = pageRange.count;
    const startPage = pageRange.start || 0;
    for (let i = startPage; i < startPage + totalPages; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).fillColor('#999999')
        .text(
          `Page ${i - startPage + 1} of ${totalPages} | Sentinel Counsel LLP | Confidential`,
          50,
          doc.page.height - 30,
          { align: 'center' }
        );
    }
  }

  // Don't call end() here - let caller pipe first then end
  return doc;
}

export function generateBusinessSummaryPDF(summary: BusinessSummary): PDFKit.PDFDocument {
  const doc = new PDFDocument({
    size: 'LETTER',
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    bufferPages: true,
    info: {
      Title: `Business Summary - ${summary.meta.company_name}`,
      Author: 'Sentinel Counsel LLP',
      Subject: 'Comprehensive Business Intelligence Report',
      Keywords: 'business intelligence, company summary, due diligence',
    }
  });

  // Title Page
  doc.fontSize(24).font('Helvetica-Bold')
    .text('BUSINESS INTELLIGENCE SUMMARY', { align: 'center' });
  
  doc.moveDown(0.5);
  doc.fontSize(18).font('Helvetica')
    .text(summary.meta.company_name, { align: 'center' });
  
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor('#666666')
    .text(`Report Generated: ${summary.meta.report_date}`, { align: 'center' });
  doc.text(`Overall Confidence: ${(summary.meta.overall_confidence * 100).toFixed(1)}%`, { align: 'center' });
  
  doc.moveDown(1);
  doc.fontSize(8).fillColor('#999999')
    .text('CONFIDENTIAL - ATTORNEY WORK PRODUCT', { align: 'center' });
  doc.text('Prepared for External Counsel and Auditor Review', { align: 'center' });
  
  doc.addPage();
  doc.fillColor('#000000');

  // If we have a master report (full 18-section narrative), render it first
  if (summary.master_report) {
    // Parse and render the master report sections
    const masterContent = summary.master_report;
    
    // Split by section headers (## 1. TITLE, ## 2. TITLE, etc.)
    const sections = masterContent.split(/(?=##\s*\d+\.\s+)/);
    
    for (const section of sections) {
      if (!section.trim()) continue;
      
      // Check if this is a numbered section
      const sectionMatch = section.match(/^##\s*(\d+)\.\s+(.+?)(?:\n|$)/);
      
      if (sectionMatch) {
        const sectionNum = sectionMatch[1];
        const sectionTitle = sectionMatch[2].trim();
        const sectionContent = section.substring(sectionMatch[0].length).trim();
        
        // Check if we need a new page (leave ~150 points for content)
        if (doc.y > doc.page.height - 150) {
          doc.addPage();
        }
        
        // Render section header
        addSectionHeader(doc, `${sectionNum}. ${sectionTitle.toUpperCase()}`);
        
        // Render section content with markdown-like formatting
        renderMarkdownContent(doc, sectionContent);
        
        doc.moveDown(1);
      } else if (section.trim()) {
        // Non-numbered content (preamble, etc.)
        doc.fontSize(10).font('Helvetica').text(section.trim());
        doc.moveDown(0.5);
      }
    }
    
    doc.addPage();
  }

  // Section 1: Executive Summary (fallback/supplemental)
  addSectionHeader(doc, '1. EXECUTIVE SUMMARY');
  doc.fontSize(10).font('Helvetica')
    .text(summary.executive_summary.one_paragraph);
  
  doc.moveDown(0.5);
  doc.fontSize(11).font('Helvetica-Bold').text('Key Metrics:');
  doc.fontSize(10).font('Helvetica');
  if (summary.executive_summary.top_metrics.revenue_estimate) {
    doc.text(`• Revenue Estimate: ${summary.executive_summary.top_metrics.revenue_estimate}`);
  }
  if (summary.executive_summary.top_metrics.clients_count) {
    doc.text(`• Clients: ${summary.executive_summary.top_metrics.clients_count}`);
  }
  if (summary.executive_summary.top_metrics.geography) {
    doc.text(`• Geography: ${summary.executive_summary.top_metrics.geography}`);
  }
  
  doc.moveDown(0.5);
  doc.fontSize(11).font('Helvetica-Bold').text('Top Risks:');
  doc.fontSize(10).font('Helvetica');
  if (Array.isArray(summary.executive_summary.top_risks)) {
    summary.executive_summary.top_risks.forEach((risk, idx) => {
      doc.text(`${idx + 1}. ${risk || 'No description'}`);
    });
  } else {
    doc.text('No risks identified');
  }
  
  doc.addPage();

  // Section 2: Business Lines
  addSectionHeader(doc, '2. BUSINESS LINES');
  if (Array.isArray(summary.business_lines) && summary.business_lines.length > 0) {
    summary.business_lines.forEach((line, idx) => {
      if (line && typeof line === 'object') {
        doc.fontSize(11).font('Helvetica-Bold').text(`${idx + 1}. ${line.name || 'Unnamed Business Line'}`);
        doc.fontSize(10).font('Helvetica').text(line.description || 'No description');
        doc.moveDown(0.3);
        if (line.workflow_summary) {
          doc.text(`Workflow: ${line.workflow_summary}`);
        }
        if (line.estimated_value_per_case) {
          doc.text(`Est. Value/Case: ${line.estimated_value_per_case}`);
        }
        if (Array.isArray(line.data_sources) && line.data_sources.length > 0) {
          doc.text(`Data Sources: ${line.data_sources.join(', ')}`);
        }
        doc.moveDown(0.5);
      }
    });
  } else {
    doc.fontSize(10).font('Helvetica').text('No business lines identified');
  }
  
  doc.addPage();

  // Section 3: Corporate History
  addSectionHeader(doc, '3. CORPORATE HISTORY & STRUCTURE');
  doc.fontSize(11).font('Helvetica-Bold').text('Timeline:');
  doc.fontSize(9).font('Helvetica');
  summary.corporate_history.timeline.slice(0, 15).forEach(entry => {
    doc.text(`${entry.date}: ${entry.event}`);
  });
  
  doc.moveDown(0.5);
  doc.fontSize(11).font('Helvetica-Bold').text('Key Entities:');
  doc.fontSize(9).font('Helvetica');
  summary.corporate_history.entities.slice(0, 10).forEach(entity => {
    doc.text(`• ${entity}`);
  });
  
  doc.moveDown(0.5);
  doc.fontSize(11).font('Helvetica-Bold').text('Organizational Chart:');
  doc.fontSize(9).font('Helvetica');
  summary.corporate_history.org_chart.slice(0, 10).forEach(person => {
    doc.text(`• ${person.name} - ${person.role}`);
  });
  
  doc.addPage();

  // Section 4: Transactions
  addSectionHeader(doc, '4. TRANSACTIONS');
  summary.transactions.timeline.slice(0, 10).forEach(txn => {
    doc.fontSize(10).font('Helvetica-Bold').text(`${txn.date}: ${txn.parties.join(' ↔ ')}`);
    doc.fontSize(9).font('Helvetica').text(txn.summary);
    doc.moveDown(0.3);
  });
  
  doc.addPage();

  // Section 5: Major Clients
  addSectionHeader(doc, '5. MAJOR CLIENTS / ASSIGNORS');
  summary.clients.slice(0, 15).forEach(client => {
    doc.fontSize(10).font('Helvetica-Bold').text(client.name);
    doc.fontSize(9).font('Helvetica').text(client.contract_summary);
    doc.moveDown(0.3);
  });
  
  doc.addPage();

  // Section 6: Partners & Vendors
  addSectionHeader(doc, '6. PARTNERS / VENDORS / INVESTORS');
  summary.partners.slice(0, 15).forEach(partner => {
    doc.fontSize(10).font('Helvetica-Bold').text(`${partner.name} (${partner.role})`);
    if (partner.documents.length > 0) {
      doc.fontSize(8).font('Helvetica').text(`Documents: ${partner.documents.join(', ')}`);
    }
    doc.moveDown(0.3);
  });
  
  doc.addPage();

  // Section 7: Technology Stack
  addSectionHeader(doc, '7. TECHNOLOGY STACK');
  doc.fontSize(10).font('Helvetica').text(summary.tech_stack.summary || 'No technology stack information available.');
  
  if (summary.tech_stack.software.length > 0) {
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica-Bold').text('Software Systems:');
    summary.tech_stack.software.slice(0, 15).forEach(sw => {
      doc.fontSize(10).font('Helvetica-Bold').text(`${sw.name} (${sw.category})`);
      doc.fontSize(9).font('Helvetica').text(sw.purpose);
      doc.moveDown(0.3);
    });
  }
  
  if (summary.tech_stack.hardware.length > 0) {
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica-Bold').text('Hardware Systems:');
    summary.tech_stack.hardware.slice(0, 10).forEach(hw => {
      doc.fontSize(10).font('Helvetica-Bold').text(`${hw.name} (${hw.type})`);
      if (hw.purpose) doc.fontSize(9).font('Helvetica').text(hw.purpose);
      doc.moveDown(0.3);
    });
  }
  
  if (summary.tech_stack.tools.length > 0) {
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica-Bold').text('Tools & Utilities:');
    doc.fontSize(9).font('Helvetica');
    summary.tech_stack.tools.slice(0, 15).forEach(tool => {
      doc.text(`• ${tool}`);
    });
  }
  
  doc.addPage();

  // Section 8: Personnel & Organization
  addSectionHeader(doc, '8. PERSONNEL & ORGANIZATION');
  doc.fontSize(10).font('Helvetica').text(summary.personnel.summary || 'No personnel information available.');
  
  if (summary.personnel.org_structure) {
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica-Bold').text('Organizational Structure:');
    doc.fontSize(10).font('Helvetica').text(summary.personnel.org_structure);
  }
  
  // Separate C-suite executives from other personnel
  const cSuiteMembers = summary.personnel.members.filter(m => m.is_c_suite === true);
  const otherMembers = summary.personnel.members.filter(m => m.is_c_suite !== true);
  
  if (cSuiteMembers.length > 0) {
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#1a365d').text('C-SUITE EXECUTIVES:', { underline: true });
    doc.fillColor('#000000');
    cSuiteMembers.forEach(member => {
      doc.fontSize(10).font('Helvetica-Bold').text(`${member.name} - ${member.title}`);
      const details: string[] = [];
      if (member.email) details.push(`Email: ${member.email}`);
      if (member.role) details.push(`Role: ${member.role}`);
      if (member.department) details.push(`Department: ${member.department}`);
      doc.fontSize(9).font('Helvetica').text(details.join(' | '));
      doc.moveDown(0.3);
    });
  }
  
  if (otherMembers.length > 0) {
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica-Bold').text('Other Key Personnel:');
    otherMembers.slice(0, 15).forEach(member => {
      doc.fontSize(10).font('Helvetica-Bold').text(`${member.name} - ${member.title}`);
      const details: string[] = [];
      if (member.email) details.push(`Email: ${member.email}`);
      if (member.role) details.push(`Role: ${member.role}`);
      if (member.department) details.push(`Department: ${member.department}`);
      doc.fontSize(9).font('Helvetica').text(details.join(' | '));
      doc.moveDown(0.3);
    });
  }
  
  doc.addPage();

  // Section 9: Litigation & Regulatory
  addSectionHeader(doc, '9. LITIGATION & REGULATORY FACTS');
  doc.fontSize(11).font('Helvetica-Bold').text('Active Cases:');
  summary.litigation_and_risk.active_cases.slice(0, 10).forEach(c => {
    doc.fontSize(10).font('Helvetica').text(`• ${c.case_name}${c.court ? ` (${c.court})` : ''}${c.status ? ` - ${c.status}` : ''}`);
  });
  
  doc.moveDown(0.5);
  doc.fontSize(11).font('Helvetica-Bold').text('Regulatory Contacts:');
  summary.litigation_and_risk.regulatory_contacts.slice(0, 10).forEach(reg => {
    doc.fontSize(10).font('Helvetica-Bold').text(reg.agency);
    doc.fontSize(9).font('Helvetica').text(reg.notes);
    doc.moveDown(0.3);
  });
  
  doc.addPage();

  // Section 10: Financials
  addSectionHeader(doc, '10. FINANCIALS');
  doc.fontSize(10).font('Helvetica').text(summary.financials.summary || 'No financial data available.');
  
  doc.addPage();

  // Section 11: Exhibits
  addSectionHeader(doc, '11. EXHIBITS & SUPPORTING EVIDENCE');
  summary.exhibits.slice(0, 20).forEach((exhibit, idx) => {
    doc.fontSize(9).font('Helvetica')
      .text(`${idx + 1}. [${exhibit.type}] ${exhibit.title}${exhibit.page ? ` (p. ${exhibit.page})` : ''}`);
  });
  
  doc.addPage();

  // Section 12: Entity Involvement (if available)
  if (summary.entity_involvement) {
    addSectionHeader(doc, '12. ENTITY INVOLVEMENT');
    doc.fontSize(10).font('Helvetica')
      .text(`Analysis based on ${summary.entity_involvement.total_communications_analyzed} communications involving ${summary.entity_involvement.total_unique_entities} unique entities.`);
    doc.moveDown(0.5);
    
    // Employees section
    if (summary.entity_involvement.employees.length > 0) {
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#15803d').text('EMPLOYEES:');
      doc.fillColor('#000000');
      summary.entity_involvement.employees.slice(0, 15).forEach(entity => {
        doc.fontSize(10).font('Helvetica-Bold').text(entity.name);
        const details: string[] = [];
        if (entity.email) details.push(`Email: ${entity.email}`);
        if (entity.department) details.push(`Dept: ${entity.department}`);
        if (entity.role) details.push(`Role: ${entity.role}`);
        details.push(`Comms: ${entity.communication_count}`);
        details.push(`Sent: ${entity.as_sender} | Received: ${entity.as_recipient}`);
        doc.fontSize(8).font('Helvetica').text(details.join(' | '));
        if (entity.first_seen && entity.last_seen) {
          const firstDate = new Date(entity.first_seen).toLocaleDateString();
          const lastDate = new Date(entity.last_seen).toLocaleDateString();
          doc.fontSize(7).fillColor('#666666').text(`Active: ${firstDate} - ${lastDate}`);
          doc.fillColor('#000000');
        }
        doc.moveDown(0.2);
      });
      doc.moveDown(0.5);
    }
    
    // Third Parties section
    if (summary.entity_involvement.third_parties.length > 0) {
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#1a56db').text('THIRD PARTIES:');
      doc.fillColor('#000000');
      summary.entity_involvement.third_parties.slice(0, 15).forEach(entity => {
        doc.fontSize(10).font('Helvetica-Bold').text(entity.name);
        const details: string[] = [];
        if (entity.email) details.push(`Email: ${entity.email}`);
        details.push(`Comms: ${entity.communication_count}`);
        details.push(`Sent: ${entity.as_sender} | Received: ${entity.as_recipient}`);
        doc.fontSize(8).font('Helvetica').text(details.join(' | '));
        doc.moveDown(0.2);
      });
      doc.moveDown(0.5);
    }
    
    // Vendors section
    if (summary.entity_involvement.vendors.length > 0) {
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#b45309').text('VENDORS:');
      doc.fillColor('#000000');
      summary.entity_involvement.vendors.slice(0, 10).forEach(entity => {
        doc.fontSize(10).font('Helvetica-Bold').text(entity.name);
        const details: string[] = [];
        if (entity.email) details.push(`Email: ${entity.email}`);
        details.push(`Comms: ${entity.communication_count}`);
        details.push(`Sent: ${entity.as_sender} | Received: ${entity.as_recipient}`);
        doc.fontSize(8).font('Helvetica').text(details.join(' | '));
        doc.moveDown(0.2);
      });
    }
    
    doc.addPage();
  }

  // Section 13: Appendix
  addSectionHeader(doc, '13. APPENDIX');
  doc.fontSize(11).font('Helvetica-Bold').text('Glossary:');
  doc.fontSize(9).font('Helvetica');
  summary.appendix.glossary.slice(0, 20).forEach(term => {
    doc.text(`• ${term}`);
  });
  
  doc.moveDown(0.5);
  doc.fontSize(11).font('Helvetica-Bold').text('Source Index:');
  doc.fontSize(8).font('Helvetica');
  summary.appendix.raw_source_index.slice(0, 30).forEach(source => {
    doc.text(`• ${source}`);
  });

  // Section 14 & 15: External Web Research (if available)
  if (summary.web_research) {
    doc.addPage();
    
    // Section 14: Media Coverage Analysis
    addSectionHeader(doc, '14. MEDIA COVERAGE ANALYSIS');
    const isWebSearch = summary.web_research?.search_method === 'web_search';
    if (isWebSearch) {
      doc.fontSize(8).font('Helvetica-Oblique').fillColor('#166534')
        .text('Note: This section contains LIVE WEB SEARCH results. Information is current as of the research date. Sources and citations are provided below.');
    } else {
      doc.fontSize(8).font('Helvetica-Oblique').fillColor('#b45309')
        .text('Note: This section uses AI knowledge-based research. Findings are based on the AI model\'s training data and may not reflect the most current events. For critical due diligence, verify through independent sources.');
    }
    doc.moveDown(0.3);
    doc.fillColor('#000000');
    doc.fontSize(10).font('Helvetica').text(summary.web_research.media_coverage.summary || 'No media coverage analysis available.');
    doc.moveDown(0.3);
    const searchMethodLabel = isWebSearch ? 'Live Web Search' : 'AI Knowledge';
    doc.fontSize(8).fillColor('#666666').text(`Research Date: ${summary.web_research.research_date} | Method: ${searchMethodLabel}`);
    doc.fillColor('#000000');
    
    // Positive Media Coverage
    if (summary.web_research.media_coverage.positive.length > 0) {
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#15803d').text('POSITIVE COVERAGE:');
      doc.fillColor('#000000');
      summary.web_research.media_coverage.positive.slice(0, 10).forEach(item => {
        doc.fontSize(10).font('Helvetica-Bold').text(item.headline);
        doc.fontSize(9).font('Helvetica').text(`${item.source} | ${item.date}`);
        doc.fontSize(9).font('Helvetica').text(item.summary);
        if (item.url) {
          doc.fontSize(8).fillColor('#1a56db').text(`Source: ${item.url}`);
          doc.fillColor('#000000');
        }
        doc.moveDown(0.3);
      });
    }
    
    // Negative Media Coverage
    if (summary.web_research.media_coverage.negative.length > 0) {
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#dc2626').text('NEGATIVE COVERAGE:');
      doc.fillColor('#000000');
      summary.web_research.media_coverage.negative.slice(0, 10).forEach(item => {
        doc.fontSize(10).font('Helvetica-Bold').text(item.headline);
        doc.fontSize(9).font('Helvetica').text(`${item.source} | ${item.date}`);
        doc.fontSize(9).font('Helvetica').text(item.summary);
        if (item.url) {
          doc.fontSize(8).fillColor('#1a56db').text(`Source: ${item.url}`);
          doc.fillColor('#000000');
        }
        doc.moveDown(0.3);
      });
    }
    
    // Neutral Media Coverage (brief)
    if (summary.web_research.media_coverage.neutral.length > 0) {
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica-Bold').text('NEUTRAL COVERAGE:');
      summary.web_research.media_coverage.neutral.slice(0, 5).forEach(item => {
        doc.fontSize(9).font('Helvetica').text(`• ${item.headline} (${item.source}, ${item.date})`);
      });
    }
    
    doc.addPage();
    
    // Section 15: External Litigation Research
    addSectionHeader(doc, '15. EXTERNAL LITIGATION RESEARCH');
    if (isWebSearch) {
      doc.fontSize(8).font('Helvetica-Oblique').fillColor('#166534')
        .text('Note: This section contains LIVE WEB SEARCH results for litigation and legal cases. Information is current as of the research date.');
    } else {
      doc.fontSize(8).font('Helvetica-Oblique').fillColor('#b45309')
        .text('Note: This section uses AI knowledge-based research. Findings are based on the AI model\'s training data and may not reflect the most current events. For critical due diligence, verify through independent sources.');
    }
    doc.moveDown(0.3);
    doc.fillColor('#000000');
    doc.fontSize(10).font('Helvetica').text(summary.web_research.external_litigation.summary || 'No external litigation data available.');
    
    // Pending Cases
    if (summary.web_research.external_litigation.pending_cases.length > 0) {
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#dc2626').text('PENDING LITIGATION:');
      doc.fillColor('#000000');
      summary.web_research.external_litigation.pending_cases.forEach(c => {
        doc.fontSize(10).font('Helvetica-Bold').text(c.case_name);
        const caseDetails: string[] = [];
        if (c.case_number) caseDetails.push(`Case #: ${c.case_number}`);
        if (c.court) caseDetails.push(`Court: ${c.court}`);
        if (c.filing_date) caseDetails.push(`Filed: ${c.filing_date}`);
        if (c.case_type) caseDetails.push(`Type: ${c.case_type}`);
        if (caseDetails.length > 0) {
          doc.fontSize(9).font('Helvetica').text(caseDetails.join(' | '));
        }
        if (c.parties && c.parties.length > 0) {
          doc.fontSize(9).font('Helvetica').text(`Parties: ${c.parties.join(', ')}`);
        }
        doc.fontSize(9).font('Helvetica').text(c.summary);
        if (c.monetary_amount) {
          doc.fontSize(9).font('Helvetica-Bold').text(`Amount at Stake: ${c.monetary_amount}`);
        }
        doc.moveDown(0.4);
      });
    }
    
    // Resolved Cases
    if (summary.web_research.external_litigation.resolved_cases.length > 0) {
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica-Bold').text('RESOLVED LITIGATION:');
      summary.web_research.external_litigation.resolved_cases.slice(0, 15).forEach(c => {
        doc.fontSize(10).font('Helvetica-Bold').text(c.case_name);
        const caseDetails: string[] = [];
        if (c.case_number) caseDetails.push(`Case #: ${c.case_number}`);
        if (c.court) caseDetails.push(`Court: ${c.court}`);
        if (c.filing_date) caseDetails.push(`Filed: ${c.filing_date}`);
        if (c.case_type) caseDetails.push(`Type: ${c.case_type}`);
        if (c.status) caseDetails.push(`Status: ${c.status.toUpperCase()}`);
        if (caseDetails.length > 0) {
          doc.fontSize(9).font('Helvetica').text(caseDetails.join(' | '));
        }
        doc.fontSize(9).font('Helvetica').text(c.summary);
        if (c.outcome) {
          doc.fontSize(9).font('Helvetica').text(`Outcome: ${c.outcome}`);
        }
        if (c.monetary_amount) {
          doc.fontSize(9).font('Helvetica-Bold').text(`Settlement/Judgment: ${c.monetary_amount}`);
        }
        doc.moveDown(0.4);
      });
    }
    
    // Regulatory Actions
    if (summary.web_research.regulatory_actions.actions.length > 0) {
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#b45309').text('REGULATORY ACTIONS:');
      doc.fillColor('#000000');
      doc.fontSize(10).font('Helvetica').text(summary.web_research.regulatory_actions.summary || '');
      doc.moveDown(0.3);
      summary.web_research.regulatory_actions.actions.slice(0, 10).forEach(action => {
        doc.fontSize(10).font('Helvetica-Bold').text(`${action.agency} - ${action.action_type}`);
        if (action.date) {
          doc.fontSize(9).font('Helvetica').text(`Date: ${action.date}`);
        }
        doc.fontSize(9).font('Helvetica').text(action.description);
        if (action.status) {
          doc.fontSize(9).font('Helvetica').text(`Status: ${action.status}`);
        }
        if (action.penalties) {
          doc.fontSize(9).font('Helvetica-Bold').fillColor('#dc2626').text(`Penalties: ${action.penalties}`);
          doc.fillColor('#000000');
        }
        doc.moveDown(0.3);
      });
    }
    
    // Overall Risk Assessment
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#7c3aed').text('OVERALL RISK ASSESSMENT:');
    doc.fillColor('#000000');
    doc.fontSize(10).font('Helvetica').text(summary.web_research.overall_risk_assessment);
    
    // Research Sources
    if (summary.web_research.research_sources.length > 0) {
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica-Bold').text('Research Sources:');
      doc.fontSize(8).font('Helvetica');
      summary.web_research.research_sources.slice(0, 15).forEach(source => {
        doc.text(`• ${source}`);
      });
    }
  }

  // Footer on all pages
  const totalPages = doc.bufferedPageRange().count;
  for (let i = 0; i < totalPages; i++) {
    doc.switchToPage(i);
    doc.fontSize(8).fillColor('#999999')
      .text(
        `Page ${i + 1} of ${totalPages} | ${summary.meta.company_name} | Confidential`,
        50,
        doc.page.height - 30,
        { align: 'center' }
      );
  }

  doc.end();
  return doc;
}

function addSectionHeader(doc: InstanceType<typeof PDFDocument>, title: string) {
  doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a56db')
    .text(title);
  doc.moveDown(0.5);
  doc.fillColor('#000000');
}
