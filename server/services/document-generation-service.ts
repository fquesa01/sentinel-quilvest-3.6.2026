import { GoogleGenAI } from "@google/genai";
import { db } from "../db";
import { 
  generatedDocuments,
  dealTerms,
  deals,
  type InsertGeneratedDocument,
  type GeneratedDocument,
  type DealTerms 
} from "@shared/schema";
import { eq } from "drizzle-orm";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });

interface DocumentGenerationRequest {
  dealId: string;
  documentType: string;
  generatedBy: string;
  customInstructions?: string;
}

interface GenerationResult {
  success: boolean;
  document?: GeneratedDocument;
  error?: string;
}

interface DocumentTemplate {
  name: string;
  sections: string[];
  roles?: string[];
  dealTypes?: string[];
  category: "closing" | "lending" | "investment" | "general" | "corporate";
}

const RE_DEAL_TYPES = ["real_estate", "residential_financed", "residential_cash", "new_construction", "commercial_financed", "commercial_cash", "sale_leaseback", "exchange_1031", "condo_subdivision", "deed_in_lieu", "foreclosure_reo", "short_sale", "estate_probate", "portfolio_bulk", "distressed_asset", "co_op", "mixed_use", "other"];
const MA_DEAL_TYPES = ["ma_asset", "ma_stock", "merger", "jv", "franchise"];
const LENDING_DEAL_TYPES = ["debt", "cmbs", "construction_loan", "loan_assumption", "heloc", "refinance", "commercial_refinance", "reverse_mortgage", "leasehold_financing"];
const INVESTMENT_DEAL_TYPES = ["investment", "capital_stack", "reit_contribution", "opportunity_zone"];
const LEASE_DEAL_TYPES = ["ground_lease", "sale_leaseback"];

