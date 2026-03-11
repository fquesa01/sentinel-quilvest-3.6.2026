import { db } from "../db";
import { dealTemplates, templateCategories, templateItems } from "@shared/schema";
import { eq } from "drizzle-orm";

interface TemplateItemData {
  name: string;
  isRequired?: boolean;
  isCritical?: boolean;
  keywords: string[];
}

interface CategoryData {
  name: string;
  icon: string;
  color: string;
  sortOrder: number;
  items: TemplateItemData[];
}

async function seedTemplate(
  name: string,
  slug: string,
  description: string,
  transactionType: string,
  categoriesData: CategoryData[]
) {
  console.log(`Seeding ${name} template...`);
  const existing = await db.select().from(dealTemplates).where(eq(dealTemplates.slug, slug));
  if (existing.length > 0) {
    console.log(`  ${name} already exists, skipping...`);
    return existing[0];
  }

  const [template] = await db.insert(dealTemplates).values({
    name,
    slug,
    description,
    transactionType,
    version: 1,
    isActive: true,
    isDefault: true,
    isSystemTemplate: true,
    usageCount: 0,
  }).returning();

  let totalItems = 0;
  let sortOrderItem = 0;

  for (const catData of categoriesData) {
    const [category] = await db.insert(templateCategories).values({
      templateId: template.id,
      name: catData.name,
      icon: catData.icon,
      color: catData.color,
      sortOrder: catData.sortOrder,
      isCollapsible: true,
      defaultExpanded: true,
    }).returning();

    for (const itemData of catData.items) {
      sortOrderItem++;
      await db.insert(templateItems).values({
        categoryId: category.id,
        templateId: template.id,
        name: itemData.name,
        itemType: "document",
        isRequired: itemData.isRequired || false,
        isCritical: itemData.isCritical || false,
        documentKeywords: itemData.keywords ? JSON.stringify(itemData.keywords) : null,
        sortOrder: sortOrderItem,
        requiredDocumentCount: 1,
      });
      totalItems++;
    }
  }

  console.log(`  Created ${categoriesData.length} categories with ${totalItems} items`);
  return template;
}

export async function seedResidentialFinancedTemplate() {
  return seedTemplate(
    "Residential Purchase — Financed (TRID)",
    "residential-purchase-financed",
    "Comprehensive closing checklist for financed residential purchase transactions (1-4 unit). Covers TRID/RESPA/TILA compliance, Closing Disclosure delivery, title review, lender coordination, and all closing requirements.",
    "residential_financed",
    [
      {
        name: "Engagement & Intake",
        icon: "FileText",
        color: "blue",
        sortOrder: 1,
        items: [
          { name: "Conflict Check Completed", isRequired: true, isCritical: true, keywords: ["conflict check", "conflicts"] },
          { name: "Engagement Letter / Retainer Agreement", isRequired: true, keywords: ["engagement letter", "retainer"] },
          { name: "Purchase and Sale Agreement (PSA)", isRequired: true, isCritical: true, keywords: ["PSA", "purchase agreement", "sale agreement", "contract of sale"] },
          { name: "All Riders and Amendments to PSA", keywords: ["rider", "amendment", "addendum"] },
          { name: "Proof of Earnest Money Deposit", isRequired: true, keywords: ["earnest money", "deposit receipt", "escrow deposit"] },
          { name: "Buyer Identification / KYC Documentation", keywords: ["identification", "KYC", "ID", "driver license"] },
          { name: "Seller Identification Documentation", keywords: ["seller ID", "identification"] },
        ]
      },
      {
        name: "Title & Survey",
        icon: "Map",
        color: "green",
        sortOrder: 2,
        items: [
          { name: "Title Commitment / Title Binder", isRequired: true, isCritical: true, keywords: ["title commitment", "title binder", "preliminary title"] },
          { name: "Title Search Report", isRequired: true, keywords: ["title search", "title report"] },
          { name: "Survey / Survey Affidavit", isRequired: true, keywords: ["survey", "boundary survey", "survey affidavit"] },
          { name: "Legal Description Verification", isRequired: true, keywords: ["legal description", "metes and bounds"] },
          { name: "Judgment / Lien Search Results", isRequired: true, keywords: ["judgment", "lien search", "mechanics lien"] },
          { name: "UCC Search Results", keywords: ["UCC", "UCC search", "financing statement"] },
          { name: "Chain of Title Review", keywords: ["chain of title"] },
          { name: "Title Exception Documents", keywords: ["title exception", "encumbrance"] },
          { name: "Easement Agreements", keywords: ["easement", "right of way"] },
          { name: "CC&Rs / HOA Documents", keywords: ["CC&R", "covenants", "HOA", "homeowners association"] },
        ]
      },
      {
        name: "Disclosures & Contingencies",
        icon: "AlertTriangle",
        color: "amber",
        sortOrder: 3,
        items: [
          { name: "Seller Property Disclosure Statement", isRequired: true, keywords: ["property disclosure", "seller disclosure"] },
          { name: "Lead-Based Paint Disclosure (pre-1978)", isRequired: true, keywords: ["lead paint", "lead-based paint", "lead disclosure"] },
          { name: "Radon Disclosure / Test Results", keywords: ["radon", "radon test"] },
          { name: "Smoke/CO Detector Compliance Certificate", keywords: ["smoke detector", "carbon monoxide", "CO detector"] },
          { name: "Home Inspection Report", keywords: ["home inspection", "inspection report"] },
          { name: "Pest / Termite Inspection Report", keywords: ["pest", "termite", "wood destroying"] },
          { name: "HOA Estoppel / Status Letter", keywords: ["HOA estoppel", "status letter", "association"] },
          { name: "Flood Zone Determination / Flood Certification", keywords: ["flood zone", "FEMA", "flood certification"] },
        ]
      },
      {
        name: "Lender Coordination",
        icon: "Landmark",
        color: "indigo",
        sortOrder: 4,
        items: [
          { name: "Loan Commitment Letter", isRequired: true, isCritical: true, keywords: ["commitment letter", "loan approval", "loan commitment"] },
          { name: "Loan Estimate (LE)", isRequired: true, keywords: ["loan estimate", "LE", "good faith estimate"] },
          { name: "Mortgage / Deed of Trust", isRequired: true, isCritical: true, keywords: ["mortgage", "deed of trust", "security instrument"] },
          { name: "Promissory Note", isRequired: true, isCritical: true, keywords: ["promissory note", "loan note"] },
          { name: "Lender Title Requirements Cleared", isRequired: true, keywords: ["lender requirements", "title requirements"] },
          { name: "Hazard Insurance Binder", isRequired: true, keywords: ["hazard insurance", "homeowners insurance", "property insurance"] },
          { name: "Flood Insurance Policy (if applicable)", keywords: ["flood insurance", "flood policy"] },
          { name: "Appraisal Report", isRequired: true, keywords: ["appraisal", "valuation", "appraiser"] },
          { name: "Lender's Title Insurance Policy", isRequired: true, keywords: ["lender title insurance", "mortgagee policy"] },
        ]
      },
      {
        name: "TRID Compliance / Closing Disclosure",
        icon: "Shield",
        color: "red",
        sortOrder: 5,
        items: [
          { name: "Closing Disclosure — Buyer Version", isRequired: true, isCritical: true, keywords: ["closing disclosure", "CD", "buyer CD"] },
          { name: "Closing Disclosure — Seller Version", isRequired: true, keywords: ["seller closing disclosure", "seller CD"] },
          { name: "3-Business Day CD Delivery Confirmation", isRequired: true, isCritical: true, keywords: ["3-day delivery", "CD delivery", "TRID timing"] },
          { name: "Loan Estimate / CD Reconciliation", isRequired: true, keywords: ["LE CD reconciliation", "tolerance", "changed circumstance"] },
          { name: "Changed Circumstance Documentation (if applicable)", keywords: ["changed circumstance", "revised CD"] },
        ]
      },
      {
        name: "Pre-Closing Preparation",
        icon: "Calculator",
        color: "purple",
        sortOrder: 6,
        items: [
          { name: "Proration Calculations (Taxes, HOA, Utilities)", isRequired: true, keywords: ["proration", "tax proration", "HOA proration"] },
          { name: "Payoff Statement(s) — Seller's Existing Mortgage(s)", isRequired: true, keywords: ["payoff statement", "payoff letter", "mortgage payoff"] },
          { name: "Deed Preparation (Warranty / Special Warranty / Grant)", isRequired: true, isCritical: true, keywords: ["deed", "warranty deed", "grant deed", "special warranty"] },
          { name: "Affidavit of Title", isRequired: true, keywords: ["affidavit of title", "title affidavit"] },
          { name: "FIRPTA Affidavit / Withholding Certificate", isRequired: true, keywords: ["FIRPTA", "withholding", "foreign seller"] },
          { name: "Transfer Tax Return / Declaration of Value", isRequired: true, keywords: ["transfer tax", "transfer declaration", "documentary stamp"] },
          { name: "Authority Documents (POA, Trust Certificate)", keywords: ["power of attorney", "POA", "trust certificate"] },
          { name: "Water / Utility Reading Confirmation", keywords: ["utility reading", "water reading", "final reading"] },
        ]
      },
      {
        name: "Closing Execution",
        icon: "Gavel",
        color: "slate",
        sortOrder: 7,
        items: [
          { name: "All Documents Executed and Notarized", isRequired: true, isCritical: true, keywords: ["execution", "notarized", "signed", "notarization"] },
          { name: "Funds Collected — Buyer's Funds / Wire", isRequired: true, isCritical: true, keywords: ["wire transfer", "funds", "buyer funds", "closing funds"] },
          { name: "Lender Funds Disbursement Authorization", isRequired: true, keywords: ["disbursement", "lender funds", "funding"] },
          { name: "Recording Instructions Prepared", isRequired: true, keywords: ["recording instructions", "recording"] },
          { name: "Closing Statement Finalized", isRequired: true, keywords: ["settlement statement", "closing statement", "final statement"] },
        ]
      },
      {
        name: "Post-Closing",
        icon: "CheckCircle",
        color: "emerald",
        sortOrder: 8,
        items: [
          { name: "Deed Recorded — Confirmation with Book/Page", isRequired: true, keywords: ["recorded deed", "book page", "instrument number"] },
          { name: "Mortgage Recorded", isRequired: true, keywords: ["recorded mortgage", "mortgage recording"] },
          { name: "Owner's Title Insurance Policy Issued", isRequired: true, keywords: ["owner's title policy", "final title policy"] },
          { name: "Lender's Title Insurance Policy Issued", isRequired: true, keywords: ["lender title policy"] },
          { name: "Satisfaction / Release of Seller's Mortgage", isRequired: true, keywords: ["satisfaction", "release", "discharge", "mortgage release"] },
          { name: "Final Closing Disclosure (if adjusted)", keywords: ["final CD", "adjusted CD", "post-closing adjustment"] },
          { name: "1099-S Filed / Delivered", isRequired: true, keywords: ["1099-S", "1099", "tax reporting"] },
          { name: "Recorded Documents Distributed to All Parties", keywords: ["document distribution", "closing binder"] },
        ]
      },
    ]
  );
}

