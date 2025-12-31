import { db } from "./db";
import { tags } from "@shared/schema";
import { sql } from "drizzle-orm";

const PRESET_TAGS = [
  // Investigation Type Tags - Main Regulatory Frameworks
  { name: "FCPA", category: "investigation_type" as const, color: "red" as const, description: "Foreign Corrupt Practices Act - Anti-bribery and corruption" },
  { name: "SOX", category: "investigation_type" as const, color: "orange" as const, description: "Sarbanes-Oxley Act - Financial reporting and controls" },
  { name: "Federal Antitrust", category: "investigation_type" as const, color: "orange" as const, description: "Antitrust violations - Price fixing, market allocation" },
  { name: "CTA", category: "investigation_type" as const, color: "yellow" as const, description: "Corporate Transparency Act - Beneficial ownership" },
  { name: "EAR/ITAR", category: "investigation_type" as const, color: "green" as const, description: "Export Controls - Export Administration Regulations / International Traffic in Arms Regulations" },
  { name: "FAR/DFARS", category: "investigation_type" as const, color: "green" as const, description: "Federal Acquisition Regulation / Defense Federal Acquisition Regulation Supplement" },
  { name: "Dodd-Frank", category: "investigation_type" as const, color: "blue" as const, description: "Dodd-Frank Act - Financial regulation and consumer protection" },
  { name: "GLBA", category: "investigation_type" as const, color: "purple" as const, description: "Gramm-Leach-Bliley Act - Financial privacy and data protection" },
  { name: "OFAC", category: "investigation_type" as const, color: "purple" as const, description: "Office of Foreign Assets Control - Sanctions compliance" },
  { name: "USA PATRIOT Act", category: "investigation_type" as const, color: "blue" as const, description: "Anti-terrorism and money laundering prevention" },
  { name: "BSA/AML", category: "investigation_type" as const, color: "blue" as const, description: "Bank Secrecy Act / Anti-Money Laundering" },
  
  // FCPA-Specific Investigation Types
  { name: "FCPA: Bribery", category: "investigation_type" as const, color: "red" as const, description: "Direct or indirect bribery of foreign officials" },
  { name: "FCPA: Books & Records", category: "investigation_type" as const, color: "pink" as const, description: "Inaccurate books, records, or internal accounting controls" },
  { name: "FCPA: Foreign Official", category: "investigation_type" as const, color: "pink" as const, description: "Payments to foreign government officials" },
  { name: "FCPA: Third-Party Agent", category: "investigation_type" as const, color: "pink" as const, description: "Improper payments through intermediaries" },
  { name: "FCPA: Facilitation Payment", category: "investigation_type" as const, color: "pink" as const, description: "Questionable facilitation or grease payments" },
  
  // Antitrust-Specific Investigation Types
  { name: "Antitrust: Price Fixing", category: "investigation_type" as const, color: "orange" as const, description: "Coordinated pricing among competitors" },
  { name: "Antitrust: Market Allocation", category: "investigation_type" as const, color: "orange" as const, description: "Geographic or customer market division" },
  { name: "Antitrust: Bid Rigging", category: "investigation_type" as const, color: "yellow" as const, description: "Coordinated bidding manipulation" },
  { name: "Antitrust: Group Boycott", category: "investigation_type" as const, color: "orange" as const, description: "Collective refusal to deal" },
  { name: "Antitrust: Monopolization", category: "investigation_type" as const, color: "orange" as const, description: "Abuse of market dominance" },
  
  // SOX-Specific Investigation Types
  { name: "SOX: Internal Controls", category: "investigation_type" as const, color: "orange" as const, description: "Internal control deficiencies (§404)" },
  { name: "SOX: Financial Misstatement", category: "investigation_type" as const, color: "red" as const, description: "Material financial reporting errors" },
  { name: "SOX: Disclosure Controls", category: "investigation_type" as const, color: "orange" as const, description: "Disclosure controls and procedures (§302)" },
  { name: "SOX: Document Retention", category: "investigation_type" as const, color: "yellow" as const, description: "Record retention violations (§802)" },
  { name: "SOX: Whistleblower Retaliation", category: "investigation_type" as const, color: "pink" as const, description: "Retaliation against whistleblowers (§806)" },
  
  // CTA-Specific Investigation Types
  { name: "CTA: BOI Filing", category: "investigation_type" as const, color: "yellow" as const, description: "Beneficial Ownership Information reporting" },
  { name: "CTA: Shell Company", category: "investigation_type" as const, color: "orange" as const, description: "Shell company beneficial ownership concealment" },
  { name: "CTA: Filing Deadline", category: "investigation_type" as const, color: "orange" as const, description: "Missed FinCEN filing deadlines" },
  
  // EAR/ITAR-Specific Investigation Types
  { name: "EAR/ITAR: Deemed Export", category: "investigation_type" as const, color: "green" as const, description: "Technology transfer to foreign nationals" },
  { name: "EAR/ITAR: License Violation", category: "investigation_type" as const, color: "green" as const, description: "Export without required license" },
  { name: "EAR/ITAR: Embargoed Country", category: "investigation_type" as const, color: "green" as const, description: "Export to sanctioned jurisdictions" },
  { name: "EAR/ITAR: Dual-Use Tech", category: "investigation_type" as const, color: "blue" as const, description: "Controlled dual-use technology export" },
  
  // FAR/DFARS-Specific Investigation Types
  { name: "FAR: Procurement Integrity", category: "investigation_type" as const, color: "green" as const, description: "Procurement Integrity Act violations" },
  { name: "FAR: Cost Mischarging", category: "investigation_type" as const, color: "green" as const, description: "Improper cost allocation or billing" },
  { name: "FAR: False Claims", category: "investigation_type" as const, color: "blue" as const, description: "False Claims Act violations" },
  { name: "DFARS: Cybersecurity", category: "investigation_type" as const, color: "blue" as const, description: "DFARS 252.204-7012 cybersecurity violations" },
  { name: "FAR: Mandatory Disclosure", category: "investigation_type" as const, color: "green" as const, description: "Failure to disclose violations (§52.203-13)" },
  
  // Dodd-Frank-Specific Investigation Types
  { name: "Dodd-Frank: Whistleblower", category: "investigation_type" as const, color: "green" as const, description: "SEC whistleblower protection (§922)" },
  { name: "Dodd-Frank: Volcker Rule", category: "investigation_type" as const, color: "blue" as const, description: "Proprietary trading violations" },
  { name: "Dodd-Frank: CFPB", category: "investigation_type" as const, color: "blue" as const, description: "Consumer protection violations" },
  { name: "Dodd-Frank: Market Conduct", category: "investigation_type" as const, color: "blue" as const, description: "Market manipulation or abuse" },
  
  // GLBA-Specific Investigation Types
  { name: "GLBA: Privacy Rule", category: "investigation_type" as const, color: "blue" as const, description: "Privacy notice violations (16 CFR Part 313)" },
  { name: "GLBA: Safeguards Rule", category: "investigation_type" as const, color: "blue" as const, description: "Information security program (16 CFR Part 314)" },
  { name: "GLBA: Pretexting", category: "investigation_type" as const, color: "blue" as const, description: "Pretexting and information theft" },
  { name: "GLBA: NPI Disclosure", category: "investigation_type" as const, color: "blue" as const, description: "Nonpublic personal information disclosure" },
  
  // OFAC-Specific Investigation Types
  { name: "OFAC: SDN Screening", category: "investigation_type" as const, color: "blue" as const, description: "Specially Designated Nationals violations" },
  { name: "OFAC: Sanctions Violation", category: "investigation_type" as const, color: "blue" as const, description: "Economic sanctions program violations" },
  { name: "OFAC: Blocked Property", category: "investigation_type" as const, color: "blue" as const, description: "Failure to block or report property" },
  { name: "OFAC: 50% Rule", category: "investigation_type" as const, color: "purple" as const, description: "Aggregate ownership sanctions evasion" },
  
  // USA PATRIOT Act-Specific Investigation Types
  { name: "PATRIOT: CIP/KYC", category: "investigation_type" as const, color: "blue" as const, description: "Customer Identification Program failures" },
  { name: "PATRIOT: PEP Screening", category: "investigation_type" as const, color: "blue" as const, description: "Politically Exposed Persons screening" },
  { name: "PATRIOT: 314(a) Request", category: "investigation_type" as const, color: "purple" as const, description: "Information sharing request compliance" },
  { name: "PATRIOT: CTR Filing", category: "investigation_type" as const, color: "purple" as const, description: "Currency Transaction Report violations" },
  
  // BSA/AML-Specific Investigation Types
  { name: "AML: Structuring", category: "investigation_type" as const, color: "blue" as const, description: "Transaction structuring to evade reporting" },
  { name: "AML: SAR Filing", category: "investigation_type" as const, color: "purple" as const, description: "Suspicious Activity Report failures" },
  { name: "AML: Smurfing", category: "investigation_type" as const, color: "purple" as const, description: "Cash deposit structuring via multiple parties" },
  { name: "AML: Trade-Based", category: "investigation_type" as const, color: "purple" as const, description: "Trade-Based Money Laundering (TBML)" },
  { name: "AML: Shell Company", category: "investigation_type" as const, color: "pink" as const, description: "Shell company layering schemes" },
  
  // Document Classification Tags
  { name: "Relevant", category: "classification" as const, color: "green" as const, description: "Document is relevant to the investigation" },
  { name: "Privileged", category: "classification" as const, color: "purple" as const, description: "Attorney-client privileged communication" },
  { name: "Confidential", category: "classification" as const, color: "red" as const, description: "Confidential information" },
  { name: "Hot Document", category: "classification" as const, color: "pink" as const, description: "Key document requiring immediate attention" },
  { name: "Key Evidence", category: "classification" as const, color: "orange" as const, description: "Critical evidence for the case" },
  { name: "Duplicate", category: "classification" as const, color: "slate" as const, description: "Duplicate document" },
  { name: "Responsive", category: "classification" as const, color: "blue" as const, description: "Responsive to discovery request" },
  { name: "Non-Responsive", category: "classification" as const, color: "slate" as const, description: "Not responsive to discovery request" },
  { name: "Redacted", category: "classification" as const, color: "orange" as const, description: "Contains redactions" },
  { name: "Work Product", category: "classification" as const, color: "purple" as const, description: "Attorney work product" },
  { name: "For Production", category: "classification" as const, color: "blue" as const, description: "Ready for production" },
  { name: "Withheld", category: "classification" as const, color: "purple" as const, description: "Withheld from production" },
  
  // Priority Tags
  { name: "High Priority", category: "priority" as const, color: "red" as const, description: "Requires immediate attention" },
  { name: "For Review", category: "priority" as const, color: "yellow" as const, description: "Needs review" },
  { name: "Needs Analysis", category: "priority" as const, color: "orange" as const, description: "Requires further analysis" },
  { name: "Escalate", category: "priority" as const, color: "pink" as const, description: "Escalate to management" },
  { name: "Pending", category: "priority" as const, color: "orange" as const, description: "Pending action" },
  { name: "Flag for Attorney", category: "priority" as const, color: "purple" as const, description: "Flag for attorney review" },
  { name: "QC Review", category: "priority" as const, color: "blue" as const, description: "Quality control review needed" },
  
  // Evidence Type Tags
  { name: "Email", category: "evidence_type" as const, color: "blue" as const, description: "Email communication" },
  { name: "Contract", category: "evidence_type" as const, color: "green" as const, description: "Contract or agreement" },
  { name: "Financial Record", category: "evidence_type" as const, color: "green" as const, description: "Financial document or record" },
  { name: "Communication", category: "evidence_type" as const, color: "blue" as const, description: "Communication record" },
  { name: "Internal Memo", category: "evidence_type" as const, color: "slate" as const, description: "Internal memorandum" },
  { name: "Policy Document", category: "evidence_type" as const, color: "purple" as const, description: "Company policy or procedure" },
  { name: "Training Material", category: "evidence_type" as const, color: "purple" as const, description: "Training documentation" },
  { name: "Audit Report", category: "evidence_type" as const, color: "purple" as const, description: "Audit or compliance report" },
  { name: "Invoice", category: "evidence_type" as const, color: "blue" as const, description: "Invoice or billing record" },
  { name: "Payment Record", category: "evidence_type" as const, color: "blue" as const, description: "Payment or wire transfer record" },
  { name: "Meeting Notes", category: "evidence_type" as const, color: "orange" as const, description: "Meeting minutes or notes" },
  { name: "Chat/IM", category: "evidence_type" as const, color: "green" as const, description: "Instant messaging or chat records" },
  { name: "Voice Recording", category: "evidence_type" as const, color: "pink" as const, description: "Voice call recording" },
  { name: "Presentation", category: "evidence_type" as const, color: "orange" as const, description: "Presentation slides or materials" },
  { name: "Spreadsheet", category: "evidence_type" as const, color: "yellow" as const, description: "Excel or data spreadsheet" },
];

export async function seedTags() {
  console.log("Seeding pre-set tags...");
  
  try {
    // Check if tags already exist
    const existingTags = await db.select().from(tags).limit(1);
    if (existingTags.length > 0) {
      console.log("Tags already seeded, skipping...");
      return;
    }
    
    // Insert all pre-set tags
    for (const tag of PRESET_TAGS) {
      await db.insert(tags).values({
        ...tag,
        isPreset: true,
        createdBy: null, // System-created
      });
    }
    
    console.log(`Successfully seeded ${PRESET_TAGS.length} pre-set tags`);
  } catch (error) {
    console.error("Error seeding tags:", error);
    throw error;
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedTags()
    .then(() => {
      console.log("Tag seeding completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Tag seeding failed:", error);
      process.exit(1);
    });
}