const DOCUMENT_TEMPLATES: Record<string, DocumentTemplate> = {
  psa: {
    name: "Purchase and Sale Agreement",
    category: "closing",
    roles: ["buyer", "seller"],
    dealTypes: [...RE_DEAL_TYPES, ...MA_DEAL_TYPES],
    sections: [
      "Recitals",
      "Definitions",
      "Sale of Property",
      "Purchase Price and Earnest Money",
      "Due Diligence Period",
      "Title and Survey",
      "Conditions to Closing",
      "Closing",
      "Representations and Warranties of Seller",
      "Representations and Warranties of Buyer",
      "Covenants",
      "Indemnification",
      "Default and Remedies",
      "Miscellaneous Provisions",
      "Exhibits"
    ]
  },
  amendment: {
    name: "Amendment to Purchase and Sale Agreement",
    category: "closing",
    roles: ["buyer", "seller"],
    dealTypes: [...RE_DEAL_TYPES, ...MA_DEAL_TYPES],
    sections: [
      "Recitals",
      "Amendment of Terms",
      "Ratification",
      "Execution"
    ]
  },
  assignment: {
    name: "Assignment of Purchase and Sale Agreement",
    category: "closing",
    roles: ["buyer"],
    dealTypes: [...RE_DEAL_TYPES, ...MA_DEAL_TYPES],
    sections: [
      "Recitals",
      "Assignment",
      "Assumption of Obligations",
      "Consent of Seller",
      "Representations",
      "Execution"
    ]
  },
  deed: {
    name: "Special Warranty Deed",
    category: "closing",
    roles: ["seller"],
    dealTypes: [...RE_DEAL_TYPES],
    sections: [
      "Grantor Information",
      "Grantee Information",
      "Property Description",
      "Conveyance Language",
      "Warranty",
      "Acknowledgment"
    ]
  },
  quitclaim_deed: {
    name: "Quitclaim Deed",
    category: "closing",
    roles: ["seller"],
    dealTypes: [...RE_DEAL_TYPES],
    sections: [
      "Grantor Information",
      "Grantee Information",
      "Property Description",
      "Quitclaim Language",
      "Acknowledgment"
    ]
  },
  bill_of_sale: {
    name: "Bill of Sale",
    category: "closing",
    roles: ["seller"],
    dealTypes: [...RE_DEAL_TYPES, ...MA_DEAL_TYPES],
    sections: [
      "Seller Information",
      "Buyer Information",
      "Description of Personal Property",
      "Transfer and Conveyance",
      "Warranties",
      "Execution"
    ]
  },
  assignment_of_leases: {
    name: "Assignment and Assumption of Leases",
    category: "closing",
    roles: ["buyer", "seller"],
    dealTypes: [...RE_DEAL_TYPES, ...LEASE_DEAL_TYPES],
    sections: [
      "Recitals",
      "Assignment of Leases",
      "Assumption of Obligations",
      "Proration of Rents",
      "Indemnification",
      "Execution"
    ]
  },
  closing_certificate: {
    name: "Closing Certificate",
    category: "closing",
    roles: ["buyer", "seller"],
    dealTypes: [...RE_DEAL_TYPES, ...MA_DEAL_TYPES],
    sections: [
      "Recitals",
      "Representations and Warranties",
      "Covenants Fulfilled",
      "No Material Adverse Change",
      "Execution"
    ]
  },
  firpta: {
    name: "FIRPTA Affidavit",
    category: "closing",
    roles: ["seller"],
    dealTypes: [...RE_DEAL_TYPES],
    sections: [
      "Transferor Information",
      "Certification of Non-Foreign Status",
      "Tax Identification Number",
      "Acknowledgment"
    ]
  },
  title_affidavit: {
    name: "Title Affidavit",
    category: "closing",
    roles: ["seller"],
    dealTypes: [...RE_DEAL_TYPES],
    sections: [
      "Affiant Information",
      "Property Description",
      "Ownership Statement",
      "Liens and Encumbrances",
      "No Outstanding Disputes",
      "Sworn Statement",
      "Notarization"
    ]
  },
  owners_affidavit: {
    name: "Owner's Affidavit",
    category: "closing",
    roles: ["seller"],
    dealTypes: [...RE_DEAL_TYPES],
    sections: [
      "Affiant Information",
      "Property Ownership Confirmation",
      "No Undisclosed Liens",
      "No Parties in Possession",
      "No Boundary Disputes",
      "Sworn Statement",
      "Notarization"
    ]
  },
  llc_affidavit: {
    name: "LLC / Entity Authority Affidavit",
    category: "corporate",
    sections: [
      "Entity Information",
      "Formation and Good Standing",
      "Authorization to Transact",
      "Authorized Signatories",
      "No Pending Dissolution",
      "Sworn Statement",
      "Notarization"
    ]
  },
  corporate_resolution: {
    name: "Corporate Resolution / Consent",
    category: "corporate",
    sections: [
      "Corporation Information",
      "Board or Shareholder Action",
      "Resolved Transaction Details",
      "Authorized Officers",
      "Certification",
      "Execution"
    ]
  },
  loan_agreement: {
    name: "Loan Agreement",
    category: "lending",
    roles: ["lender", "borrower"],
    dealTypes: [...LENDING_DEAL_TYPES],
    sections: [
      "Recitals",
      "Definitions",
      "Loan Terms and Conditions",
      "Interest Rate and Payments",
      "Disbursement",
      "Representations and Warranties",
      "Affirmative Covenants",
      "Negative Covenants",
      "Events of Default",
      "Remedies",
      "Miscellaneous",
      "Execution"
    ]
  },
  promissory_note: {
    name: "Promissory Note",
    category: "lending",
    roles: ["lender", "borrower"],
    dealTypes: [...LENDING_DEAL_TYPES],
    sections: [
      "Principal Amount",
      "Interest Rate",
      "Payment Schedule",
      "Maturity Date",
      "Prepayment Terms",
      "Default Provisions",
      "Maker Execution"
    ]
  },
  mortgage_deed_of_trust: {
    name: "Mortgage / Deed of Trust",
    category: "lending",
    roles: ["lender", "borrower"],
    dealTypes: [...LENDING_DEAL_TYPES],
    sections: [
      "Parties",
      "Recitals",
      "Granting Clause",
      "Property Description",
      "Obligations Secured",
      "Borrower Covenants",
      "Insurance Requirements",
      "Tax and Assessment Obligations",
      "Default and Acceleration",
      "Foreclosure Provisions",
      "Release Provisions",
      "Execution and Acknowledgment"
    ]
  },
  security_agreement: {
    name: "Security Agreement (UCC)",
    category: "lending",
    roles: ["lender"],
    dealTypes: [...LENDING_DEAL_TYPES],
    sections: [
      "Recitals",
      "Grant of Security Interest",
      "Collateral Description",
      "Debtor Representations",
      "Debtor Covenants",
      "Events of Default",
      "Remedies",
      "Execution"
    ]
  },
  ucc_financing_statement: {
    name: "UCC Financing Statement",
    category: "lending",
    roles: ["lender"],
    dealTypes: [...LENDING_DEAL_TYPES],
    sections: [
      "Debtor Information",
      "Secured Party Information",
      "Collateral Description",
      "Filing Instructions"
    ]
  },
  guaranty: {
    name: "Guaranty Agreement",
    category: "lending",
    roles: ["lender"],
    dealTypes: [...LENDING_DEAL_TYPES],
    sections: [
      "Recitals",
      "Guaranty of Obligations",
      "Guarantor Representations",
      "Guarantor Covenants",
      "Waivers",
      "Events of Default",
      "Remedies",
      "Execution"
    ]
  },
  snda: {
    name: "Subordination, Non-Disturbance and Attornment Agreement",
    category: "lending",
    roles: ["lender", "borrower"],
    dealTypes: [...LENDING_DEAL_TYPES, ...LEASE_DEAL_TYPES],
    sections: [
      "Recitals",
      "Subordination",
      "Non-Disturbance",
      "Attornment",
      "Lender Protections",
      "Tenant Obligations",
      "Execution"
    ]
  },
  subscription_agreement: {
    name: "Subscription Agreement",
    category: "investment",
    roles: ["investor"],
    dealTypes: [...INVESTMENT_DEAL_TYPES],
    sections: [
      "Recitals",
      "Subscription and Purchase",
      "Purchase Price and Payment",
      "Representations of Subscriber",
      "Accredited Investor Certification",
      "Risk Acknowledgment",
      "Restrictions on Transfer",
      "Indemnification",
      "Execution"
    ]
  },
  ppm: {
    name: "Private Placement Memorandum",
    category: "investment",
    roles: ["investee"],
    dealTypes: [...INVESTMENT_DEAL_TYPES],
    sections: [
      "Executive Summary",
      "Investment Overview",
      "Risk Factors",
      "Terms of the Offering",
      "Use of Proceeds",
      "Management Team",
      "Financial Projections",
      "Subscription Procedures",
      "Tax Considerations",
      "Legal Matters"
    ]
  },
  operating_agreement: {
    name: "Operating Agreement (LLC)",
    category: "investment",
    roles: ["investor", "investee"],
    dealTypes: [...INVESTMENT_DEAL_TYPES, "jv"],
    sections: [
      "Formation",
      "Members and Interests",
      "Capital Contributions",
      "Distributions",
      "Management and Voting",
      "Transfer Restrictions",
      "Dissolution",
      "Execution"
    ]
  },
  board_resolution: {
    name: "Board Resolution",
    category: "corporate",
    sections: [
      "Corporation Information",
      "Meeting or Written Consent",
      "Resolved Actions",
      "Authorization of Officers",
      "Certification",
      "Execution"
    ]
  },
  assignment_assumption_agreement: {
    name: "Assignment and Assumption Agreement",
    category: "closing",
    roles: ["buyer"],
    dealTypes: [...RE_DEAL_TYPES, ...MA_DEAL_TYPES],
    sections: [
      "Recitals",
      "Assignment of Rights",
      "Assumption of Obligations",
      "Assumed Liabilities",
      "Excluded Liabilities",
      "Representations and Warranties",
      "Indemnification",
      "Execution"
    ]
  },
  estoppel_certificate: {
    name: "Estoppel Certificate",
    category: "closing",
    roles: ["buyer", "lender"],
    dealTypes: [...RE_DEAL_TYPES, ...LEASE_DEAL_TYPES],
    sections: [
      "Tenant/Landlord Information",
      "Lease Identification",
      "Confirmation of Lease Terms",
      "Rent and Security Deposit Status",
      "No Defaults",
      "No Modifications",
      "Execution"
    ]
  },
  lease_agreement: {
    name: "Commercial Lease Agreement",
    category: "closing",
    roles: ["buyer", "seller"],
    dealTypes: [...LEASE_DEAL_TYPES, ...RE_DEAL_TYPES],
    sections: [
      "Parties",
      "Premises Description",
      "Lease Term",
      "Rent and Escalations",
      "Operating Expenses",
      "Permitted Use",
      "Maintenance and Repairs",
      "Insurance",
      "Default and Remedies",
      "Assignment and Subletting",
      "Execution"
    ]
  },
  letter_of_intent: {
    name: "Letter of Intent",
    category: "general",
    sections: [
      "Parties",
      "Transaction Overview",
      "Key Terms",
      "Due Diligence Period",
      "Exclusivity",
      "Conditions to Closing",
      "Confidentiality",
      "Non-Binding Nature",
      "Execution"
    ]
  },
  closing_statement: {
    name: "Closing Statement / Settlement Statement",
    category: "closing",
    roles: ["buyer", "seller"],
    dealTypes: [...RE_DEAL_TYPES],
    sections: [
      "Transaction Summary",
      "Buyer Credits and Debits",
      "Seller Credits and Debits",
      "Prorations",
      "Closing Costs",
      "Net Proceeds / Amount Due",
      "Certification"
    ]
  },
  environmental_indemnity: {
    name: "Environmental Indemnity Agreement",
    category: "closing",
    roles: ["buyer", "borrower", "lender"],
    dealTypes: [...RE_DEAL_TYPES, ...LENDING_DEAL_TYPES],
    sections: [
      "Recitals",
      "Definitions",
      "Environmental Representations",
      "Indemnification Obligations",
      "Remediation Requirements",
      "Insurance",
      "Execution"
    ]
  },
  general_warranty_deed: {
    name: "General Warranty Deed",
    category: "closing",
    roles: ["seller"],
    dealTypes: [...RE_DEAL_TYPES],
    sections: [
      "Grantor Information",
      "Grantee Information",
      "Property Description",
      "Full Warranty Covenants",
      "Conveyance Language",
      "Acknowledgment"
    ]
  },
  sellers_affidavit: {
    name: "Seller's Affidavit",
    category: "closing",
    roles: ["seller"],
    dealTypes: [...RE_DEAL_TYPES],
    sections: [
      "Affiant / Seller Information",
      "Property Identification",
      "Ownership and Authority",
      "No Undisclosed Liens or Encumbrances",
      "No Pending Litigation",
      "No Parties in Possession",
      "Tax and Assessment Status",
      "Sworn Statement",
      "Notarization"
    ]
  },
  sellers_closing_certificate: {
    name: "Seller's Closing Certificate",
    category: "closing",
    roles: ["seller"],
    dealTypes: [...RE_DEAL_TYPES, ...MA_DEAL_TYPES],
    sections: [
      "Recitals",
      "Representations and Warranties Confirmed",
      "No Material Adverse Change",
      "Covenants Performed",
      "No Defaults",
      "Execution"
    ]
  },
  buyers_closing_certificate: {
    name: "Buyer's Closing Certificate",
    category: "closing",
    roles: ["buyer"],
    dealTypes: [...RE_DEAL_TYPES, ...MA_DEAL_TYPES],
    sections: [
      "Recitals",
      "Representations and Warranties Confirmed",
      "Financing Confirmed",
      "Covenants Performed",
      "No Defaults",
      "Execution"
    ]
  },
  title_commitment_review: {
    name: "Title Commitment Review Letter",
    category: "closing",
    roles: ["buyer"],
    dealTypes: [...RE_DEAL_TYPES],
    sections: [
      "Commitment Summary",
      "Schedule A — Proposed Insured",
      "Schedule B-I — Requirements",
      "Schedule B-II — Exceptions",
      "Objections and Requests",
      "Requested Endorsements",
      "Deadline for Response"
    ]
  },
  survey_review_letter: {
    name: "Survey Review Letter",
    category: "closing",
    roles: ["buyer"],
    dealTypes: [...RE_DEAL_TYPES],
    sections: [
      "Survey Certification",
      "Property Boundaries",
      "Easements and Encroachments",
      "Improvement Location",
      "Flood Zone Determination",
      "Objections and Requirements"
    ]
  },
  borrower_certificate: {
    name: "Borrower's Certificate",
    category: "lending",
    roles: ["borrower"],
    dealTypes: [...LENDING_DEAL_TYPES],
    sections: [
      "Recitals",
      "Representations and Warranties",
      "Financial Condition",
      "No Material Adverse Change",
      "Compliance with Covenants",
      "No Events of Default",
      "Use of Proceeds",
      "Execution"
    ]
  },
  lender_closing_certificate: {
    name: "Lender's Closing Certificate",
    category: "lending",
    roles: ["lender"],
    dealTypes: [...LENDING_DEAL_TYPES],
    sections: [
      "Recitals",
      "Conditions Precedent Satisfied",
      "Loan Authorization",
      "Disbursement Instructions",
      "No Defaults",
      "Execution"
    ]
  },
  compliance_certificate: {
    name: "Compliance Certificate",
    category: "lending",
    roles: ["borrower"],
    dealTypes: [...LENDING_DEAL_TYPES],
    sections: [
      "Reporting Period",
      "Financial Covenant Calculations",
      "Debt Service Coverage Ratio",
      "Loan-to-Value Ratio",
      "Net Operating Income",
      "Certification of Compliance",
      "Execution"
    ]
  },
  investor_rights_agreement: {
    name: "Investor Rights Agreement",
    category: "investment",
    roles: ["investor", "investee"],
    dealTypes: [...INVESTMENT_DEAL_TYPES],
    sections: [
      "Recitals",
      "Definitions",
      "Information Rights",
      "Registration Rights",
      "Preemptive Rights",
      "Co-Sale Rights",
      "Board Observation",
      "Transfer Restrictions",
      "Execution"
    ]
  },
  investor_side_letter: {
    name: "Investor Side Letter",
    category: "investment",
    roles: ["investor"],
    dealTypes: [...INVESTMENT_DEAL_TYPES],
    sections: [
      "Recitals",
      "Fee Reductions or Waivers",
      "Reporting Requirements",
      "Co-Investment Rights",
      "Most Favored Nation",
      "Confidentiality",
      "Execution"
    ]
  },
  capital_call_notice: {
    name: "Capital Call Notice",
    category: "investment",
    roles: ["investor", "investee"],
    dealTypes: [...INVESTMENT_DEAL_TYPES],
    sections: [
      "Fund Information",
      "Call Amount and Purpose",
      "Investor Pro Rata Share",
      "Payment Instructions",
      "Due Date",
      "Default Provisions"
    ]
  },
  distribution_notice: {
    name: "Distribution Notice",
    category: "investment",
    roles: ["investor", "investee"],
    dealTypes: [...INVESTMENT_DEAL_TYPES],
    sections: [
      "Fund Information",
      "Distribution Amount",
      "Waterfall Calculation",
      "Investor Pro Rata Share",
      "Tax Withholding",
      "Payment Method"
    ]
  },
  cap_table_update: {
    name: "Capitalization Table Summary",
    category: "investment",
    roles: ["investor", "investee"],
    dealTypes: [...INVESTMENT_DEAL_TYPES],
    sections: [
      "Pre-Transaction Cap Table",
      "Transaction Details",
      "New Issuance / Transfer",
      "Post-Transaction Cap Table",
      "Dilution Summary",
      "Certification"
    ]
  },
  indemnification_agreement: {
    name: "Indemnification Agreement",
    category: "general",
    sections: [
      "Recitals",
      "Definitions",
      "Indemnification Obligations",
      "Procedures for Claims",
      "Limitations",
      "Insurance",
      "Survival",
      "Execution"
    ]
  },
  confidentiality_agreement: {
    name: "Confidentiality / NDA",
    category: "general",
    sections: [
      "Parties",
      "Definition of Confidential Information",
      "Obligations of Receiving Party",
      "Permitted Disclosures",
      "Term and Termination",
      "Return of Materials",
      "Remedies",
      "Execution"
    ]
  },
  disclosure_schedules: {
    name: "Disclosure Schedules",
    category: "closing",
    roles: ["seller", "investee"],
    dealTypes: [...RE_DEAL_TYPES, ...MA_DEAL_TYPES, ...INVESTMENT_DEAL_TYPES],
    sections: [
      "Schedule Index",
      "Organization and Good Standing",
      "Capitalization",
      "Material Contracts",
      "Litigation and Proceedings",
      "Environmental Matters",
      "Tax Matters",
      "Employee Matters",
      "Insurance",
      "Intellectual Property"
    ]
  },
  reps_warranties_certificate: {
    name: "Representations and Warranties Certificate",
    category: "closing",
    roles: ["buyer", "seller", "lender", "borrower"],
    dealTypes: [...RE_DEAL_TYPES, ...MA_DEAL_TYPES, ...LENDING_DEAL_TYPES],
    sections: [
      "Recitals",
      "Reaffirmation of Representations",
      "Updates to Disclosure Schedules",
      "Material Changes",
      "Bring-Down Certification",
      "Execution"
    ]
  },
  bring_down_certificate: {
    name: "Bring-Down Certificate",
    category: "closing",
    roles: ["buyer", "seller", "lender", "borrower"],
    dealTypes: [...RE_DEAL_TYPES, ...MA_DEAL_TYPES, ...LENDING_DEAL_TYPES],
    sections: [
      "Recitals",
      "Confirmation of Representations",
      "No Material Adverse Change",
      "Conditions Precedent Satisfied",
      "Certification",
      "Execution"
    ]
  },
  organizational_documents: {
    name: "Organizational Documents Package",
    category: "corporate",
    sections: [
      "Certificate of Formation / Incorporation",
      "Operating Agreement / Bylaws",
      "Amendments",
      "Good Standing Certificate",
      "Registered Agent Information",
      "Authorized Signatories",
      "Incumbency Certificate"
    ]
  },
  investor_questionnaire: {
    name: "Investor Questionnaire",
    category: "investment",
    roles: ["investor"],
    dealTypes: [...INVESTMENT_DEAL_TYPES],
    sections: [
      "Investor Identity",
      "Accredited Investor Status",
      "Qualified Purchaser Status",
      "Investment Experience",
      "Financial Information",
      "Risk Acknowledgment",
      "Anti-Money Laundering (AML/KYC)",
      "ERISA / Benefit Plan Status",
      "Tax Status and Residency",
      "Certification and Signature"
    ]
  },
  environmental_assessment_review: {
    name: "Environmental Assessment Review Letter",
    category: "closing",
    roles: ["buyer", "lender"],
    dealTypes: [...RE_DEAL_TYPES, ...LENDING_DEAL_TYPES],
    sections: [
      "Phase I ESA Summary",
      "Recognized Environmental Conditions",
      "Historical Use Review",
      "Regulatory Database Search Results",
      "Recommendations",
      "Phase II Requirements",
      "Risk Assessment"
    ]
  },
};