export async function seedResidentialCashTemplate() {
  return seedTemplate(
    "Residential Purchase — Cash (No Lender)",
    "residential-purchase-cash",
    "Closing checklist for all-cash residential purchases with no lender involvement. No TRID/RESPA requirements apply. Includes FinCEN GTO compliance for high-value cash transactions.",
    "residential_cash",
    [
      {
        name: "Engagement & Contract",
        icon: "FileText",
        color: "blue",
        sortOrder: 1,
        items: [
          { name: "Conflict Check Completed", isRequired: true, isCritical: true, keywords: ["conflict check"] },
          { name: "Engagement Letter / Retainer Agreement", isRequired: true, keywords: ["engagement letter", "retainer"] },
          { name: "Purchase and Sale Agreement (PSA)", isRequired: true, isCritical: true, keywords: ["PSA", "purchase agreement", "sale agreement"] },
          { name: "All Amendments / Riders to PSA", keywords: ["amendment", "rider", "addendum"] },
          { name: "Proof of Earnest Money Deposit", isRequired: true, keywords: ["earnest money", "deposit"] },
          { name: "Proof of Funds (Bank Statement / LOC)", isRequired: true, keywords: ["proof of funds", "bank statement", "letter of credit"] },
        ]
      },
      {
        name: "Title & Survey",
        icon: "Map",
        color: "green",
        sortOrder: 2,
        items: [
          { name: "Title Commitment / Title Binder", isRequired: true, isCritical: true, keywords: ["title commitment", "title binder"] },
          { name: "Title Search Report", isRequired: true, keywords: ["title search"] },
          { name: "Survey / Survey Affidavit", isRequired: true, keywords: ["survey", "survey affidavit"] },
          { name: "Legal Description Verification", isRequired: true, keywords: ["legal description"] },
          { name: "Judgment / Lien Search Results", isRequired: true, keywords: ["judgment", "lien search"] },
          { name: "Title Exception Review", keywords: ["title exception", "encumbrance"] },
        ]
      },
      {
        name: "Due Diligence & Disclosures",
        icon: "Search",
        color: "amber",
        sortOrder: 3,
        items: [
          { name: "Seller Property Disclosure Statement", isRequired: true, keywords: ["property disclosure", "seller disclosure"] },
          { name: "Lead-Based Paint Disclosure (pre-1978)", keywords: ["lead paint", "lead disclosure"] },
          { name: "Home Inspection Report", keywords: ["home inspection", "inspection report"] },
          { name: "Confirm No Liens, Judgments, Unpaid Taxes", isRequired: true, keywords: ["no liens", "tax status", "judgment search"] },
          { name: "Open Building Permits Check", keywords: ["open permits", "building permits"] },
          { name: "Flood Zone Determination", keywords: ["flood zone", "FEMA"] },
        ]
      },
      {
        name: "FinCEN / Compliance",
        icon: "Shield",
        color: "red",
        sortOrder: 4,
        items: [
          { name: "FinCEN GTO Report (if applicable — cash entity buyer)", keywords: ["FinCEN", "GTO", "geographic targeting order", "beneficial ownership"] },
          { name: "Corporate Transparency Act / BOI Reporting", keywords: ["CTA", "BOI", "beneficial ownership information"] },
          { name: "Entity Buyer Authority Documents", keywords: ["entity", "LLC", "corporation", "resolution"] },
        ]
      },
      {
        name: "Pre-Closing & Closing Documents",
        icon: "Gavel",
        color: "purple",
        sortOrder: 5,
        items: [
          { name: "Cash Settlement Statement", isRequired: true, isCritical: true, keywords: ["settlement statement", "cash settlement", "closing statement"] },
          { name: "Deed (Warranty / Special Warranty / Grant)", isRequired: true, isCritical: true, keywords: ["deed", "warranty deed", "grant deed"] },
          { name: "Proration Calculations (Taxes, HOA, Utilities)", isRequired: true, keywords: ["proration", "tax proration"] },
          { name: "Affidavit of Title", isRequired: true, keywords: ["affidavit of title"] },
          { name: "FIRPTA Affidavit", isRequired: true, keywords: ["FIRPTA", "withholding"] },
          { name: "Transfer Tax Return", isRequired: true, keywords: ["transfer tax", "transfer declaration"] },
          { name: "Authority Documents (POA, Trust Certificate)", keywords: ["power of attorney", "trust certificate"] },
        ]
      },
      {
        name: "Closing Execution & Recording",
        icon: "CheckCircle",
        color: "emerald",
        sortOrder: 6,
        items: [
          { name: "All Documents Executed and Notarized", isRequired: true, keywords: ["execution", "notarized"] },
          { name: "Funds Collected and Disbursed via Escrow", isRequired: true, isCritical: true, keywords: ["funds", "wire transfer", "escrow"] },
          { name: "Deed Recorded", isRequired: true, keywords: ["recorded deed", "recording"] },
          { name: "Owner's Title Insurance Policy Issued", isRequired: true, keywords: ["owner's title policy", "title policy"] },
          { name: "1099-S Filed", isRequired: true, keywords: ["1099-S", "1099"] },
          { name: "Recorded Documents Distributed", keywords: ["document distribution"] },
        ]
      },
    ]
  );
}

export async function seedResidentialRefinanceTemplate() {
  return seedTemplate(
    "Residential Refinance",
    "residential-refinance",
    "Closing checklist for residential refinance transactions. Covers TRID compliance, existing mortgage payoff coordination, 3-business-day rescission period, and new mortgage origination.",
    "refinance",
    [
      {
        name: "Engagement & Existing Loan Review",
        icon: "FileText",
        color: "blue",
        sortOrder: 1,
        items: [
          { name: "Engagement Letter / Retainer Agreement", isRequired: true, keywords: ["engagement letter", "retainer"] },
          { name: "Existing Mortgage / Note Details Collected", isRequired: true, keywords: ["existing mortgage", "current loan"] },
          { name: "New Lender Commitment Letter", isRequired: true, isCritical: true, keywords: ["commitment letter", "loan approval"] },
          { name: "Borrower Financial Documentation", keywords: ["financial documents", "income verification", "bank statements"] },
        ]
      },
      {
        name: "Title & Payoff",
        icon: "Map",
        color: "green",
        sortOrder: 2,
        items: [
          { name: "Title Search (Intervening Liens)", isRequired: true, isCritical: true, keywords: ["title search", "intervening lien", "title update"] },
          { name: "Title Commitment / Title Binder", isRequired: true, keywords: ["title commitment"] },
          { name: "Payoff Statement from Existing Lender(s)", isRequired: true, isCritical: true, keywords: ["payoff statement", "payoff letter", "per diem interest"] },
          { name: "Per Diem Interest Calculation", isRequired: true, keywords: ["per diem", "daily interest"] },
          { name: "Subordination Agreement (if second lien remains)", keywords: ["subordination", "second mortgage"] },
        ]
      },
      {
        name: "TRID / Closing Disclosure",
        icon: "Shield",
        color: "red",
        sortOrder: 3,
        items: [
          { name: "Closing Disclosure — Refinance", isRequired: true, isCritical: true, keywords: ["closing disclosure", "CD", "refinance CD"] },
          { name: "3-Business Day CD Delivery Confirmation", isRequired: true, isCritical: true, keywords: ["3-day delivery", "CD delivery"] },
          { name: "Loan Estimate / CD Reconciliation", isRequired: true, keywords: ["LE reconciliation", "tolerance"] },
        ]
      },
      {
        name: "New Loan Documents",
        icon: "Landmark",
        color: "indigo",
        sortOrder: 4,
        items: [
          { name: "New Mortgage / Deed of Trust", isRequired: true, isCritical: true, keywords: ["mortgage", "deed of trust", "new mortgage"] },
          { name: "New Promissory Note", isRequired: true, isCritical: true, keywords: ["promissory note", "new note"] },
          { name: "Loan Agreement", keywords: ["loan agreement"] },
          { name: "Truth in Lending Disclosure", keywords: ["truth in lending", "TILA", "TIL"] },
          { name: "Hazard Insurance Confirmation", isRequired: true, keywords: ["hazard insurance", "insurance"] },
          { name: "Flood Certification", keywords: ["flood certification", "flood zone"] },
        ]
      },
      {
        name: "Rescission & Closing",
        icon: "Gavel",
        color: "purple",
        sortOrder: 5,
        items: [
          { name: "Right of Rescission Notice", isRequired: true, isCritical: true, keywords: ["rescission", "right of rescission", "3-day rescission"] },
          { name: "3-Business Day Rescission Period Tracking", isRequired: true, keywords: ["rescission period", "rescission expiration"] },
          { name: "All Documents Executed and Notarized", isRequired: true, keywords: ["execution", "notarized"] },
          { name: "Funds Collected and Disbursed", isRequired: true, keywords: ["funds", "disbursement", "wire"] },
        ]
      },
      {
        name: "Post-Closing",
        icon: "CheckCircle",
        color: "emerald",
        sortOrder: 6,
        items: [
          { name: "New Mortgage Recorded", isRequired: true, keywords: ["recorded mortgage"] },
          { name: "Satisfaction / Release of Old Mortgage", isRequired: true, isCritical: true, keywords: ["satisfaction", "release", "discharge", "old mortgage"] },
          { name: "Old Mortgage Discharge Confirmed", isRequired: true, keywords: ["discharge confirmed", "release confirmed"] },
          { name: "Lender's Title Insurance Policy Issued", isRequired: true, keywords: ["lender title policy"] },
          { name: "Final Documents Distributed", keywords: ["document distribution"] },
        ]
      },
    ]
  );
}

export async function seedNewConstructionTemplate() {
  return seedTemplate(
    "Residential New Construction Purchase",
    "residential-new-construction",
    "Closing checklist for new construction residential purchases. Covers builder contracts, construction completion, certificate of occupancy, punch-list escrows, and standard financed closing requirements.",
    "new_construction",
    [
      {
        name: "Builder Contract & Warranty",
        icon: "FileText",
        color: "blue",
        sortOrder: 1,
        items: [
          { name: "Builder Purchase Agreement / Construction Contract", isRequired: true, isCritical: true, keywords: ["builder contract", "construction contract", "purchase agreement"] },
          { name: "Builder Warranty Deed", isRequired: true, keywords: ["builder warranty", "warranty deed"] },
          { name: "New Home Warranty Documentation", isRequired: true, keywords: ["home warranty", "builder warranty", "new home warranty"] },
          { name: "Specifications and Selections Documentation", keywords: ["specifications", "selections", "upgrades"] },
          { name: "Change Order Log", keywords: ["change order", "modifications"] },
        ]
      },
      {
        name: "Construction Completion",
        icon: "Building",
        color: "amber",
        sortOrder: 2,
        items: [
          { name: "Certificate of Occupancy (CO)", isRequired: true, isCritical: true, keywords: ["certificate of occupancy", "CO", "occupancy permit"] },
          { name: "Construction Completion Certificate", isRequired: true, keywords: ["completion certificate", "construction complete"] },
          { name: "Final Inspection Sign-Off", isRequired: true, keywords: ["final inspection", "inspection sign-off"] },
          { name: "Punch List with Escrow Holdback (if applicable)", keywords: ["punch list", "escrow holdback", "deficiency list"] },
          { name: "Utility Connection Confirmation", isRequired: true, keywords: ["utility connection", "electric", "water", "gas", "sewer"] },
          { name: "Building Permits — Final / Closed", isRequired: true, keywords: ["building permit", "permit closed"] },
          { name: "Mechanic's Lien Waiver from Contractor", isRequired: true, keywords: ["lien waiver", "mechanic's lien", "contractor waiver"] },
        ]
      },
      {
        name: "Title & Survey",
        icon: "Map",
        color: "green",
        sortOrder: 3,
        items: [
          { name: "Title Commitment", isRequired: true, isCritical: true, keywords: ["title commitment", "title binder"] },
          { name: "As-Built Survey", isRequired: true, keywords: ["as-built survey", "survey", "final survey"] },
          { name: "Legal Description", isRequired: true, keywords: ["legal description"] },
          { name: "Subdivision Plat", keywords: ["plat", "subdivision plat"] },
        ]
      },
      {
        name: "Financing & Closing",
        icon: "Landmark",
        color: "indigo",
        sortOrder: 4,
        items: [
          { name: "Loan Commitment Letter", isRequired: true, keywords: ["commitment letter", "loan approval"] },
          { name: "Closing Disclosure (CD)", isRequired: true, isCritical: true, keywords: ["closing disclosure", "CD"] },
          { name: "3-Day CD Delivery Confirmation", isRequired: true, keywords: ["CD delivery", "3-day delivery"] },
          { name: "Mortgage / Deed of Trust", isRequired: true, keywords: ["mortgage", "deed of trust"] },
          { name: "Promissory Note", isRequired: true, keywords: ["promissory note"] },
          { name: "Hazard Insurance Binder", isRequired: true, keywords: ["hazard insurance", "homeowners insurance"] },
          { name: "Appraisal Report (Final — post-completion)", isRequired: true, keywords: ["appraisal", "final appraisal"] },
          { name: "Builder Addenda to Settlement Statement", keywords: ["builder addenda", "construction holdback"] },
        ]
      },
      {
        name: "Post-Closing",
        icon: "CheckCircle",
        color: "emerald",
        sortOrder: 5,
        items: [
          { name: "Deed Recorded", isRequired: true, keywords: ["recorded deed"] },
          { name: "Mortgage Recorded", isRequired: true, keywords: ["recorded mortgage"] },
          { name: "Title Insurance Policies Issued", isRequired: true, keywords: ["title policy"] },
          { name: "Punch-List Escrow Release (if applicable)", keywords: ["escrow release", "punch list"] },
          { name: "1099-S Filed", isRequired: true, keywords: ["1099-S"] },
        ]
      },
    ]
  );
}