export class DocumentGenerationService {
  getDocumentTypes(dealType?: string, representationRole?: string): { id: string; name: string; description: string; category: string; recommended: boolean }[] {
    const categoryLabels: Record<string, string> = {
      closing: "Closing Documents",
      lending: "Lending Documents",
      investment: "Investment Documents",
      corporate: "Corporate & Entity Documents",
      general: "General Documents",
    };

    const results: { id: string; name: string; description: string; category: string; recommended: boolean }[] = [];

    for (const [id, template] of Object.entries(DOCUMENT_TEMPLATES)) {
      const matchesDealType = !template.dealTypes || !dealType || template.dealTypes.includes(dealType);
      const matchesRole = !template.roles || !representationRole || template.roles.includes(representationRole);
      const recommended = matchesDealType && matchesRole;

      results.push({
        id,
        name: template.name,
        description: `${template.sections.length} sections`,
        category: categoryLabels[template.category] || template.category,
        recommended,
      });
    }

    results.sort((a, b) => {
      if (a.recommended !== b.recommended) return a.recommended ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return results;
  }

  async generateDocument(request: DocumentGenerationRequest): Promise<GenerationResult> {
    try {
      const terms = await db.query.dealTerms.findFirst({
        where: eq(dealTerms.dealId, request.dealId),
      });

      const [deal] = await db.select().from(deals).where(eq(deals.id, request.dealId));

      if (!terms) {
        return {
          success: false,
          error: "No deal terms found. Please add deal terms first.",
        };
      }

      if (!deal) {
        return {
          success: false,
          error: "Deal not found.",
        };
      }

      const template = DOCUMENT_TEMPLATES[request.documentType];
      if (!template) {
        return {
          success: false,
          error: `Unknown document type: ${request.documentType}`,
        };
      }

      const content = await this.generateDocumentContent(
        template,
        terms,
        deal,
        request.customInstructions
      );

      const [savedDoc] = await db.insert(generatedDocuments).values({
        dealId: request.dealId,
        documentType: request.documentType,
        documentName: `${template.name} - ${deal.title}`,
        generatedContent: content,
        termsSnapshotJson: terms as any,
        dealTermsId: terms.id,
        generatedBy: request.generatedBy,
        status: 'draft',
        version: 1,
      }).returning();

      return {
        success: true,
        document: savedDoc,
      };
    } catch (error: any) {
      console.error("Document generation failed:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private async generateDocumentContent(
    template: { name: string; sections: string[] },
    terms: DealTerms,
    deal: any,
    customInstructions?: string
  ): Promise<string> {
    const prompt = `You are a real estate attorney drafting a ${template.name} for a commercial real estate transaction.

## DEAL TERMS

Property: ${terms.propertyName || 'TBD'} at ${terms.propertyAddress || 'TBD'}, ${terms.propertyCity || ''}, ${terms.propertyState || ''} ${terms.propertyZip || ''}
Property Type: ${terms.propertyType || 'Commercial'}

Buyer: ${terms.buyerName || '[BUYER]'}
Buyer Entity Type: ${terms.buyerEntityType || 'LLC'}
Buyer State of Formation: ${terms.buyerStateOfFormation || '[STATE]'}
Buyer Address: ${terms.buyerAddress || '[ADDRESS]'}
Buyer Signer: ${terms.buyerSignerName || '[NAME]'}, ${terms.buyerSignerTitle || '[TITLE]'}

Seller: ${terms.sellerName || '[SELLER]'}
Seller Entity Type: ${terms.sellerEntityType || 'LLC'}
Seller State of Formation: ${terms.sellerStateOfFormation || '[STATE]'}
Seller Address: ${terms.sellerAddress || '[ADDRESS]'}
Seller Signer: ${terms.sellerSignerName || '[NAME]'}, ${terms.sellerSignerTitle || '[TITLE]'}

Escrow Agent: ${terms.escrowAgentName || '[ESCROW AGENT]'}
Escrow Contact: ${terms.escrowAgentContact || ''}, ${terms.escrowAgentEmail || ''}
Escrow Address: ${terms.escrowAgentAddress || ''}

Purchase Price: ${terms.purchasePrice || '$[AMOUNT]'}
Initial Deposit: ${terms.initialDeposit || '$[AMOUNT]'} due within ${terms.initialDepositDays || '[X]'} business days
Additional Deposit: ${terms.additionalDeposit || 'N/A'} ${terms.additionalDepositTrigger ? `(${terms.additionalDepositTrigger})` : ''}

Effective Date: ${terms.effectiveDate || '[DATE]'}
Due Diligence Period: ${terms.dueDiligencePeriodDays || '[X]'} days
Due Diligence Expiration: ${terms.dueDiligenceExpiration || '[DATE]'}
Closing Date: ${terms.closingDate || '[DATE]'}

Financing Contingency: ${terms.hasFinancingContingency ? `Yes, ${terms.financingContingencyDays || '[X]'} days` : 'No'}

Title Objection Period: ${terms.titleObjectionPeriodDays || '[X]'} days
Survey Objection Period: ${terms.surveyObjectionPeriodDays || '[X]'} days
Title Cure Period: ${terms.titleCurePeriodDays || '[X]'} days
Title Insurance: ${terms.titleInsuranceAmount || 'Equal to Purchase Price'}

Reps Survival: ${terms.repsSurvivalMonths || '[X]'} months
Reps Cap: ${terms.repsCap || 'N/A'}
Reps Basket: ${terms.repsBasket || 'N/A'}

Special Conditions: ${Array.isArray(terms.specialConditions) ? terms.specialConditions.join('; ') : 'None'}

## REQUIRED SECTIONS

${template.sections.map((s, i) => `${i + 1}. ${s}`).join('\n')}

## INSTRUCTIONS

Generate a complete ${template.name} document with all required sections.
Use standard legal language appropriate for a commercial real estate transaction.
Include proper definitions, cross-references, and legal boilerplate.
Use [BRACKETS] for any missing information that needs to be filled in.
Format with clear section headers and numbered paragraphs.

${customInstructions ? `\nADDITIONAL INSTRUCTIONS:\n${customInstructions}` : ''}

Generate the full document now:`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{
        role: "user",
        parts: [{ text: prompt }]
      }],
      config: {
        temperature: 0.3,
        maxOutputTokens: 16000,
      }
    });

    let responseText = '';
    if ((response as any).text) {
      responseText = (response as any).text;
    } else if ((response as any).candidates?.length) {
      for (const candidate of (response as any).candidates) {
        if (candidate.content?.parts) {
          for (const part of candidate.content.parts) {
            if (part.text) {
              responseText += part.text;
            }
          }
        }
      }
    }

    return responseText;
  }

  async getGeneratedDocuments(dealId: string): Promise<GeneratedDocument[]> {
    return await db.query.generatedDocuments.findMany({
      where: eq(generatedDocuments.dealId, dealId),
      orderBy: (docs, { desc }) => [desc(docs.generatedAt)],
    });
  }

  async getGeneratedDocument(id: string): Promise<GeneratedDocument | null> {
    const result = await db.query.generatedDocuments.findFirst({
      where: eq(generatedDocuments.id, id),
    });
    return result || null;
  }

  async updateDocumentStatus(id: string, status: string): Promise<GeneratedDocument> {
    const [updated] = await db.update(generatedDocuments)
      .set({ status, updatedAt: new Date() })
      .where(eq(generatedDocuments.id, id))
      .returning();
    return updated;
  }

  getAvailableDocumentTypes(): { id: string; name: string; sections: string[] }[] {
    return Object.entries(DOCUMENT_TEMPLATES).map(([id, template]) => ({
      id,
      name: template.name,
      sections: template.sections,
    }));
  }
}

export const documentGenerationService = new DocumentGenerationService();