export async function seedCommercialFinancedTemplate() {
  return seedTemplate(
    "Commercial Purchase — Financed (ALTA)",
    "commercial-purchase-financed",
    "Comprehensive closing checklist for financed commercial real estate purchases. Covers ALTA settlement statements, LOI, PSA negotiation, extensive due diligence (Phase I ESA, zoning, rent roll, operating statements), entity formation, lender coordination, tenant matters (estoppels, SNDAs), and post-closing obligations.",
    "commercial_financed",
    [
      {
        name: "Engagement & LOI",
        icon: "FileText",
        color: "blue",
        sortOrder: 1,
        items: [
          { name: "Conflict Check Completed", isRequired: true, isCritical: true, keywords: ["conflict check"] },
          { name: "Engagement Letter / Retainer Agreement", isRequired: true, keywords: ["engagement letter", "retainer"] },
          { name: "Letter of Intent (LOI)", isRequired: true, keywords: ["LOI", "letter of intent"] },
          { name: "Exclusivity / No-Shop Period Confirmation", keywords: ["exclusivity", "no-shop"] },
          { name: "Team Assembly / Role Assignment", keywords: ["team", "roles", "assignment"] },
        ]
      },
      {
        name: "Purchase & Sale Agreement",
        icon: "FileSignature",
        color: "indigo",
        sortOrder: 2,
        items: [
          { name: "Purchase and Sale Agreement (PSA)", isRequired: true, isCritical: true, keywords: ["PSA", "purchase agreement", "sale agreement"] },
          { name: "All PSA Amendments", keywords: ["amendment", "addendum"] },
          { name: "Deposit / Escrow Instructions", isRequired: true, keywords: ["deposit", "escrow instructions", "earnest money"] },
          { name: "Representations and Warranties Schedule", keywords: ["representations", "warranties"] },
          { name: "Conditions Precedent Checklist", keywords: ["conditions precedent", "closing conditions"] },
        ]
      },
      {
        name: "Due Diligence — Property",
        icon: "Search",
        color: "amber",
        sortOrder: 3,
        items: [
          { name: "Phase I Environmental Site Assessment", isRequired: true, isCritical: true, keywords: ["phase I", "ESA", "environmental assessment"] },
          { name: "Phase II Environmental Assessment (if triggered)", keywords: ["phase II", "environmental testing"] },
          { name: "Property Condition Assessment (PCA)", isRequired: true, keywords: ["PCA", "property condition", "building inspection"] },
          { name: "ALTA/NSPS Survey (certified)", isRequired: true, keywords: ["ALTA survey", "NSPS", "survey"] },
          { name: "Zoning Report / Zoning Compliance Letter", isRequired: true, keywords: ["zoning", "zoning compliance", "zoning report"] },
          { name: "Building Code Compliance Review", keywords: ["building code", "code compliance"] },
          { name: "ADA Compliance Report", keywords: ["ADA", "accessibility"] },
          { name: "Appraisal Report", isRequired: true, keywords: ["appraisal", "valuation"] },
          { name: "Flood Zone Determination", keywords: ["flood zone", "FEMA"] },
          { name: "Seismic Risk Assessment (if applicable)", keywords: ["seismic", "earthquake"] },
        ]
      },
      {
        name: "Title & Liens",
        icon: "Map",
        color: "green",
        sortOrder: 4,
        items: [
          { name: "Title Commitment / Title Binder", isRequired: true, isCritical: true, keywords: ["title commitment", "title binder"] },
          { name: "Title Search — Full Chain", isRequired: true, keywords: ["title search", "chain of title"] },
          { name: "Title Objection Resolution", keywords: ["title objection", "title cure"] },
          { name: "Title Endorsements (Survey, Zoning, Comprehensive, Access, Contiguity)", keywords: ["title endorsement", "survey endorsement", "zoning endorsement"] },
          { name: "UCC Search Results", isRequired: true, keywords: ["UCC", "UCC search"] },
          { name: "Judgment / Lien Search Results", isRequired: true, keywords: ["judgment", "lien search"] },
          { name: "Lien Releases Obtained", keywords: ["lien release"] },
          { name: "Gap Indemnity / Gap Letter", keywords: ["gap indemnity", "gap letter"] },
        ]
      },
      {
        name: "Financial & Operating Due Diligence",
        icon: "DollarSign",
        color: "yellow",
        sortOrder: 5,
        items: [
          { name: "Certified Rent Roll", isRequired: true, isCritical: true, keywords: ["rent roll", "tenant list", "certified rent roll"] },
          { name: "Operating Statements (Trailing 3 Years)", isRequired: true, keywords: ["operating statements", "income statement", "P&L", "trailing financials"] },
          { name: "Current Year Budget", keywords: ["budget", "operating budget"] },
          { name: "Service Contract Abstracts / Review", isRequired: true, keywords: ["service contract", "vendor contract"] },
          { name: "Insurance Policies & Certificates", isRequired: true, keywords: ["insurance policy", "COI", "certificates of insurance"] },
          { name: "Property Tax Assessment Records", isRequired: true, keywords: ["tax assessment", "property tax"] },
          { name: "CAM Reconciliation Reports", keywords: ["CAM", "common area maintenance"] },
          { name: "Utility Bills (24 months)", keywords: ["utility", "electric", "gas", "water"] },
          { name: "Capital Expenditure History", keywords: ["capex", "capital expenditure"] },
        ]
      },
      {
        name: "Tenant Matters",
        icon: "Users",
        color: "orange",
        sortOrder: 6,
        items: [
          { name: "All Lease Agreements", isRequired: true, keywords: ["lease", "rental agreement"] },
          { name: "Lease Abstracts", keywords: ["lease abstract", "lease summary"] },
          { name: "Tenant Estoppel Certificates", isRequired: true, isCritical: true, keywords: ["estoppel", "tenant estoppel"] },
          { name: "SNDA Agreements", isRequired: true, keywords: ["SNDA", "subordination", "non-disturbance", "attornment"] },
          { name: "Tenant Notification Letters (Drafted)", keywords: ["tenant notification", "notice to tenants"] },
          { name: "Security Deposit Ledger", isRequired: true, keywords: ["security deposit", "deposit ledger"] },
          { name: "Assignment and Assumption of Leases", isRequired: true, keywords: ["assignment of leases", "assumption of leases"] },
          { name: "Assignment of Security Deposits", isRequired: true, keywords: ["assignment of deposits"] },
        ]
      },
      {
        name: "Entity Formation & Verification",
        icon: "Building2",
        color: "rose",
        sortOrder: 7,
        items: [
          { name: "Buyer Entity Formation Documents (LLC/LP)", isRequired: true, keywords: ["articles of organization", "certificate of formation", "LLC"] },
          { name: "Buyer Operating Agreement / Partnership Agreement", isRequired: true, keywords: ["operating agreement", "partnership agreement"] },
          { name: "Certificate of Good Standing — Buyer", isRequired: true, keywords: ["good standing", "certificate of existence"] },
          { name: "Buyer Resolution Authorizing Purchase", isRequired: true, keywords: ["resolution", "authorization"] },
          { name: "Incumbency Certificate — Buyer", keywords: ["incumbency", "authorized signatory"] },
          { name: "Seller Entity Documents & Good Standing", isRequired: true, keywords: ["seller entity", "seller good standing"] },
          { name: "Seller Resolution Authorizing Sale", isRequired: true, keywords: ["seller resolution", "authorization to sell"] },
          { name: "Foreign Entity Qualification (if out-of-state)", keywords: ["foreign qualification", "authority to transact"] },
        ]
      },
      {
        name: "Financing / Lender Coordination",
        icon: "Landmark",
        color: "slate",
        sortOrder: 8,
        items: [
          { name: "Loan Commitment Letter", isRequired: true, isCritical: true, keywords: ["commitment letter", "loan commitment"] },
          { name: "Mortgage / Deed of Trust", isRequired: true, isCritical: true, keywords: ["mortgage", "deed of trust"] },
          { name: "Promissory Note", isRequired: true, keywords: ["promissory note"] },
          { name: "Loan Agreement", isRequired: true, keywords: ["loan agreement"] },
          { name: "Environmental Indemnity Agreement", isRequired: true, keywords: ["environmental indemnity"] },
          { name: "Guaranty of Recourse Obligations", isRequired: true, keywords: ["guaranty", "recourse guaranty"] },
          { name: "UCC-1 Financing Statements", isRequired: true, keywords: ["UCC-1", "financing statement"] },
          { name: "Assignment of Leases and Rents (to Lender)", isRequired: true, keywords: ["assignment of rents", "assignment of leases"] },
          { name: "Borrower's Closing Certificate", keywords: ["borrower certificate", "closing certificate"] },
          { name: "Legal Opinion Letter", keywords: ["legal opinion", "opinion letter"] },
          { name: "Lender's Title Insurance Policy", isRequired: true, keywords: ["lender title policy", "mortgagee policy"] },
          { name: "Insurance Certificates (Property, Liability, Umbrella, Flood)", isRequired: true, keywords: ["insurance certificate", "COI"] },
        ]
      },
      {
        name: "Closing Documents",
        icon: "Gavel",
        color: "purple",
        sortOrder: 9,
        items: [
          { name: "ALTA Settlement Statement (Buyer / Seller / Combined)", isRequired: true, isCritical: true, keywords: ["ALTA", "settlement statement", "closing statement"] },
          { name: "Sources and Uses Statement", isRequired: true, keywords: ["sources and uses", "sources & uses"] },
          { name: "Funds Flow Memorandum", isRequired: true, keywords: ["funds flow", "funds memo"] },
          { name: "Deed (Special Warranty / Bargain and Sale / Grant)", isRequired: true, isCritical: true, keywords: ["deed", "special warranty deed", "grant deed"] },
          { name: "Bill of Sale (Personal Property / FF&E)", isRequired: true, keywords: ["bill of sale", "FF&E", "personal property"] },
          { name: "Assignment of Contracts (Service, Management)", keywords: ["assignment of contracts"] },
          { name: "Assignment of Warranties and Guaranties", keywords: ["assignment of warranties"] },
          { name: "Assignment of Permits, Licenses, Approvals", keywords: ["assignment of permits", "licenses"] },
          { name: "FIRPTA Affidavit / Withholding Certificate", isRequired: true, keywords: ["FIRPTA", "withholding"] },
          { name: "Transfer Tax Returns / Declarations", isRequired: true, keywords: ["transfer tax", "transfer declaration"] },
          { name: "Proration Calculations", isRequired: true, keywords: ["proration", "prorations"] },
          { name: "Closing Escrow Instructions", keywords: ["escrow instructions"] },
        ]
      },
      {
        name: "Post-Closing",
        icon: "CheckCircle",
        color: "emerald",
        sortOrder: 10,
        items: [
          { name: "Deed Recorded with Confirmation", isRequired: true, keywords: ["recorded deed", "book page"] },
          { name: "Mortgage Recorded", isRequired: true, keywords: ["recorded mortgage"] },
          { name: "UCC Filings Recorded", isRequired: true, keywords: ["UCC filing", "UCC recorded"] },
          { name: "Assignment of Leases Memorandum Recorded", keywords: ["recorded assignment", "memorandum"] },
          { name: "Owner's Title Insurance Policy Issued", isRequired: true, keywords: ["owner's title policy"] },
          { name: "Lender's Title Insurance Policy Issued", isRequired: true, keywords: ["lender title policy"] },
          { name: "1099-S Filed", isRequired: true, keywords: ["1099-S"] },
          { name: "Transfer Tax Returns Filed", keywords: ["transfer tax filed"] },
          { name: "Tenant Notifications Sent", keywords: ["tenant notification sent"] },
          { name: "Service Contract Assumptions/Terminations", keywords: ["service contract assumed"] },
          { name: "Post-Closing Obligations Letter", keywords: ["post-closing obligations", "deliverables"] },
          { name: "Post-Closing Proration Adjustment (when actuals available)", keywords: ["proration adjustment", "true-up"] },
        ]
      },
    ]
  );
}

export async function seedCommercialCashTemplate() {
  return seedTemplate(
    "Commercial Purchase — Cash / All-Equity",
    "commercial-purchase-cash",
    "Closing checklist for all-cash commercial real estate purchases without lender involvement. ALTA format settlement. Includes FinCEN/CTA beneficial ownership reporting requirements.",
    "commercial_cash",
    [
      {
        name: "Engagement & LOI / PSA",
        icon: "FileText",
        color: "blue",
        sortOrder: 1,
        items: [
          { name: "Conflict Check Completed", isRequired: true, keywords: ["conflict check"] },
          { name: "Engagement Letter / Retainer", isRequired: true, keywords: ["engagement letter", "retainer"] },
          { name: "Letter of Intent (LOI)", keywords: ["LOI", "letter of intent"] },
          { name: "Purchase and Sale Agreement (PSA)", isRequired: true, isCritical: true, keywords: ["PSA", "purchase agreement"] },
          { name: "All Amendments to PSA", keywords: ["amendment"] },
          { name: "Proof of Funds", isRequired: true, keywords: ["proof of funds", "bank statement"] },
        ]
      },
      {
        name: "Due Diligence",
        icon: "Search",
        color: "amber",
        sortOrder: 2,
        items: [
          { name: "Phase I ESA", isRequired: true, keywords: ["phase I", "ESA", "environmental"] },
          { name: "Property Condition Assessment", isRequired: true, keywords: ["PCA", "property condition"] },
          { name: "ALTA/NSPS Survey", isRequired: true, keywords: ["ALTA survey", "survey"] },
          { name: "Zoning Report", isRequired: true, keywords: ["zoning", "zoning report"] },
          { name: "Rent Roll (Certified)", isRequired: true, keywords: ["rent roll"] },
          { name: "Operating Statements (3 years)", isRequired: true, keywords: ["operating statements"] },
          { name: "Lease Agreements Review", isRequired: true, keywords: ["lease", "rental agreement"] },
          { name: "Service Contract Review", keywords: ["service contract"] },
        ]
      },
      {
        name: "Title",
        icon: "Map",
        color: "green",
        sortOrder: 3,
        items: [
          { name: "Title Commitment", isRequired: true, isCritical: true, keywords: ["title commitment"] },
          { name: "Title Search", isRequired: true, keywords: ["title search"] },
          { name: "Title Objection Resolution", keywords: ["title objection"] },
          { name: "Owner's Title Insurance Policy", isRequired: true, keywords: ["owner's title policy"] },
        ]
      },
      {
        name: "Entity & Compliance",
        icon: "Shield",
        color: "red",
        sortOrder: 4,
        items: [
          { name: "Buyer Entity Formation Documents", isRequired: true, keywords: ["entity formation", "LLC", "articles"] },
          { name: "Buyer Good Standing Certificate", isRequired: true, keywords: ["good standing"] },
          { name: "Buyer Resolution Authorizing Purchase", isRequired: true, keywords: ["resolution", "authorization"] },
          { name: "FinCEN CTA / Beneficial Ownership Reporting", keywords: ["FinCEN", "CTA", "beneficial ownership"] },
        ]
      },
      {
        name: "Closing & Post-Closing",
        icon: "Gavel",
        color: "purple",
        sortOrder: 5,
        items: [
          { name: "ALTA Settlement Statement", isRequired: true, isCritical: true, keywords: ["ALTA", "settlement statement"] },
          { name: "Deed", isRequired: true, keywords: ["deed", "special warranty"] },
          { name: "Bill of Sale", keywords: ["bill of sale", "FF&E"] },
          { name: "Assignment of Leases", isRequired: true, keywords: ["assignment of leases"] },
          { name: "Tenant Estoppels", isRequired: true, keywords: ["estoppel"] },
          { name: "FIRPTA Affidavit", isRequired: true, keywords: ["FIRPTA"] },
          { name: "Transfer Tax Returns", isRequired: true, keywords: ["transfer tax"] },
          { name: "Proration Calculations", isRequired: true, keywords: ["proration"] },
          { name: "Deed Recorded", isRequired: true, keywords: ["recorded deed"] },
          { name: "1099-S Filed", isRequired: true, keywords: ["1099-S"] },
        ]
      },
    ]
  );
}

export async function seedCMBSTemplate() {
  return seedTemplate(
    "CMBS Loan Closing",
    "cmbs-loan-closing",
    "Closing checklist for CMBS (Commercial Mortgage-Backed Securities) loan transactions. Covers rating agency requirements, special servicer provisions, lockbox/cash management agreements, and securitized lending compliance layers.",
    "cmbs",
    [
      {
        name: "Borrower & Property Qualification",
        icon: "Building",
        color: "blue",
        sortOrder: 1,
        items: [
          { name: "Borrower Entity Formation / SPE Requirements", isRequired: true, isCritical: true, keywords: ["SPE", "special purpose entity", "single purpose", "borrower entity"] },
          { name: "Non-Consolidation Opinion", isRequired: true, keywords: ["non-consolidation", "substantive consolidation", "comfort letter"] },
          { name: "Organizational Documents (SPE-compliant)", isRequired: true, keywords: ["organizational documents", "operating agreement"] },
          { name: "Borrower Good Standing", isRequired: true, keywords: ["good standing"] },
          { name: "Property Financial Underwriting Package", isRequired: true, keywords: ["underwriting", "financial package"] },
        ]
      },
      {
        name: "Loan Documentation",
        icon: "FileSignature",
        color: "indigo",
        sortOrder: 2,
        items: [
          { name: "Loan Agreement", isRequired: true, isCritical: true, keywords: ["loan agreement", "CMBS loan"] },
          { name: "Promissory Note", isRequired: true, isCritical: true, keywords: ["promissory note"] },
          { name: "Mortgage / Deed of Trust", isRequired: true, isCritical: true, keywords: ["mortgage", "deed of trust"] },
          { name: "Environmental Indemnity Agreement", isRequired: true, keywords: ["environmental indemnity"] },
          { name: "Guaranty of Recourse Obligations (Bad Boy Carve-outs)", isRequired: true, keywords: ["guaranty", "bad boy", "carve-out", "recourse"] },
          { name: "UCC-1 Financing Statements", isRequired: true, keywords: ["UCC-1", "financing statement"] },
          { name: "Assignment of Leases and Rents", isRequired: true, keywords: ["assignment of leases", "assignment of rents"] },
        ]
      },
      {
        name: "Cash Management & Lockbox",
        icon: "Lock",
        color: "red",
        sortOrder: 3,
        items: [
          { name: "Cash Management / Lockbox Agreement", isRequired: true, isCritical: true, keywords: ["cash management", "lockbox", "deposit account"] },
          { name: "Deposit Account Control Agreement (DACA)", isRequired: true, keywords: ["DACA", "deposit account control"] },
          { name: "Reserve Agreements (Tax, Insurance, Replacement, TI/LC)", isRequired: true, keywords: ["reserve", "tax reserve", "insurance reserve", "replacement reserve"] },
        ]
      },
      {
        name: "Rating Agency & Servicer",
        icon: "Star",
        color: "amber",
        sortOrder: 4,
        items: [
          { name: "Rating Agency Requirements Checklist", isRequired: true, keywords: ["rating agency", "S&P", "Moody's", "Fitch", "DBRS"] },
          { name: "Special Servicer Provisions", isRequired: true, keywords: ["special servicer", "servicer"] },
          { name: "Franchise Agreement Assignments (Hotels)", keywords: ["franchise agreement", "hotel", "flag"] },
          { name: "Ground Lease Estoppels (if applicable)", keywords: ["ground lease estoppel", "ground lessor"] },
          { name: "Loan Allocation Schedule (Multi-Property Pool)", keywords: ["loan allocation", "pool", "multi-property"] },
          { name: "Tranche Allocation Schedules", keywords: ["tranche", "allocation"] },
        ]
      },
      {
        name: "Title, Survey & Due Diligence",
        icon: "Map",
        color: "green",
        sortOrder: 5,
        items: [
          { name: "Title Commitment with CMBS Endorsements", isRequired: true, keywords: ["title commitment", "CMBS endorsement"] },
          { name: "Lender's Title Insurance Policy", isRequired: true, keywords: ["lender title policy"] },
          { name: "ALTA/NSPS Survey", isRequired: true, keywords: ["ALTA survey"] },
          { name: "Phase I ESA", isRequired: true, keywords: ["phase I", "ESA"] },
          { name: "Property Condition Assessment", isRequired: true, keywords: ["PCA"] },
          { name: "Zoning Report", isRequired: true, keywords: ["zoning report"] },
          { name: "Appraisal", isRequired: true, keywords: ["appraisal"] },
          { name: "Seismic Report (Zone 3/4)", keywords: ["seismic"] },
        ]
      },
      {
        name: "Closing & Funding",
        icon: "Gavel",
        color: "purple",
        sortOrder: 6,
        items: [
          { name: "CMBS Funding Memo", isRequired: true, isCritical: true, keywords: ["CMBS funding memo", "funding memo"] },
          { name: "Sources and Uses Statement", isRequired: true, keywords: ["sources and uses"] },
          { name: "Funds Flow Memorandum", isRequired: true, keywords: ["funds flow"] },
          { name: "Legal Opinion Letter", isRequired: true, keywords: ["legal opinion"] },
          { name: "Insurance Certificates (All Required Coverage)", isRequired: true, keywords: ["insurance certificate", "COI"] },
          { name: "Tenant Estoppels (Required Percentage)", isRequired: true, keywords: ["estoppel"] },
          { name: "SNDA Agreements", keywords: ["SNDA"] },
          { name: "All Documents Executed", isRequired: true, keywords: ["execution", "signed"] },
        ]
      },
      {
        name: "Post-Closing",
        icon: "CheckCircle",
        color: "emerald",
        sortOrder: 7,
        items: [
          { name: "Mortgage / UCC Recorded", isRequired: true, keywords: ["recorded mortgage", "UCC recorded"] },
          { name: "Title Policy Issued (with CMBS endorsements)", isRequired: true, keywords: ["title policy", "CMBS endorsement"] },
          { name: "Post-Closing Deliverables to Servicer", isRequired: true, keywords: ["servicer deliverables"] },
          { name: "Lockbox Account Established", isRequired: true, keywords: ["lockbox established"] },
        ]
      },
    ]
  );
}

export async function seedConstructionLoanTemplate() {
  return seedTemplate(
    "Construction Loan Closing",
    "construction-loan-closing",
    "Closing checklist for construction loan originations. Covers construction loan agreement, building/project loan mortgages, draw schedules, development budgets, contractor documentation, mechanic's lien management, and construction monitoring requirements.",
    "construction_loan",
    [
      {
        name: "Pre-Construction Due Diligence",
        icon: "Search",
        color: "blue",
        sortOrder: 1,
        items: [
          { name: "Development Budget (Sources & Uses)", isRequired: true, isCritical: true, keywords: ["development budget", "sources and uses", "project budget"] },
          { name: "Construction Plans & Specifications", isRequired: true, keywords: ["construction plans", "specifications", "blueprints", "architectural drawings"] },
          { name: "Phase I ESA", isRequired: true, keywords: ["phase I", "ESA", "environmental"] },
          { name: "Geotechnical / Soil Report", isRequired: true, keywords: ["geotechnical", "soil report", "soil test"] },
          { name: "ALTA/NSPS Survey", isRequired: true, keywords: ["ALTA survey", "survey"] },
          { name: "Zoning Compliance Confirmation", isRequired: true, keywords: ["zoning", "zoning compliance"] },
          { name: "Market Study / Feasibility Analysis", keywords: ["market study", "feasibility"] },
          { name: "Appraisal (As-Is and As-Completed)", isRequired: true, keywords: ["appraisal", "as-completed value"] },
        ]
      },
      {
        name: "Permits & Approvals",
        icon: "Shield",
        color: "amber",
        sortOrder: 2,
        items: [
          { name: "Building Permit", isRequired: true, isCritical: true, keywords: ["building permit", "construction permit"] },
          { name: "Site Plan Approval", isRequired: true, keywords: ["site plan", "site plan approval"] },
          { name: "Environmental Permits", keywords: ["environmental permit"] },
          { name: "Special Use / Variance Approvals", keywords: ["variance", "special use permit"] },
          { name: "Utility Connection Permits / Letters", keywords: ["utility permit", "water tap", "sewer connection"] },
          { name: "Certificate of Need (if applicable)", keywords: ["certificate of need"] },
        ]
      },
      {
        name: "Contractor Documentation",
        icon: "Users",
        color: "orange",
        sortOrder: 3,
        items: [
          { name: "General Contractor Agreement (AIA or custom)", isRequired: true, isCritical: true, keywords: ["contractor agreement", "AIA", "construction contract", "GC agreement"] },
          { name: "Contractor's Sworn Statement / Cost Breakdown", isRequired: true, keywords: ["sworn statement", "cost breakdown", "schedule of values"] },
          { name: "Contractor's License and Insurance", isRequired: true, keywords: ["contractor license", "contractor insurance"] },
          { name: "Payment and Performance Bonds", isRequired: true, keywords: ["payment bond", "performance bond", "surety"] },
          { name: "Architect's Agreement / Certificate", isRequired: true, keywords: ["architect agreement", "architect certificate", "AIA"] },
          { name: "Subcontractor List", keywords: ["subcontractor", "sub list"] },
        ]
      },
      {
        name: "Loan Documentation",
        icon: "FileSignature",
        color: "indigo",
        sortOrder: 4,
        items: [
          { name: "Construction Loan Agreement", isRequired: true, isCritical: true, keywords: ["construction loan agreement", "loan agreement"] },
          { name: "Building Loan Mortgage", isRequired: true, isCritical: true, keywords: ["building loan mortgage", "construction mortgage"] },
          { name: "Project Loan Mortgage (NY — separate from building loan)", keywords: ["project loan mortgage", "project loan"] },
          { name: "Promissory Note", isRequired: true, keywords: ["promissory note"] },
          { name: "Environmental Indemnity", isRequired: true, keywords: ["environmental indemnity"] },
          { name: "Completion Guaranty", isRequired: true, keywords: ["completion guaranty", "completion guarantee"] },
          { name: "Recourse Guaranty", isRequired: true, keywords: ["recourse guaranty", "guaranty"] },
          { name: "UCC-1 Financing Statements", isRequired: true, keywords: ["UCC-1", "financing statement"] },
        ]
      },
      {
        name: "Draw Schedule & Budget",
        icon: "Calculator",
        color: "purple",
        sortOrder: 5,
        items: [
          { name: "Construction Draw Schedule", isRequired: true, isCritical: true, keywords: ["draw schedule", "construction draw", "disbursement schedule"] },
          { name: "Hard Cost Budget", isRequired: true, keywords: ["hard cost", "construction cost"] },
          { name: "Soft Cost Budget", isRequired: true, keywords: ["soft cost", "development soft cost"] },
          { name: "Contingency Reserve", isRequired: true, keywords: ["contingency", "reserve"] },
          { name: "Interest Reserve", isRequired: true, keywords: ["interest reserve", "capitalized interest"] },
          { name: "Draw Inspection Procedures", keywords: ["draw inspection", "construction monitoring"] },
        ]
      },
      {
        name: "Insurance & Bonding",
        icon: "Shield",
        color: "red",
        sortOrder: 6,
        items: [
          { name: "Builder's Risk Insurance", isRequired: true, isCritical: true, keywords: ["builder's risk", "course of construction insurance"] },
          { name: "General Liability Insurance", isRequired: true, keywords: ["general liability", "CGL"] },
          { name: "Workers' Compensation Insurance", isRequired: true, keywords: ["workers comp", "workers compensation"] },
          { name: "Umbrella / Excess Liability", keywords: ["umbrella", "excess liability"] },
          { name: "Flood Insurance (if required)", keywords: ["flood insurance"] },
        ]
      },
      {
        name: "Closing & Funding",
        icon: "Gavel",
        color: "slate",
        sortOrder: 7,
        items: [
          { name: "Construction Sources and Uses Statement", isRequired: true, keywords: ["sources and uses", "construction sources"] },
          { name: "Title Commitment with Construction Endorsements", isRequired: true, keywords: ["title commitment", "construction endorsement"] },
          { name: "Lender's Title Insurance Policy", isRequired: true, keywords: ["lender title policy"] },
          { name: "Legal Opinion Letter", keywords: ["legal opinion"] },
          { name: "Entity Documents & Good Standing", isRequired: true, keywords: ["entity documents", "good standing"] },
          { name: "Initial Draw Request (if applicable)", keywords: ["initial draw", "first draw"] },
        ]
      },
      {
        name: "Construction Monitoring & Conversion",
        icon: "Eye",
        color: "teal",
        sortOrder: 8,
        items: [
          { name: "Title Update Procedures (for each draw)", keywords: ["title update", "date down", "bring down"] },
          { name: "Mechanic's Lien Waiver Management", isRequired: true, keywords: ["lien waiver", "mechanic's lien waiver"] },
          { name: "Construction Progress Reports", keywords: ["progress report", "construction progress"] },
          { name: "Architect's Certificates of Completion (per draw)", keywords: ["architect certificate", "completion certificate"] },
          { name: "Permanent Loan Commitment / Take-Out Letter", keywords: ["permanent loan", "take-out commitment", "mini-perm"] },
          { name: "Certificate of Occupancy (for conversion)", keywords: ["certificate of occupancy", "CO"] },
        ]
      },
    ]
  );
}

export async function seedGroundLeaseTemplate() {
  return seedTemplate(
    "Ground Lease Transaction",
    "ground-lease-transaction",
    "Closing checklist for ground lease transactions including lease execution/assignment, leasehold title insurance, leasehold mortgage (if financed), ground rent calculations, and fee owner coordination.",
    "ground_lease",
    [
      {
        name: "Ground Lease Documentation",
        icon: "FileSignature",
        color: "blue",
        sortOrder: 1,
        items: [
          { name: "Ground Lease Agreement (executed or draft)", isRequired: true, isCritical: true, keywords: ["ground lease", "land lease"] },
          { name: "Assignment of Ground Lease (if transfer)", isRequired: true, keywords: ["assignment of ground lease", "lease assignment"] },
          { name: "Memorandum of Ground Lease (for recording)", isRequired: true, keywords: ["memorandum of lease", "memorandum of ground lease"] },
          { name: "Fee Owner Estoppel Certificate", isRequired: true, isCritical: true, keywords: ["fee owner estoppel", "ground lessor estoppel", "landlord estoppel"] },
          { name: "Fee Owner Consent to Assignment / Mortgage", isRequired: true, keywords: ["fee owner consent", "ground lessor consent"] },
          { name: "Ground Rent Schedule / Prepayment Calculations", isRequired: true, keywords: ["ground rent", "rent schedule", "prepayment"] },
        ]
      },
      {
        name: "Leasehold Title & Survey",
        icon: "Map",
        color: "green",
        sortOrder: 2,
        items: [
          { name: "Leasehold Title Insurance Commitment", isRequired: true, isCritical: true, keywords: ["leasehold title", "leasehold commitment"] },
          { name: "Leasehold Title Insurance Policy", isRequired: true, keywords: ["leasehold title policy"] },
          { name: "ALTA Survey", isRequired: true, keywords: ["ALTA survey", "survey"] },
          { name: "Legal Description (Leasehold Parcel)", isRequired: true, keywords: ["legal description"] },
          { name: "UCC Search (Fee and Leasehold)", keywords: ["UCC search"] },
        ]
      },
      {
        name: "Leasehold Financing (if applicable)",
        icon: "Landmark",
        color: "indigo",
        sortOrder: 3,
        items: [
          { name: "Leasehold Mortgage / Deed of Trust", keywords: ["leasehold mortgage", "leasehold deed of trust"] },
          { name: "Non-Disturbance Agreement from Fee Owner", keywords: ["non-disturbance", "SNDA", "NDA"] },
          { name: "Cure Rights Provisions (for lender)", keywords: ["cure rights", "lender cure"] },
          { name: "Promissory Note", keywords: ["promissory note"] },
          { name: "Lender's Leasehold Title Policy", keywords: ["lender leasehold policy"] },
        ]
      },
      {
        name: "Proration & Closing",
        icon: "Gavel",
        color: "purple",
        sortOrder: 4,
        items: [
          { name: "Leasehold Proration Schedule", isRequired: true, keywords: ["leasehold proration", "ground rent proration"] },
          { name: "Ground Lease Closing Statement", isRequired: true, keywords: ["closing statement", "settlement statement"] },
          { name: "Execution of All Documents", isRequired: true, keywords: ["execution", "signed"] },
          { name: "Ground Lease Memorandum Recorded", isRequired: true, keywords: ["recorded memorandum"] },
        ]
      },
    ]
  );
}

export async function seedExchange1031Template() {
  return seedTemplate(
    "1031 Tax-Deferred Exchange",
    "1031-exchange",
    "Closing checklist for 1031 tax-deferred exchanges under IRC Section 1031. Covers coordination with Qualified Intermediary (QI), 45-day identification deadline, 180-day exchange period, and both relinquished and replacement property closings.",
    "exchange_1031",
    [
      {
        name: "Exchange Setup & QI Coordination",
        icon: "Repeat",
        color: "blue",
        sortOrder: 1,
        items: [
          { name: "Exchange Agreement with Qualified Intermediary (QI)", isRequired: true, isCritical: true, keywords: ["exchange agreement", "QI", "qualified intermediary", "accommodator"] },
          { name: "Assignment of PSA Rights to QI", isRequired: true, isCritical: true, keywords: ["assignment to QI", "PSA assignment"] },
          { name: "Notice of Assignment to Other Party", isRequired: true, keywords: ["notice of assignment", "exchange notice"] },
          { name: "QI Account Setup / Escrow Instructions", isRequired: true, keywords: ["QI account", "exchange escrow"] },
        ]
      },
      {
        name: "Relinquished Property Closing",
        icon: "ArrowUpRight",
        color: "amber",
        sortOrder: 2,
        items: [
          { name: "Relinquished Property Sale Agreement", isRequired: true, keywords: ["relinquished property", "sale agreement"] },
          { name: "Exchange Cooperation Clause (in PSA)", isRequired: true, keywords: ["exchange cooperation", "cooperation clause"] },
          { name: "Relinquished Property Closing Documents", isRequired: true, keywords: ["closing documents", "relinquished closing"] },
          { name: "Net Proceeds Transferred to QI", isRequired: true, isCritical: true, keywords: ["proceeds to QI", "exchange funds"] },
          { name: "Boot Avoidance Analysis", keywords: ["boot", "taxable boot", "boot calculation"] },
        ]
      },
      {
        name: "Identification Period (45 Days)",
        icon: "Calendar",
        color: "red",
        sortOrder: 3,
        items: [
          { name: "45-Day Identification Deadline Tracked", isRequired: true, isCritical: true, keywords: ["45-day", "identification period", "identification deadline"] },
          { name: "Identification Notice (Written to QI)", isRequired: true, isCritical: true, keywords: ["identification notice", "replacement property identification"] },
          { name: "Three-Property Rule / 200% Rule Analysis", keywords: ["three-property rule", "200% rule", "95% rule"] },
        ]
      },
      {
        name: "Replacement Property Closing",
        icon: "ArrowDownLeft",
        color: "green",
        sortOrder: 4,
        items: [
          { name: "Replacement Property Purchase Agreement", isRequired: true, keywords: ["replacement property", "purchase agreement"] },
          { name: "Exchange Cooperation Clause (in replacement PSA)", keywords: ["exchange cooperation"] },
          { name: "QI Funds Directed to Replacement Closing", isRequired: true, isCritical: true, keywords: ["QI funds", "exchange disbursement"] },
          { name: "180-Day Exchange Period Compliance", isRequired: true, isCritical: true, keywords: ["180-day", "exchange period"] },
          { name: "Replacement Property Title & Due Diligence", isRequired: true, keywords: ["replacement title", "replacement due diligence"] },
          { name: "Replacement Property Closing Documents", isRequired: true, keywords: ["replacement closing"] },
        ]
      },
      {
        name: "Exchange Accounting & Tax",
        icon: "Calculator",
        color: "purple",
        sortOrder: 5,
        items: [
          { name: "QI Funds Statement", isRequired: true, keywords: ["QI funds statement", "exchange funds statement"] },
          { name: "Exchange Closing Statement", isRequired: true, keywords: ["exchange settlement", "exchange closing statement"] },
          { name: "Boot Calculation (if applicable)", keywords: ["boot calculation", "taxable boot"] },
          { name: "IRS Form 8824 Preparation Support", isRequired: true, keywords: ["form 8824", "like-kind exchange"] },
          { name: "Exchange Documentation Binder", keywords: ["exchange binder", "documentation"] },
        ]
      },
    ]
  );
}

export async function seedPortfolioBulkTemplate() {
  return seedTemplate(
    "Portfolio / Bulk Asset Acquisition",
    "portfolio-bulk-acquisition",
    "Closing checklist for multi-property portfolio or bulk acquisitions closing under a single PSA. Covers property-by-property allocation, individual due diligence per property, consolidated settlement statements, and master/per-property documentation.",
    "portfolio_bulk",
    [
      {
        name: "Master Transaction Documents",
        icon: "FileSignature",
        color: "blue",
        sortOrder: 1,
        items: [
          { name: "Master Purchase and Sale Agreement", isRequired: true, isCritical: true, keywords: ["master PSA", "portfolio PSA", "bulk purchase agreement"] },
          { name: "Property-by-Property Allocation Schedule", isRequired: true, isCritical: true, keywords: ["allocation schedule", "price allocation", "property allocation"] },
          { name: "Master Deposit / Escrow Instructions", isRequired: true, keywords: ["master escrow", "deposit"] },
          { name: "Individual Property Exhibits / Schedules", isRequired: true, keywords: ["property exhibit", "property schedule"] },
        ]
      },
      {
        name: "Per-Property Due Diligence",
        icon: "Search",
        color: "amber",
        sortOrder: 2,
        items: [
          { name: "Title Commitment — Each Property", isRequired: true, isCritical: true, keywords: ["title commitment", "per-property title"] },
          { name: "ALTA Survey — Each Property", isRequired: true, keywords: ["ALTA survey", "per-property survey"] },
          { name: "Phase I ESA — Each Property", isRequired: true, keywords: ["phase I", "ESA", "per-property environmental"] },
          { name: "Property Condition Assessment — Each Property", keywords: ["PCA", "per-property condition"] },
          { name: "Zoning Report — Each Property", keywords: ["zoning", "per-property zoning"] },
          { name: "Rent Roll — Each Property", isRequired: true, keywords: ["rent roll"] },
          { name: "Operating Statements — Each Property", isRequired: true, keywords: ["operating statements"] },
          { name: "Lease Agreements — Each Property", isRequired: true, keywords: ["lease", "per-property lease"] },
        ]
      },
      {
        name: "Entity & Closing",
        icon: "Building2",
        color: "rose",
        sortOrder: 3,
        items: [
          { name: "Buyer Entity Formation (per property or master)", isRequired: true, keywords: ["entity formation", "buyer entity"] },
          { name: "Master Settlement Statement (Consolidated)", isRequired: true, isCritical: true, keywords: ["master settlement", "consolidated statement"] },
          { name: "Per-Property Allocation Statements", isRequired: true, keywords: ["per-property statement", "allocation statement"] },
          { name: "Consolidated Sources and Uses", isRequired: true, keywords: ["consolidated sources", "sources and uses"] },
          { name: "Individual Deeds — Each Property", isRequired: true, keywords: ["deed", "per-property deed"] },
          { name: "Individual FIRPTA Affidavits", isRequired: true, keywords: ["FIRPTA", "per-property FIRPTA"] },
          { name: "Individual Transfer Tax Returns", isRequired: true, keywords: ["transfer tax", "per-property transfer tax"] },
        ]
      },
      {
        name: "Post-Closing",
        icon: "CheckCircle",
        color: "emerald",
        sortOrder: 4,
        items: [
          { name: "All Deeds Recorded — Each Property", isRequired: true, keywords: ["recorded deed"] },
          { name: "All Title Policies Issued", isRequired: true, keywords: ["title policy"] },
          { name: "1099-S Filed (per property)", isRequired: true, keywords: ["1099-S"] },
          { name: "Post-Closing Proration Adjustments", keywords: ["proration adjustment", "true-up"] },
        ]
      },
    ]
  );
}

export async function seedSaleLeasebackTemplate() {
  return seedTemplate(
    "Sale-Leaseback Transaction",
    "sale-leaseback",
    "Closing checklist for sale-leaseback transactions where the seller conveys fee ownership and simultaneously enters into a long-term lease as tenant. Covers concurrent sale/lease negotiation, ASC 842 lease classification, and dual settlement statements.",
    "sale_leaseback",
    [
      {
        name: "Sale Transaction",
        icon: "FileSignature",
        color: "blue",
        sortOrder: 1,
        items: [
          { name: "Purchase and Sale Agreement", isRequired: true, isCritical: true, keywords: ["PSA", "purchase agreement", "sale-leaseback PSA"] },
          { name: "Title Commitment", isRequired: true, keywords: ["title commitment"] },
          { name: "ALTA Survey", isRequired: true, keywords: ["ALTA survey", "survey"] },
          { name: "Phase I ESA", isRequired: true, keywords: ["phase I", "ESA"] },
          { name: "Appraisal (Fair Market Value and Fair Market Rental)", isRequired: true, keywords: ["appraisal", "FMV", "fair market rental"] },
          { name: "Property Condition Assessment", keywords: ["PCA", "property condition"] },
          { name: "Deed", isRequired: true, keywords: ["deed", "warranty deed"] },
        ]
      },
      {
        name: "Lease Negotiation (Concurrent)",
        icon: "Users",
        color: "indigo",
        sortOrder: 2,
        items: [
          { name: "Long-Term Lease Agreement", isRequired: true, isCritical: true, keywords: ["lease agreement", "long-term lease", "NNN lease"] },
          { name: "Lease Term / Renewal Options Analysis", isRequired: true, keywords: ["lease term", "renewal options"] },
          { name: "Rent Escalation Schedule", isRequired: true, keywords: ["rent escalation", "CPI escalation"] },
          { name: "Maintenance / Repair Obligations", keywords: ["maintenance", "repair obligations", "NNN"] },
          { name: "Memorandum of Lease (for recording)", keywords: ["memorandum of lease"] },
        ]
      },
      {
        name: "Accounting & Tax Analysis",
        icon: "Calculator",
        color: "amber",
        sortOrder: 3,
        items: [
          { name: "ASC 842 Classification Analysis (Operating vs. Finance)", isRequired: true, isCritical: true, keywords: ["ASC 842", "lease classification", "operating lease", "finance lease"] },
          { name: "Gain/Loss on Sale Analysis", isRequired: true, keywords: ["gain on sale", "loss on sale", "sale-leaseback accounting"] },
          { name: "Tax Implications Analysis", keywords: ["tax implications", "sale-leaseback tax"] },
        ]
      },
      {
        name: "Closing & Settlement",
        icon: "Gavel",
        color: "purple",
        sortOrder: 4,
        items: [
          { name: "Sale Settlement Statement", isRequired: true, isCritical: true, keywords: ["settlement statement", "sale closing"] },
          { name: "Lease Commencement Documentation", isRequired: true, keywords: ["lease commencement", "lease start"] },
          { name: "FIRPTA Affidavit", isRequired: true, keywords: ["FIRPTA"] },
          { name: "Transfer Tax Returns", isRequired: true, keywords: ["transfer tax"] },
          { name: "Title Insurance Policies", isRequired: true, keywords: ["title policy"] },
          { name: "Deed Recorded", isRequired: true, keywords: ["recorded deed"] },
        ]
      },
    ]
  );
}

export async function seedCapitalStackTemplate() {
  return seedTemplate(
    "Multi-Layer Capital Stack Closing",
    "capital-stack-closing",
    "Closing checklist for multi-layer capital stack transactions involving senior mortgage, mezzanine debt (equity pledge), preferred equity, and sponsor/LP equity. Covers intercreditor agreements, recognition agreements, and separate documentation for each financing layer.",
    "capital_stack",
    [
      {
        name: "Capital Stack Summary & Structure",
        icon: "Layers",
        color: "blue",
        sortOrder: 1,
        items: [
          { name: "Capital Stack Summary (All Layers)", isRequired: true, isCritical: true, keywords: ["capital stack", "capital structure", "debt stack"] },
          { name: "Sources and Uses (Full Stack)", isRequired: true, keywords: ["sources and uses", "full stack"] },
          { name: "Investor Waterfall / Distribution Schedule", isRequired: true, keywords: ["waterfall", "investor waterfall", "distribution schedule", "promote"] },
          { name: "Organizational Chart (All Entities)", isRequired: true, keywords: ["org chart", "entity structure"] },
        ]
      },
      {
        name: "Senior Debt Layer",
        icon: "Landmark",
        color: "indigo",
        sortOrder: 2,
        items: [
          { name: "Senior Loan Agreement", isRequired: true, isCritical: true, keywords: ["senior loan", "senior mortgage", "first lien"] },
          { name: "Senior Mortgage / Deed of Trust", isRequired: true, keywords: ["senior mortgage", "first mortgage"] },
          { name: "Senior Promissory Note", isRequired: true, keywords: ["senior note", "promissory note"] },
          { name: "Senior Environmental Indemnity", isRequired: true, keywords: ["environmental indemnity"] },
          { name: "Senior Guaranty", isRequired: true, keywords: ["guaranty", "senior guaranty"] },
        ]
      },
      {
        name: "Mezzanine Debt Layer",
        icon: "FileSignature",
        color: "amber",
        sortOrder: 3,
        items: [
          { name: "Mezzanine Loan Agreement", isRequired: true, isCritical: true, keywords: ["mezzanine loan", "mezz loan", "mezzanine agreement"] },
          { name: "Pledge and Security Agreement (Equity Interest Pledge)", isRequired: true, isCritical: true, keywords: ["pledge agreement", "equity pledge", "security agreement", "membership interest pledge"] },
          { name: "Mezzanine Promissory Note", isRequired: true, keywords: ["mezzanine note", "mezz note"] },
          { name: "Mezzanine Guaranty", isRequired: true, keywords: ["mezzanine guaranty", "mezz guaranty"] },
          { name: "UCC-1 Financing Statement (Equity Interests)", isRequired: true, keywords: ["UCC-1", "equity UCC"] },
        ]
      },
      {
        name: "Intercreditor & Recognition",
        icon: "Link",
        color: "red",
        sortOrder: 4,
        items: [
          { name: "Intercreditor Agreement (Senior/Mezz)", isRequired: true, isCritical: true, keywords: ["intercreditor", "ICA", "intercreditor agreement"] },
          { name: "Recognition Agreement (Mezzanine Lender)", isRequired: true, keywords: ["recognition agreement", "mezz recognition"] },
          { name: "Subordination Agreement", keywords: ["subordination", "subordination agreement"] },
          { name: "Buyout / Cure Rights Provisions", keywords: ["buyout rights", "cure rights"] },
        ]
      },
      {
        name: "Preferred & Sponsor Equity",
        icon: "TrendingUp",
        color: "purple",
        sortOrder: 5,
        items: [
          { name: "Preferred Equity Agreement", keywords: ["preferred equity", "preferred return"] },
          { name: "Joint Venture / Operating Agreement", isRequired: true, keywords: ["JV agreement", "operating agreement"] },
          { name: "Capital Contribution Schedule", isRequired: true, keywords: ["capital contribution", "equity contribution"] },
          { name: "Investor Subscription Agreements", keywords: ["subscription agreement", "investor subscription"] },
          { name: "Side Letters", keywords: ["side letter"] },
        ]
      },
      {
        name: "Closing & Settlement",
        icon: "Gavel",
        color: "slate",
        sortOrder: 6,
        items: [
          { name: "Per-Layer Settlement Statements", isRequired: true, isCritical: true, keywords: ["per-layer settlement", "layered closing"] },
          { name: "Consolidated Funds Flow Memorandum", isRequired: true, keywords: ["funds flow", "consolidated funds"] },
          { name: "All Documents Executed (Each Layer)", isRequired: true, keywords: ["execution", "signed"] },
          { name: "Title Insurance Policies (Owner's and each Lender's)", isRequired: true, keywords: ["title policy"] },
          { name: "Legal Opinion Letters (Borrower's and Lender's Counsel)", keywords: ["legal opinion"] },
        ]
      },
    ]
  );
}

export async function seedLoanAssumptionTemplate() {
  return seedTemplate(
    "Loan Assumption",
    "loan-assumption",
    "Closing checklist for loan assumption transactions where buyer assumes seller's existing mortgage. Covers lender consent, assumption agreement, modification fees, updated title policy with assumption endorsement, and rating agency approval for CMBS loans.",
    "loan_assumption",
    [
      {
        name: "Lender Consent & Application",
        icon: "Shield",
        color: "blue",
        sortOrder: 1,
        items: [
          { name: "Loan Assumption Application", isRequired: true, isCritical: true, keywords: ["assumption application", "loan assumption"] },
          { name: "Lender Consent to Assumption", isRequired: true, isCritical: true, keywords: ["lender consent", "assumption consent"] },
          { name: "Assumption Fee Payment Documentation", isRequired: true, keywords: ["assumption fee", "modification fee", "transfer fee"] },
          { name: "Rating Agency Approval (CMBS Loans)", keywords: ["rating agency", "CMBS approval", "rating agency consent"] },
          { name: "New Borrower Financial Qualification Package", isRequired: true, keywords: ["financial qualification", "borrower financials"] },
        ]
      },
      {
        name: "Assumption Documentation",
        icon: "FileSignature",
        color: "indigo",
        sortOrder: 2,
        items: [
          { name: "Assumption Agreement", isRequired: true, isCritical: true, keywords: ["assumption agreement"] },
          { name: "Loan Modification Agreement (if terms change)", keywords: ["loan modification", "modification agreement"] },
          { name: "New Guaranty (if applicable)", keywords: ["new guaranty", "replacement guaranty"] },
          { name: "Release of Prior Guarantor", keywords: ["guarantor release", "prior guarantor"] },
          { name: "Assignment of Mortgage / Deed of Trust (if required)", keywords: ["assignment of mortgage"] },
          { name: "Allonge to Note (if applicable)", keywords: ["allonge", "note endorsement"] },
        ]
      },
      {
        name: "Title & Insurance",
        icon: "Map",
        color: "green",
        sortOrder: 3,
        items: [
          { name: "Updated Title Policy with Assumption Endorsement", isRequired: true, keywords: ["assumption endorsement", "title endorsement", "updated title"] },
          { name: "Title Search (since original policy)", isRequired: true, keywords: ["title search", "title update"] },
          { name: "Transfer of Escrow / Reserve Accounts", isRequired: true, keywords: ["escrow transfer", "reserve transfer"] },
          { name: "Insurance Policy Update (new borrower as insured)", isRequired: true, keywords: ["insurance update", "insured party"] },
        ]
      },
      {
        name: "Closing",
        icon: "Gavel",
        color: "purple",
        sortOrder: 4,
        items: [
          { name: "Settlement Statement (reflecting assumption balance)", isRequired: true, keywords: ["settlement statement", "assumption closing"] },
          { name: "Deed to New Buyer", isRequired: true, keywords: ["deed", "conveyance"] },
          { name: "FIRPTA Affidavit", isRequired: true, keywords: ["FIRPTA"] },
          { name: "Transfer Tax Returns", isRequired: true, keywords: ["transfer tax"] },
          { name: "All Documents Executed", isRequired: true, keywords: ["execution", "signed"] },
          { name: "Deed Recorded", isRequired: true, keywords: ["recorded deed"] },
        ]
      },
    ]
  );
}

export async function seedCoopTransferTemplate() {
  return seedTemplate(
    "Cooperative (Co-op) Transfer",
    "coop-transfer",
    "Closing checklist for cooperative apartment share transfers. Covers stock power, proprietary lease assignment, board approval, recognition agreement, and flip tax. Note: No deed, no title insurance, no recording — co-op transfers involve shares in a corporation, not real property.",
    "co_op",
    [
      {
        name: "Board Application & Approval",
        icon: "Users",
        color: "blue",
        sortOrder: 1,
        items: [
          { name: "Co-op Board Application Package", isRequired: true, isCritical: true, keywords: ["board application", "co-op application", "cooperative application"] },
          { name: "Financial Statements / Tax Returns (buyer)", isRequired: true, keywords: ["financial statements", "tax returns", "buyer financials"] },
          { name: "Reference Letters", isRequired: true, keywords: ["reference letter", "personal reference", "professional reference"] },
          { name: "Board Interview Completed", isRequired: true, isCritical: true, keywords: ["board interview", "co-op interview"] },
          { name: "Board Approval Letter", isRequired: true, isCritical: true, keywords: ["board approval", "approval letter"] },
        ]
      },
      {
        name: "Transfer Documentation",
        icon: "FileSignature",
        color: "indigo",
        sortOrder: 2,
        items: [
          { name: "Stock Power (Transfer of Shares)", isRequired: true, isCritical: true, keywords: ["stock power", "share transfer", "stock certificate"] },
          { name: "Proprietary Lease Assignment", isRequired: true, isCritical: true, keywords: ["proprietary lease", "lease assignment", "occupancy agreement"] },
          { name: "New Stock Certificate Issued", isRequired: true, keywords: ["new stock certificate", "share certificate"] },
          { name: "Aztech Recognition Agreement (if financing)", keywords: ["aztech", "recognition agreement", "lender recognition"] },
          { name: "UCC-1 Financing Statement (if financing)", keywords: ["UCC-1", "cooperative financing"] },
        ]
      },
      {
        name: "Financial Calculations",
        icon: "Calculator",
        color: "amber",
        sortOrder: 3,
        items: [
          { name: "Flip Tax Calculation", isRequired: true, keywords: ["flip tax", "transfer fee", "co-op transfer fee"] },
          { name: "Maintenance Charge Proration", isRequired: true, keywords: ["maintenance proration", "maintenance charges", "common charges"] },
          { name: "Assessment Proration (if applicable)", keywords: ["assessment", "special assessment"] },
          { name: "Move-In/Move-Out Deposit", keywords: ["move-in deposit", "move-out deposit"] },
        ]
      },
      {
        name: "Closing (No Recording Required)",
        icon: "Gavel",
        color: "purple",
        sortOrder: 4,
        items: [
          { name: "Co-op Transfer Closing Statement", isRequired: true, isCritical: true, keywords: ["closing statement", "co-op settlement", "transfer statement"] },
          { name: "Managing Agent Transfer Fee Payment", keywords: ["managing agent fee", "transfer fee"] },
          { name: "All Documents Executed", isRequired: true, keywords: ["execution", "signed"] },
          { name: "Funds Disbursed", isRequired: true, keywords: ["disbursement", "funds"] },
          { name: "Keys / Access Delivered", keywords: ["keys", "access", "key delivery"] },
          { name: "Building Notification (New Shareholder)", keywords: ["building notification", "new shareholder"] },
        ]
      },
    ]
  );
}

export async function seedAllREClosingTemplates() {
  await seedResidentialFinancedTemplate();
  await seedResidentialCashTemplate();
  await seedResidentialRefinanceTemplate();
  await seedNewConstructionTemplate();
  await seedCommercialFinancedTemplate();
  await seedCommercialCashTemplate();
  await seedCMBSTemplate();
  await seedConstructionLoanTemplate();
  await seedGroundLeaseTemplate();
  await seedExchange1031Template();
  await seedPortfolioBulkTemplate();
  await seedSaleLeasebackTemplate();
  await seedCapitalStackTemplate();
  await seedLoanAssumptionTemplate();
  await seedCoopTransferTemplate();
  console.log("All RE Closing templates seeded successfully!");
}
