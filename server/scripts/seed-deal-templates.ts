import { db } from "../db";
import { dealTemplates, templateCategories, templateItems } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function seedRealEstateTemplate() {
  console.log("Seeding Real Estate Purchase & Sale template...");

  // Check if template already exists
  const existing = await db.select().from(dealTemplates).where(eq(dealTemplates.slug, "real-estate-purchase-sale"));
  if (existing.length > 0) {
    console.log("Template already exists, skipping...");
    return existing[0];
  }

  // Create the template
  const [template] = await db.insert(dealTemplates).values({
    name: "Real Estate Purchase & Sale",
    slug: "real-estate-purchase-sale",
    description: "Comprehensive checklist for commercial or residential real estate purchase and sale transactions. Covers due diligence, title review, financing, and closing requirements.",
    transactionType: "real_estate",
    version: 1,
    isActive: true,
    isDefault: true,
    isSystemTemplate: true,
    usageCount: 0,
  }).returning();

  console.log(`Created template: ${template.name} (${template.id})`);

  // Define categories with their items
  const categoriesData = [
    {
      name: "Letter of Intent / Term Sheet",
      icon: "FileText",
      color: "blue",
      sortOrder: 1,
      items: [
        { name: "Executed Letter of Intent (LOI)", isRequired: true, isCritical: true, keywords: ["LOI", "letter of intent", "term sheet"] },
        { name: "Term Sheet", keywords: ["term sheet", "terms"] },
        { name: "Confidentiality/NDA Agreement", keywords: ["NDA", "confidentiality", "non-disclosure"] },
        { name: "Exclusivity Agreement", keywords: ["exclusivity", "lock-up"] },
        { name: "Good Faith Deposit Receipt", keywords: ["deposit", "earnest money"] },
      ]
    },
    {
      name: "Purchase Agreement",
      icon: "FileSignature",
      color: "indigo",
      sortOrder: 2,
      items: [
        { name: "Purchase and Sale Agreement (PSA)", isRequired: true, isCritical: true, keywords: ["PSA", "purchase agreement", "sale agreement"] },
        { name: "All Amendments to PSA", keywords: ["amendment", "addendum"] },
        { name: "Assignment of Purchase Agreement (if applicable)", keywords: ["assignment"] },
        { name: "Seller Disclosure Statement", isRequired: true, keywords: ["disclosure", "seller disclosure"] },
        { name: "Lead-Based Paint Disclosure (if applicable)", keywords: ["lead", "lead-based paint"] },
        { name: "Radon Disclosure", keywords: ["radon"] },
        { name: "HOA/Condo Association Disclosure", keywords: ["HOA", "association", "condo"] },
        { name: "Proof of Earnest Money Deposit", isRequired: true, keywords: ["earnest money", "deposit receipt"] },
      ]
    },
    {
      name: "Title & Survey",
      icon: "Map",
      color: "green",
      sortOrder: 3,
      items: [
        { name: "Title Commitment/Preliminary Title Report", isRequired: true, isCritical: true, keywords: ["title commitment", "preliminary title", "title report"] },
        { name: "Title Insurance Policy", isRequired: true, keywords: ["title insurance", "title policy"] },
        { name: "ALTA Survey", isRequired: true, keywords: ["ALTA", "survey", "boundary survey"] },
        { name: "Legal Description", isRequired: true, keywords: ["legal description", "metes and bounds"] },
        { name: "Plat Map", keywords: ["plat", "subdivision map"] },
        { name: "Recorded Deed (Current Owner)", isRequired: true, keywords: ["deed", "warranty deed", "grant deed"] },
        { name: "Chain of Title Report", keywords: ["chain of title"] },
        { name: "Title Exception Documents", keywords: ["exception", "encumbrance"] },
        { name: "Easement Agreements", keywords: ["easement", "right of way"] },
        { name: "CC&Rs (Covenants, Conditions & Restrictions)", keywords: ["CC&R", "covenants", "restrictions"] },
        { name: "Encroachment Analysis", keywords: ["encroachment"] },
        { name: "UCC Search Results", keywords: ["UCC", "lien search"] },
        { name: "Judgment/Lien Search Results", keywords: ["judgment", "lien", "mechanics lien"] },
      ]
    },
    {
      name: "Property Information",
      icon: "Building",
      color: "purple",
      sortOrder: 4,
      items: [
        { name: "Property Tax Bills (3 years)", keywords: ["property tax", "tax bill"] },
        { name: "Current Tax Assessment", keywords: ["assessment", "assessed value"] },
        { name: "Property Appraisal Report", isRequired: true, keywords: ["appraisal", "valuation"] },
        { name: "Site Plan/Floor Plans", keywords: ["site plan", "floor plan", "architectural"] },
        { name: "As-Built Drawings", keywords: ["as-built", "construction drawings"] },
        { name: "Building Specifications", keywords: ["specifications", "building specs"] },
        { name: "Certificate of Occupancy", isRequired: true, keywords: ["certificate of occupancy", "CO"] },
        { name: "Building Permits History", keywords: ["permit", "building permit"] },
        { name: "Zoning Compliance Letter", isRequired: true, keywords: ["zoning", "zoning compliance"] },
        { name: "Variance or Special Use Permits", keywords: ["variance", "special use", "conditional use"] },
        { name: "ADA Compliance Documentation", keywords: ["ADA", "accessibility"] },
        { name: "Fire Safety Inspection Reports", keywords: ["fire safety", "fire inspection"] },
        { name: "Elevator Inspection Certificates", keywords: ["elevator", "inspection certificate"] },
      ]
    },
    {
      name: "Environmental",
      icon: "Leaf",
      color: "emerald",
      sortOrder: 5,
      items: [
        { name: "Phase I Environmental Site Assessment", isRequired: true, isCritical: true, keywords: ["phase I", "ESA", "environmental assessment"] },
        { name: "Phase II Environmental Assessment (if applicable)", isCritical: true, keywords: ["phase II", "environmental testing"] },
        { name: "Asbestos Survey Report", keywords: ["asbestos", "ACM"] },
        { name: "Mold Inspection Report", keywords: ["mold", "mold inspection"] },
        { name: "Wetlands Delineation", keywords: ["wetlands", "wetland delineation"] },
        { name: "Flood Zone Determination", isRequired: true, keywords: ["flood zone", "FEMA", "flood plain"] },
        { name: "Underground Storage Tank Documentation", keywords: ["UST", "underground storage tank"] },
        { name: "Soil Testing Reports", keywords: ["soil test", "geotechnical"] },
        { name: "Environmental Permits/Licenses", keywords: ["environmental permit"] },
        { name: "LEED/Green Building Certifications", keywords: ["LEED", "green building"] },
      ]
    },
    {
      name: "Leases & Tenants",
      icon: "Users",
      color: "orange",
      sortOrder: 6,
      items: [
        { name: "Rent Roll (Current)", isRequired: true, keywords: ["rent roll", "tenant list"] },
        { name: "All Lease Agreements", isRequired: true, keywords: ["lease", "rental agreement"] },
        { name: "Lease Amendments", keywords: ["lease amendment"] },
        { name: "Tenant Estoppel Certificates", isRequired: true, keywords: ["estoppel", "tenant estoppel"] },
        { name: "SNDA Agreements", keywords: ["SNDA", "subordination", "non-disturbance"] },
        { name: "Security Deposit Ledger", keywords: ["security deposit"] },
        { name: "Tenant Correspondence File", keywords: ["tenant correspondence"] },
        { name: "Lease Abstracts", keywords: ["lease abstract", "lease summary"] },
        { name: "Default/Delinquency Reports", keywords: ["delinquency", "default", "past due"] },
        { name: "Tenant Insurance Certificates", keywords: ["tenant insurance", "COI"] },
      ]
    },
    {
      name: "Financial & Operating",
      icon: "DollarSign",
      color: "yellow",
      sortOrder: 7,
      items: [
        { name: "Operating Statements (3 years)", isRequired: true, keywords: ["operating statement", "income statement", "P&L"] },
        { name: "Current Year Budget", keywords: ["budget", "operating budget"] },
        { name: "Historical Utility Bills (24 months)", keywords: ["utility", "electric", "gas", "water"] },
        { name: "CAM Reconciliation Reports", keywords: ["CAM", "common area maintenance"] },
        { name: "Real Estate Tax Appeals History", keywords: ["tax appeal"] },
        { name: "Service Contracts List", keywords: ["service contract", "vendor contract"] },
        { name: "Insurance Policies & Certificates", isRequired: true, keywords: ["insurance policy", "liability insurance"] },
        { name: "Claims History", keywords: ["claims", "loss history"] },
        { name: "Capital Expenditure History", keywords: ["capex", "capital expenditure"] },
        { name: "Deferred Maintenance List", keywords: ["deferred maintenance"] },
      ]
    },
    {
      name: "Inspections & Reports",
      icon: "ClipboardCheck",
      color: "teal",
      sortOrder: 8,
      items: [
        { name: "Property Condition Assessment (PCA)", isRequired: true, keywords: ["PCA", "property condition", "building inspection"] },
        { name: "Roof Inspection Report", keywords: ["roof inspection", "roof condition"] },
        { name: "HVAC Inspection Report", keywords: ["HVAC", "mechanical inspection"] },
        { name: "Plumbing Inspection", keywords: ["plumbing inspection"] },
        { name: "Electrical System Inspection", keywords: ["electrical inspection"] },
        { name: "Structural Engineering Report", keywords: ["structural", "foundation inspection"] },
        { name: "Pest/Termite Inspection", keywords: ["pest", "termite", "wood destroying"] },
        { name: "Seismic Report (if applicable)", keywords: ["seismic", "earthquake"] },
        { name: "Parking Lot/Structure Assessment", keywords: ["parking", "parking lot"] },
        { name: "Landscaping Assessment", keywords: ["landscaping", "grounds"] },
      ]
    },
    {
      name: "Financing Documents",
      icon: "Landmark",
      color: "slate",
      sortOrder: 9,
      items: [
        { name: "Loan Commitment Letter", isRequired: true, isCritical: true, keywords: ["commitment letter", "loan approval"] },
        { name: "Mortgage/Deed of Trust", isRequired: true, keywords: ["mortgage", "deed of trust"] },
        { name: "Promissory Note", isRequired: true, keywords: ["promissory note", "loan note"] },
        { name: "Loan Agreement", keywords: ["loan agreement"] },
        { name: "UCC Financing Statements", keywords: ["UCC", "financing statement"] },
        { name: "Assignment of Leases and Rents", keywords: ["assignment of leases", "assignment of rents"] },
        { name: "Environmental Indemnity", keywords: ["environmental indemnity"] },
        { name: "Guaranty Agreement", keywords: ["guaranty", "personal guaranty"] },
        { name: "Subordination Agreement", keywords: ["subordination"] },
        { name: "Lender Title Insurance Policy", keywords: ["lender title insurance", "mortgagee policy"] },
      ]
    },
    {
      name: "Entity & Authority",
      icon: "Building2",
      color: "rose",
      sortOrder: 10,
      items: [
        { name: "Buyer Entity Formation Documents", isRequired: true, keywords: ["articles of incorporation", "certificate of formation", "LLC agreement"] },
        { name: "Buyer Organizational Documents", keywords: ["bylaws", "operating agreement"] },
        { name: "Buyer Certificate of Good Standing", isRequired: true, keywords: ["good standing", "certificate of existence"] },
        { name: "Buyer Authorization Resolution", isRequired: true, keywords: ["resolution", "authorization", "board resolution"] },
        { name: "Seller Entity Formation Documents", isRequired: true, keywords: ["articles", "formation"] },
        { name: "Seller Certificate of Good Standing", isRequired: true, keywords: ["good standing"] },
        { name: "Seller Authorization Resolution", isRequired: true, keywords: ["resolution", "authorization"] },
        { name: "Power of Attorney (if applicable)", keywords: ["power of attorney", "POA"] },
        { name: "Foreign Entity Qualification (if applicable)", keywords: ["foreign qualification", "authority to transact"] },
      ]
    },
    {
      name: "Closing Documents",
      icon: "Gavel",
      color: "amber",
      sortOrder: 11,
      items: [
        { name: "Settlement Statement/HUD-1/CD", isRequired: true, isCritical: true, keywords: ["settlement statement", "HUD-1", "closing disclosure"] },
        { name: "Warranty Deed/Grant Deed/Quitclaim Deed", isRequired: true, isCritical: true, keywords: ["warranty deed", "grant deed", "quitclaim"] },
        { name: "Bill of Sale", isRequired: true, keywords: ["bill of sale"] },
        { name: "Assignment and Assumption of Leases", isRequired: true, keywords: ["assignment of leases", "assumption"] },
        { name: "Assignment of Contracts", keywords: ["assignment of contracts"] },
        { name: "FIRPTA Affidavit", isRequired: true, keywords: ["FIRPTA", "withholding certificate"] },
        { name: "Seller's Affidavit/Owner's Affidavit", keywords: ["seller affidavit", "owner affidavit"] },
        { name: "Non-Foreign Status Affidavit", keywords: ["non-foreign", "FIRPTA"] },
        { name: "Transfer Tax Declaration", keywords: ["transfer tax", "documentary stamp"] },
        { name: "Closing Escrow Instructions", keywords: ["escrow instructions"] },
        { name: "Proration Calculations", keywords: ["proration", "prorated"] },
        { name: "Keys/Access Devices Transmittal", keywords: ["keys", "access devices", "fobs"] },
        { name: "Tenant Notification Letters", keywords: ["tenant notification", "notice to tenants"] },
        { name: "Utility Transfer Documentation", keywords: ["utility transfer"] },
      ]
    },
    {
      name: "Post-Closing",
      icon: "CheckCircle",
      color: "lime",
      sortOrder: 12,
      items: [
        { name: "Recorded Deed (Buyer)", isRequired: true, keywords: ["recorded deed"] },
        { name: "Final Title Insurance Policy", isRequired: true, keywords: ["final title policy", "owner's policy"] },
        { name: "Recorded Mortgage/Deed of Trust", keywords: ["recorded mortgage"] },
        { name: "Post-Closing Adjustments", keywords: ["post-closing adjustment"] },
        { name: "Property Management Transition Documents", keywords: ["management transition", "property management"] },
        { name: "Vendor/Contractor Notifications", keywords: ["vendor notification"] },
        { name: "Insurance Policy Transfer/New Policy", keywords: ["insurance transfer"] },
        { name: "Property Tax Re-Assessment Request", keywords: ["reassessment", "property tax"] },
      ]
    }
  ];

  let totalItems = 0;
  let sortOrderItem = 0;

  for (const catData of categoriesData) {
    // Create category
    const [category] = await db.insert(templateCategories).values({
      templateId: template.id,
      name: catData.name,
      icon: catData.icon,
      color: catData.color,
      sortOrder: catData.sortOrder,
      isCollapsible: true,
      defaultExpanded: true,
    }).returning();

    console.log(`  Created category: ${category.name}`);

    // Create items for this category
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

  console.log(`Created ${categoriesData.length} categories with ${totalItems} total items`);
  return template;
}

export async function seedEquityDDTemplate() {
  console.log("Seeding PE Equity Due Diligence template...");

  const existing = await db.select().from(dealTemplates).where(eq(dealTemplates.slug, "pe-equity-due-diligence"));
  if (existing.length > 0) {
    console.log("PE Equity DD template already exists, skipping...");
    return existing[0];
  }

  const [template] = await db.insert(dealTemplates).values({
    name: "PE Equity Due Diligence",
    slug: "pe-equity-due-diligence",
    description: "Comprehensive equity due diligence checklist for PE buyouts, M&A, minority investments, and co-investments. Covers corporate governance, financials, QoE, tax, legal, IP, human capital, operations, customers, insurance, real estate, and best practices.",
    transactionType: "equity",
    version: 1,
    isActive: true,
    isDefault: true,
    isSystemTemplate: true,
    usageCount: 0,
  }).returning();

  console.log(`Created template: ${template.name} (${template.id})`);

  const categoriesData = [
    {
      name: "A. Corporate & Governance",
      icon: "Building2",
      color: "blue",
      sortOrder: 1,
      items: [
        { name: "Legal entity structure chart for the target company and all subsidiaries, joint ventures, and affiliates, including jurisdiction of formation and ownership percentages.", isRequired: true, isCritical: true, keywords: ["entity structure", "subsidiaries", "joint ventures", "affiliates", "jurisdiction", "ownership"] },
        { name: "Capitalization table setting forth all outstanding equity interests (common, preferred, options, warrants, SARs, convertible instruments), with grant date, exercise price, vesting schedule, and expiration.", isRequired: true, isCritical: true, keywords: ["cap table", "capitalization", "equity interests", "options", "warrants", "vesting"] },
        { name: "Organizational documents for each entity: certificate of incorporation/formation, bylaws/operating agreement, partnership agreements, and all amendments thereto.", isRequired: true, isCritical: true, keywords: ["certificate of incorporation", "bylaws", "operating agreement", "partnership agreement", "formation"] },
        { name: "All stockholder, voting, drag-along, tag-along, right-of-first-refusal, and registration rights agreements.", isRequired: true, isCritical: true, keywords: ["stockholder agreement", "voting agreement", "drag-along", "tag-along", "ROFR", "registration rights"] },
        { name: "Board and stockholder/member meeting minutes and resolutions for the last five (5) years.", isRequired: true, isCritical: false, keywords: ["board minutes", "resolutions", "meeting minutes", "stockholder"] },
        { name: "List and copies of all equity incentive plans (stock option, restricted stock, phantom equity, profit interest) and all award agreements.", isRequired: true, isCritical: true, keywords: ["equity incentive plan", "stock option", "restricted stock", "phantom equity", "profit interest"] },
        { name: "Schedule of all distributions, dividends, or returns of capital made to equity holders for the last three (3) years.", isRequired: true, isCritical: false, keywords: ["distributions", "dividends", "returns of capital"] },
        { name: "All buy-sell agreements, redemption agreements, and right of first refusal agreements among equity holders.", isRequired: true, isCritical: true, keywords: ["buy-sell agreement", "redemption", "right of first refusal"] },
        { name: "Corporate good-standing certificates for each entity from state of formation.", isRequired: true, isCritical: false, keywords: ["good standing", "certificate of existence"], description: "Best Practice", guidance: "Best practice: obtain within 30 days of closing" },
        { name: "Documentation of all prior equity issuances, repurchases, and recapitalizations.", isRequired: true, isCritical: false, keywords: ["equity issuance", "repurchase", "recapitalization"] },
        { name: "Any pending or threatened challenges to corporate authority or governance disputes among owners.", isRequired: true, isCritical: true, keywords: ["governance disputes", "corporate authority", "ownership disputes"] },
      ]
    },
    {
      name: "B. Financial Statements & Quality of Earnings",
      icon: "DollarSign",
      color: "green",
      sortOrder: 2,
      items: [
        { name: "Audited or reviewed financial statements (IS, BS, CF) for the last three (3) to five (5) fiscal years.", isRequired: true, isCritical: true, keywords: ["audited financials", "income statement", "balance sheet", "cash flow"] },
        { name: "Year-to-date unaudited monthly P&L and balance sheet, reconciled to prior audited period.", isRequired: true, isCritical: true, keywords: ["YTD", "monthly P&L", "unaudited", "balance sheet"] },
        { name: "Last twelve months (LTM) monthly P&L with management commentary on variances.", isRequired: true, isCritical: true, keywords: ["LTM", "trailing twelve months", "variance analysis"] },
        { name: "General ledger detail for all periods under review exported to Excel.", isRequired: true, isCritical: true, keywords: ["general ledger", "GL detail", "trial balance"] },
        { name: "Monthly trial balances for each entity for the last three (3) years.", isRequired: true, isCritical: true, keywords: ["trial balance", "monthly trial balance"] },
        { name: "Chart of accounts and accounting policy memorandum.", isRequired: true, isCritical: false, keywords: ["chart of accounts", "accounting policy", "accounting memo"] },
        { name: "All adjusting journal entries prepared in connection with any audit, review, or compilation.", isRequired: true, isCritical: false, keywords: ["adjusting journal entries", "AJE", "audit adjustments"] },
        { name: "EBITDA bridge from GAAP net income to Adjusted EBITDA, with itemized add-backs/deductions and supporting documentation for each.", isRequired: true, isCritical: true, keywords: ["EBITDA bridge", "adjusted EBITDA", "add-backs", "pro forma"], description: "Best Practice", guidance: "Scrutinize one-time, non-recurring, and owner-specific adjustments" },
        { name: "Revenue recognition policy and all material customer contracts analyzed for proper revenue timing (ASC 606 or applicable standard).", isRequired: true, isCritical: true, keywords: ["revenue recognition", "ASC 606", "revenue timing"] },
        { name: "Deferred revenue and customer deposit detail by customer as of each historical balance sheet date.", isRequired: true, isCritical: false, keywords: ["deferred revenue", "customer deposits", "unearned revenue"] },
        { name: "Accounts receivable aging by customer as of each historical BS date, with allowance for doubtful accounts roll-forward.", isRequired: true, isCritical: true, keywords: ["AR aging", "accounts receivable", "doubtful accounts", "bad debt"] },
        { name: "Accounts payable aging by vendor as of each historical BS date.", isRequired: true, isCritical: true, keywords: ["AP aging", "accounts payable", "vendor aging"] },
        { name: "Inventory listing (quantity and value) reconciled to balance sheet; inventory aging and reserve calculation.", isRequired: true, isCritical: false, keywords: ["inventory", "inventory aging", "inventory reserve"] },
        { name: "Prepaid expenses and other current assets schedule.", isRequired: true, isCritical: false, keywords: ["prepaid expenses", "current assets", "other assets"] },
        { name: "Accrued expenses detail (warranty, commissions, bonuses, taxes, etc.) as of historical BS dates.", isRequired: true, isCritical: false, keywords: ["accrued expenses", "warranty", "commissions", "bonuses", "accruals"] },
        { name: "Bank statements and reconciliations for all accounts for all periods under review.", isRequired: true, isCritical: true, keywords: ["bank statements", "bank reconciliation"] },
        { name: "Schedule of indebtedness, including all secured and unsecured debt, capital leases, and lines of credit.", isRequired: true, isCritical: true, keywords: ["schedule of indebtedness", "debt schedule", "capital leases", "lines of credit"] },
        { name: "Industry benchmark comparisons: EBITDA margin, ROE, DSO, DPO, liquidity ratios vs. market peers.", isRequired: true, isCritical: false, keywords: ["benchmarking", "EBITDA margin", "ROE", "DSO", "DPO", "liquidity"], description: "Best Practice" },
        { name: "Management discussion and analysis or board presentations summarizing financial performance.", isRequired: true, isCritical: false, keywords: ["MD&A", "board presentation", "financial performance"] },
        { name: "Internal audit reports and findings; remediation tracking.", isRequired: false, isCritical: false, keywords: ["internal audit", "audit findings", "remediation"] },
      ]
    },
    {
      name: "C. Tax Diligence",
      icon: "Receipt",
      color: "amber",
      sortOrder: 3,
      items: [
        { name: "Federal and state/local income tax returns for all open statute years (generally three to six years).", isRequired: true, isCritical: true, keywords: ["tax returns", "federal income tax", "state income tax"] },
        { name: "Entity org chart with U.S. tax classification of each entity (C-corp, S-corp, partnership, disregarded).", isRequired: true, isCritical: true, keywords: ["tax classification", "C-corp", "S-corp", "partnership", "disregarded entity"] },
        { name: "S-election or check-the-box election documents (Form 2553, Form 8832) and IRS acceptance letters, if applicable.", isRequired: true, isCritical: true, keywords: ["S-election", "Form 2553", "Form 8832", "check-the-box"], guidance: "If applicable" },
        { name: "Schedule of S-corp shareholder distributions and basis calculations since election date.", isRequired: true, isCritical: true, keywords: ["S-corp distributions", "shareholder basis", "AAA"] },
        { name: "Tax basis balance sheet; depreciation schedules and method elections.", isRequired: true, isCritical: true, keywords: ["tax basis", "depreciation schedule", "MACRS", "Section 179"] },
        { name: "Description of all federal and state/local tax examinations, audits, or inquiries (open or closed within 6 years).", isRequired: true, isCritical: true, keywords: ["tax audit", "tax examination", "IRS inquiry"] },
        { name: "Tax reserve schedule (ASC 740-10 / FIN 48 uncertain tax positions) with amounts and descriptions.", isRequired: true, isCritical: true, keywords: ["tax reserve", "ASC 740", "FIN 48", "uncertain tax position"] },
        { name: "State apportionment factor schedule (property, payroll, sales) by state for all open periods.", isRequired: true, isCritical: false, keywords: ["state apportionment", "property factor", "payroll factor", "sales factor"] },
        { name: "Sales & use tax returns and nexus analysis; voluntary disclosure agreements.", isRequired: true, isCritical: true, keywords: ["sales tax", "use tax", "nexus", "voluntary disclosure"] },
        { name: "Payroll/unemployment tax filings (Forms 940, 941, state withholding) for all open periods.", isRequired: true, isCritical: true, keywords: ["payroll tax", "Form 940", "Form 941", "withholding"] },
        { name: "Independent contractor documentation: classification support, 1099s, and written agreements.", isRequired: true, isCritical: false, keywords: ["independent contractor", "1099", "worker classification"], description: "Best Practice", guidance: "Worker misclassification is a significant diligence risk" },
        { name: "Transfer pricing documentation for any intercompany transactions.", isRequired: true, isCritical: false, keywords: ["transfer pricing", "intercompany", "arm's length"] },
        { name: "Unclaimed/abandoned property (escheat) compliance and any audits.", isRequired: true, isCritical: false, keywords: ["unclaimed property", "escheat", "abandoned property"] },
        { name: "PPP loan forgiveness documentation; ERC credits claimed and compliance.", isRequired: true, isCritical: false, keywords: ["PPP", "paycheck protection", "ERC", "employee retention credit"] },
        { name: "Personal property tax statements and real property tax assessments.", isRequired: false, isCritical: false, keywords: ["property tax", "personal property tax", "tax assessment"] },
        { name: "Copies of prior tax due diligence reports or structuring memoranda.", isRequired: true, isCritical: false, keywords: ["tax due diligence report", "structuring memo"] },
        { name: "Schedule of material acquisitions/divestitures with tax treatment, elections, and purchase price allocation.", isRequired: true, isCritical: true, keywords: ["acquisition", "divestiture", "purchase price allocation", "338(h)(10)"] },
      ]
    },
    {
      name: "D. Legal Diligence",
      icon: "Scale",
      color: "indigo",
      sortOrder: 4,
      items: [
        { name: "Schedule and copies of all pending, threatened, or recently resolved litigation, arbitration, mediation, or government investigations (last 5 years), with exposure estimates and insurance coverage status.", isRequired: true, isCritical: true, keywords: ["litigation", "arbitration", "mediation", "government investigation", "exposure"] },
        { name: "Attorney response letters to auditors (audit response letters) for each of the last three fiscal years.", isRequired: true, isCritical: true, keywords: ["attorney response letter", "audit response", "legal letter"] },
        { name: "All material contracts (customer, supplier, distributor, JV, licensing, partnership) — include any exceeding defined revenue/cost threshold.", isRequired: true, isCritical: true, keywords: ["material contracts", "customer contracts", "supplier contracts", "licensing"] },
        { name: "Non-compete, non-solicitation, and exclusivity provisions in any material contract.", isRequired: true, isCritical: true, keywords: ["non-compete", "non-solicitation", "exclusivity", "restrictive covenant"] },
        { name: "Contracts containing change-of-control provisions, consent requirements, or termination rights triggered by the transaction.", isRequired: true, isCritical: true, keywords: ["change of control", "consent requirement", "termination rights", "assignment"], description: "Best Practice", guidance: "Critical for PE/M&A — requires advance consent mapping" },
        { name: "All real property leases and owned property documents (deeds, title insurance, surveys, zoning).", isRequired: true, isCritical: true, keywords: ["real property lease", "deed", "title insurance", "survey", "zoning"] },
        { name: "All personal property leases, equipment financing agreements, and security interests.", isRequired: true, isCritical: false, keywords: ["equipment lease", "personal property lease", "security interest"] },
        { name: "UCC lien searches and judgment searches in all relevant jurisdictions.", isRequired: true, isCritical: true, keywords: ["UCC search", "lien search", "judgment search"], description: "Best Practice", guidance: "Best practice: run within 30 days of closing" },
        { name: "All debt instruments, credit agreements, guarantees, letters of credit, surety bonds, and hedging arrangements.", isRequired: true, isCritical: true, keywords: ["credit agreement", "guaranty", "letter of credit", "surety bond", "hedging"] },
        { name: "Related-party transaction list and copies of all agreements between the company and any owner, officer, director, family member, or affiliate.", isRequired: true, isCritical: true, keywords: ["related party", "affiliate transaction", "conflict of interest"] },
        { name: "All regulatory licenses, permits, franchises, and governmental authorizations.", isRequired: true, isCritical: true, keywords: ["regulatory license", "permit", "franchise", "governmental authorization"] },
        { name: "EEOC, OSHA, ADA, DOL, and other regulatory correspondence and notices received in the last three (3) years.", isRequired: true, isCritical: true, keywords: ["EEOC", "OSHA", "ADA", "DOL", "regulatory correspondence"] },
        { name: "Environmental compliance documentation, Phase I/II environmental site assessments, and any remediation history.", isRequired: true, isCritical: true, keywords: ["environmental compliance", "Phase I", "Phase II", "ESA", "remediation"] },
        { name: "All acquisition or disposition agreements (stock, assets) closed within the last five (5) years with closing sets.", isRequired: true, isCritical: false, keywords: ["acquisition agreement", "disposition", "closing set", "prior M&A"] },
        { name: "All consultant, independent contractor, and professional services agreements.", isRequired: true, isCritical: false, keywords: ["consulting agreement", "professional services", "independent contractor"] },
        { name: "Data privacy and cybersecurity policies, breach history, and any regulatory notifications (GDPR, CCPA, etc.).", isRequired: true, isCritical: true, keywords: ["data privacy", "cybersecurity", "GDPR", "CCPA", "data breach"], description: "Best Practice", guidance: "Increasingly critical for PE diligence" },
        { name: "Anti-corruption / FCPA / OFAC compliance program documentation and any violations or self-disclosures.", isRequired: true, isCritical: true, keywords: ["FCPA", "OFAC", "anti-corruption", "sanctions", "compliance program"] },
        { name: "Product liability, warranty claims history, and recall documentation.", isRequired: true, isCritical: false, keywords: ["product liability", "warranty claims", "recall"] },
        { name: "All franchise agreements and franchise disclosure documents, if applicable.", isRequired: true, isCritical: false, keywords: ["franchise agreement", "FDD", "franchise disclosure"] },
      ]
    },
    {
      name: "E. Intellectual Property",
      icon: "Lightbulb",
      color: "purple",
      sortOrder: 5,
      items: [
        { name: "Schedule of all patents (issued and pending), registered trademarks, copyrights, and domain names, with application numbers, filing dates, registration numbers, and jurisdictions.", isRequired: true, isCritical: true, keywords: ["patents", "trademarks", "copyrights", "domain names", "IP schedule"] },
        { name: "Assignment records confirming company ownership of all IP developed by employees, contractors, or founders.", isRequired: true, isCritical: true, keywords: ["IP assignment", "invention assignment", "IP ownership"], description: "Best Practice", guidance: "Founders often retain IP if not properly assigned at formation" },
        { name: "IP license agreements (in-bound and out-bound), including open-source software usage audit.", isRequired: true, isCritical: true, keywords: ["IP license", "open source", "software license", "GPL"], description: "Best Practice", guidance: "Copyleft licenses (GPL) can taint proprietary code" },
        { name: "Non-disclosure and invention assignment agreements for all current and former employees and contractors.", isRequired: true, isCritical: true, keywords: ["NDA", "invention assignment", "confidentiality agreement", "PIIA"] },
        { name: "Any IP ownership disputes, third-party infringement claims, or freedom-to-operate analyses.", isRequired: true, isCritical: true, keywords: ["IP dispute", "infringement", "freedom to operate", "FTO"] },
        { name: "List of all material trade secrets and description of confidentiality protection measures.", isRequired: true, isCritical: false, keywords: ["trade secrets", "confidentiality", "proprietary information"] },
        { name: "Software code ownership analysis and any third-party code integrated into core product.", isRequired: true, isCritical: false, keywords: ["code ownership", "third-party code", "software audit"] },
        { name: "Domain name registrations and social media account ownership documentation.", isRequired: false, isCritical: false, keywords: ["domain names", "social media", "digital assets"] },
      ]
    },
    {
      name: "F. Human Capital",
      icon: "Users",
      color: "teal",
      sortOrder: 6,
      items: [
        { name: "Full employee census (name, title, department, location, hire date, compensation, bonus, benefits) in Excel.", isRequired: true, isCritical: true, keywords: ["employee census", "headcount", "compensation", "roster"], description: "Best Practice", guidance: "Request 10 days before close for final update" },
        { name: "Organizational chart for all entities, including open positions.", isRequired: true, isCritical: true, keywords: ["org chart", "organizational chart", "open positions"] },
        { name: "Employment agreements, offer letters, and severance/change-of-control agreements for all key employees.", isRequired: true, isCritical: true, keywords: ["employment agreement", "offer letter", "severance", "change of control"] },
        { name: "Non-compete, non-solicitation, and confidentiality agreements for key personnel.", isRequired: true, isCritical: true, keywords: ["non-compete", "non-solicitation", "confidentiality", "key employee"] },
        { name: "Payroll registers (monthly detail) for the last two to three years, including employer tax and benefit cost.", isRequired: true, isCritical: true, keywords: ["payroll register", "payroll detail", "employer tax", "benefit cost"] },
        { name: "Employee benefits plan documents: health, dental, life, disability, 401(k)/retirement, PTO policy.", isRequired: true, isCritical: false, keywords: ["employee benefits", "health insurance", "401k", "PTO", "retirement plan"] },
        { name: "Schedule of employee grievances, claims, EEOC charges, or labor actions (last 3 years).", isRequired: true, isCritical: true, keywords: ["employee grievance", "EEOC", "labor action", "discrimination claim"] },
        { name: "Staff turnover / attrition data by role and location; regretted vs. unregretted classification.", isRequired: true, isCritical: true, keywords: ["turnover", "attrition", "retention", "regretted turnover"] },
        { name: "Employee handbook and all onboarding/offboarding documents signed by employees.", isRequired: true, isCritical: false, keywords: ["employee handbook", "onboarding", "offboarding"] },
        { name: "Incentive and bonus plan documents; commission structures.", isRequired: true, isCritical: false, keywords: ["incentive plan", "bonus plan", "commission structure"] },
        { name: "Key-man dependency analysis: identify roles where departure would materially impact operations.", isRequired: true, isCritical: true, keywords: ["key man", "key person", "succession planning", "dependency"], description: "Best Practice", guidance: "Best practice — often overlooked" },
        { name: "Results of employee engagement/pulse surveys and exit interview summaries.", isRequired: true, isCritical: false, keywords: ["employee engagement", "pulse survey", "exit interview"] },
        { name: "Worker classification assessment for all independent contractors (1099 vs. W-2 risk).", isRequired: true, isCritical: true, keywords: ["worker classification", "1099", "W-2", "misclassification"] },
        { name: "ERISA compliance for any defined benefit or defined contribution plans; Form 5500 filings.", isRequired: true, isCritical: false, keywords: ["ERISA", "Form 5500", "defined benefit", "defined contribution"] },
        { name: "Union agreements or collective bargaining agreements, if applicable.", isRequired: true, isCritical: true, keywords: ["union agreement", "collective bargaining", "CBA", "labor union"] },
      ]
    },
    {
      name: "G. Operations & Technology",
      icon: "Settings",
      color: "slate",
      sortOrder: 7,
      items: [
        { name: "Overview of all technology platforms (ERP, CRM, accounting software, field service management, etc.) with SOPs, data-flow diagrams, and user access logs.", isRequired: true, isCritical: true, keywords: ["ERP", "CRM", "technology stack", "SOP", "data flow"] },
        { name: "IT infrastructure diagram: on-premise vs. cloud, vendor dependencies, single points of failure.", isRequired: true, isCritical: true, keywords: ["IT infrastructure", "cloud", "on-premise", "vendor dependency"] },
        { name: "Cybersecurity assessment: penetration test results, SOC 2 / ISO 27001 certification, incident history.", isRequired: true, isCritical: true, keywords: ["cybersecurity", "penetration test", "SOC 2", "ISO 27001", "security incident"] },
        { name: "Business continuity / disaster recovery plan and most recent test results.", isRequired: true, isCritical: false, keywords: ["BCP", "disaster recovery", "business continuity"] },
        { name: "List of all software tools used internally with annual cost, owner, and contract terms.", isRequired: true, isCritical: false, keywords: ["software inventory", "SaaS", "annual cost", "software contracts"] },
        { name: "Supply chain analysis: top suppliers by spend, concentration risk, contract terms, pricing escalation clauses.", isRequired: true, isCritical: true, keywords: ["supply chain", "supplier concentration", "vendor risk", "pricing escalation"] },
        { name: "Equipment list with age, condition, maintenance records, and depreciation schedules.", isRequired: true, isCritical: false, keywords: ["equipment list", "maintenance records", "depreciation", "fixed assets"] },
        { name: "WIP schedule, backlog by month (36 months), and explanation of WIP accounting methodology.", isRequired: true, isCritical: true, keywords: ["WIP", "work in progress", "backlog", "WIP accounting"], description: "Best Practice", guidance: "Particularly critical for project-based businesses" },
        { name: "Operational KPI dashboard: response times, productivity metrics, customer satisfaction scores.", isRequired: true, isCritical: false, keywords: ["KPI", "operational metrics", "productivity", "customer satisfaction"] },
        { name: "Route/dispatch optimization or capacity utilization reports.", isRequired: false, isCritical: false, keywords: ["dispatch", "route optimization", "capacity utilization"] },
        { name: "ESG / sustainability policies and any environmental certifications.", isRequired: false, isCritical: false, keywords: ["ESG", "sustainability", "environmental certification"], description: "Best Practice", guidance: "Increasingly required by institutional LPs" },
      ]
    },
    {
      name: "H. Sales, Marketing & Customers",
      icon: "TrendingUp",
      color: "orange",
      sortOrder: 8,
      items: [
        { name: "Top 20-25 customers by revenue for the last two (2) to three (3) years with revenue, contract terms, and renewal/churn data.", isRequired: true, isCritical: true, keywords: ["top customers", "customer concentration", "revenue by customer", "churn"], description: "Best Practice", guidance: "Customer concentration >20% in single customer is a key risk flag" },
        { name: "Customer contracts (current and pipeline); identify any termination-for-convenience or change-of-control rights.", isRequired: true, isCritical: true, keywords: ["customer contract", "termination rights", "change of control"] },
        { name: "Revenue breakdown by service/product type, geography, and customer segment (last 36 months).", isRequired: true, isCritical: true, keywords: ["revenue breakdown", "revenue by segment", "revenue by geography"] },
        { name: "Customer win/loss data and churn analysis for the last three (3) years.", isRequired: true, isCritical: true, keywords: ["customer win/loss", "churn analysis", "customer retention"] },
        { name: "NPS scores, customer satisfaction surveys, and post-service feedback (last 24 months).", isRequired: true, isCritical: false, keywords: ["NPS", "net promoter score", "customer satisfaction", "CSAT"] },
        { name: "CRM or lead-management reports: new vs. existing customers, funnel stages, conversion rates, average deal size.", isRequired: true, isCritical: false, keywords: ["CRM", "sales funnel", "conversion rate", "deal size", "pipeline"] },
        { name: "Marketing strategy, budget by channel, and campaign performance metrics (ROI, CPL, CPA).", isRequired: true, isCritical: false, keywords: ["marketing strategy", "marketing budget", "ROI", "CPL", "CPA"] },
        { name: "Sales organizational chart, headcount, and incentive/commission structure.", isRequired: true, isCritical: false, keywords: ["sales org", "sales headcount", "commission structure"] },
        { name: "Sales cycle length analysis and win-rate by segment (last 3 years).", isRequired: true, isCritical: false, keywords: ["sales cycle", "win rate", "close rate"] },
        { name: "List of top 25 suppliers with spend, contract terms, and any sole-source dependencies.", isRequired: true, isCritical: true, keywords: ["top suppliers", "supplier spend", "sole source", "vendor dependency"] },
        { name: "Seasonal revenue trend analysis and predictive models.", isRequired: false, isCritical: false, keywords: ["seasonality", "revenue trends", "predictive model"] },
        { name: "Pipeline summary of strategic acquisition targets, if applicable.", isRequired: false, isCritical: false, keywords: ["acquisition pipeline", "M&A targets", "add-on acquisitions"] },
      ]
    },
    {
      name: "I. Insurance",
      icon: "Shield",
      color: "rose",
      sortOrder: 9,
      items: [
        { name: "Schedule of all insurance policies (general liability, workers' comp, professional liability / E&O, D&O, cyber, property, umbrella, auto) with carrier, limits, and premiums.", isRequired: true, isCritical: true, keywords: ["insurance schedule", "general liability", "workers comp", "D&O", "cyber", "umbrella"] },
        { name: "Copies of all current insurance policies.", isRequired: true, isCritical: true, keywords: ["insurance policy", "policy copy"] },
        { name: "Insurer-issued loss runs for all lines of coverage for the last five (5) years.", isRequired: true, isCritical: true, keywords: ["loss runs", "claims history", "insurance claims"] },
        { name: "Details of any pending or historical material insurance claims and outcomes.", isRequired: true, isCritical: true, keywords: ["insurance claim", "pending claim", "claims outcome"] },
        { name: "Confirmation of cyber liability, management liability (D&O, EPL, fiduciary, crime), and E&O coverage.", isRequired: true, isCritical: true, keywords: ["cyber liability", "D&O", "EPL", "fiduciary liability", "E&O"] },
        { name: "Evidence of key-man life insurance, if any.", isRequired: true, isCritical: false, keywords: ["key man insurance", "life insurance", "key person"] },
        { name: "Tail coverage (ERPLI) analysis for any claims-made policies if transaction triggers cancellation.", isRequired: true, isCritical: false, keywords: ["tail coverage", "ERPLI", "claims-made", "run-off"], description: "Best Practice", guidance: "Best practice: plan for rep & warranty insurance" },
      ]
    },
    {
      name: "J. Real Estate",
      icon: "Home",
      color: "emerald",
      sortOrder: 10,
      items: [
        { name: "Schedule of all owned and leased real property: address, sq. ft., function, lease expiration, and annual rent.", isRequired: true, isCritical: true, keywords: ["real property schedule", "leased property", "owned property", "lease schedule"] },
        { name: "Full copies of all lease agreements and amendments.", isRequired: true, isCritical: true, keywords: ["lease agreement", "lease amendment", "rental agreement"] },
        { name: "Deeds, title insurance policies, surveys, zoning reports, and property condition reports for owned property.", isRequired: true, isCritical: true, keywords: ["deed", "title insurance", "survey", "zoning", "property condition"] },
        { name: "Property tax assessments and most recent appraisals.", isRequired: true, isCritical: false, keywords: ["property tax", "appraisal", "assessed value"] },
        { name: "Certificates of occupancy, zoning variances, and outstanding permitting issues.", isRequired: true, isCritical: false, keywords: ["certificate of occupancy", "zoning variance", "building permit"] },
        { name: "Summary of any landlord disputes, threatened lease terminations, or pending condemnations.", isRequired: true, isCritical: true, keywords: ["landlord dispute", "lease termination", "condemnation"] },
        { name: "Plans for any lease renewals, expansions, consolidations, or early exits.", isRequired: true, isCritical: false, keywords: ["lease renewal", "expansion", "consolidation", "early termination"] },
        { name: "Environmental site assessments (Phase I, and Phase II if applicable).", isRequired: true, isCritical: true, keywords: ["Phase I", "Phase II", "environmental site assessment", "ESA"] },
      ]
    },
    {
      name: "K. Best Practices & Supplemental",
      icon: "Star",
      color: "yellow",
      sortOrder: 11,
      items: [
        { name: "Management Quality Assessment: reference checks on CEO, CFO, and key executives from prior employers, investors, and counterparties.", isRequired: true, isCritical: true, keywords: ["management assessment", "reference checks", "CEO", "CFO"], description: "Best Practice", guidance: "Often done via third-party firm — critical for PE" },
        { name: "Background checks and litigation history searches on all principals, directors, and key employees.", isRequired: true, isCritical: true, keywords: ["background check", "litigation search", "principals", "directors"], description: "Best Practice" },
        { name: "Management's 100-day plan and post-close integration roadmap.", isRequired: true, isCritical: true, keywords: ["100-day plan", "integration roadmap", "post-close"], description: "Best Practice" },
        { name: "Sell-side Quality of Earnings (QoE) report review and reconciliation to buy-side findings.", isRequired: true, isCritical: true, keywords: ["quality of earnings", "QoE", "sell-side QoE", "buy-side"], description: "Best Practice" },
        { name: "Normalized Working Capital analysis: define peg, seasonal fluctuations, target range, and NWC peg adjustment mechanism.", isRequired: true, isCritical: true, keywords: ["working capital", "NWC", "peg", "purchase price adjustment"], description: "Best Practice", guidance: "Critical for purchase price adjustment mechanics" },
        { name: "Earnout structure and milestone definitions (if applicable), with clear measurement criteria.", isRequired: true, isCritical: true, keywords: ["earnout", "milestone", "contingent consideration"], description: "Best Practice" },
        { name: "Representations & warranties insurance (RWI) underwriting process support documentation.", isRequired: true, isCritical: false, keywords: ["RWI", "rep and warranty insurance", "R&W"], description: "Best Practice", guidance: "Best practice for PE buyouts" },
        { name: "EBITDA run-rate bridge: LTM to Normalized EBITDA to Pro Forma EBITDA with all adjustments documented.", isRequired: true, isCritical: true, keywords: ["EBITDA run-rate", "normalized EBITDA", "pro forma EBITDA"], description: "Best Practice" },
        { name: "Digital / AI transformation roadmap: assess any automation in operations, data management, or customer delivery.", isRequired: true, isCritical: false, keywords: ["digital transformation", "AI", "automation", "technology roadmap"], description: "Best Practice", guidance: "Increasingly relevant for value creation thesis" },
        { name: "ESG due diligence questionnaire (if LP mandate requires).", isRequired: false, isCritical: false, keywords: ["ESG", "LP mandate", "ESG questionnaire"], description: "Best Practice" },
        { name: "Competitive landscape analysis: market sizing, share, and differentiation vs. direct competitors.", isRequired: true, isCritical: false, keywords: ["competitive analysis", "market sizing", "market share", "differentiation"], description: "Best Practice" },
        { name: "Customer reference calls: at least 3-5 strategic accounts with structured call guide.", isRequired: true, isCritical: true, keywords: ["customer reference", "reference calls", "strategic accounts"], description: "Best Practice" },
      ]
    },
  ];

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

    console.log(`  Created category: ${category.name}`);

    for (const itemData of catData.items) {
      sortOrderItem++;
      await db.insert(templateItems).values({
        categoryId: category.id,
        templateId: template.id,
        name: itemData.name,
        description: itemData.description || null,
        guidance: itemData.guidance || null,
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

  console.log(`Created ${categoriesData.length} categories with ${totalItems} total items`);
  return template;
}

export async function seedDebtDDTemplate() {
  console.log("Seeding PE Debt Due Diligence template...");

  const existing = await db.select().from(dealTemplates).where(eq(dealTemplates.slug, "pe-debt-due-diligence"));
  if (existing.length > 0) {
    console.log("PE Debt DD template already exists, skipping...");
    return existing[0];
  }

  const [template] = await db.insert(dealTemplates).values({
    name: "PE Debt Due Diligence",
    slug: "pe-debt-due-diligence",
    description: "Comprehensive debt due diligence checklist for senior secured loans, mezzanine financing, revolving credit, ABL, and direct lending. Covers entity verification, credit analysis, collateral, legal documentation, tax, insurance, operations, covenants, guarantor diligence, and best practices.",
    transactionType: "debt",
    version: 1,
    isActive: true,
    isDefault: true,
    isSystemTemplate: true,
    usageCount: 0,
  }).returning();

  console.log(`Created template: ${template.name} (${template.id})`);

  const categoriesData = [
    {
      name: "A. Corporate & Entity Verification",
      icon: "Building2",
      color: "blue",
      sortOrder: 1,
      items: [
        { name: "Legal entity structure chart for borrower and all guarantors, with jurisdiction of formation and ownership.", isRequired: true, isCritical: true, keywords: ["entity structure", "borrower", "guarantor", "jurisdiction", "ownership"] },
        { name: "Good-standing certificates for borrower and each guarantor in state of formation and any state where qualified.", isRequired: true, isCritical: true, keywords: ["good standing", "certificate of existence", "borrower", "guarantor"], description: "Best Practice", guidance: "Obtain within 30 days of closing" },
        { name: "Organizational documents for borrower and each guarantor entity: charter, bylaws/operating agreement, all amendments.", isRequired: true, isCritical: true, keywords: ["charter", "bylaws", "operating agreement", "organizational documents"] },
        { name: "Incumbency certificate and resolution authorizing the loan transaction, execution of loan documents, and identification of authorized signatories.", isRequired: true, isCritical: true, keywords: ["incumbency certificate", "resolution", "authorized signatories", "loan authorization"] },
        { name: "Capitalization table and ownership structure; identify any minority investors or co-investment vehicles.", isRequired: true, isCritical: true, keywords: ["cap table", "ownership structure", "minority investors", "co-investment"] },
        { name: "List of all jurisdictions where borrower conducts business (nexus analysis).", isRequired: true, isCritical: false, keywords: ["jurisdictions", "nexus", "business operations", "state registration"] },
      ]
    },
    {
      name: "B. Financial Statements & Credit Analysis",
      icon: "DollarSign",
      color: "green",
      sortOrder: 2,
      items: [
        { name: "Audited or reviewed annual financial statements for the last three (3) to five (5) fiscal years.", isRequired: true, isCritical: true, keywords: ["audited financials", "annual financial statements", "reviewed financials"] },
        { name: "Year-to-date monthly P&L and balance sheet (current and prior year comparative).", isRequired: true, isCritical: true, keywords: ["YTD", "monthly P&L", "balance sheet", "comparative"] },
        { name: "LTM financial statements with management commentary.", isRequired: true, isCritical: true, keywords: ["LTM", "trailing twelve months", "management commentary"] },
        { name: "General ledger access or export for all periods under review.", isRequired: true, isCritical: true, keywords: ["general ledger", "GL", "ledger export"] },
        { name: "Monthly trial balances for the last two (2) to three (3) years.", isRequired: true, isCritical: true, keywords: ["trial balance", "monthly trial balance"] },
        { name: "Bank statements and reconciliations for all operating and reserve accounts (last 12-24 months).", isRequired: true, isCritical: true, keywords: ["bank statements", "bank reconciliation", "operating accounts", "reserve accounts"] },
        { name: "Accounts receivable aging (by customer, by invoice) as of most recent month-end; bad debt history.", isRequired: true, isCritical: true, keywords: ["AR aging", "accounts receivable", "bad debt", "receivable aging"] },
        { name: "Accounts payable aging (by vendor) as of most recent month-end.", isRequired: true, isCritical: true, keywords: ["AP aging", "accounts payable", "vendor aging"] },
        { name: "Inventory reconciliation and aging; write-down history.", isRequired: true, isCritical: false, keywords: ["inventory", "inventory aging", "write-down", "inventory reserve"] },
        { name: "Schedule of all existing indebtedness: lender, original amount, current balance, maturity, interest rate, collateral, covenants.", isRequired: true, isCritical: true, keywords: ["schedule of indebtedness", "existing debt", "lender", "maturity", "covenants"] },
        { name: "Debt service coverage ratio (DSCR) calculation for each period under review; sensitivity analysis.", isRequired: true, isCritical: true, keywords: ["DSCR", "debt service coverage", "sensitivity analysis"] },
        { name: "Fixed charge coverage ratio (FCCR) analysis.", isRequired: true, isCritical: true, keywords: ["FCCR", "fixed charge coverage"] },
        { name: "Leverage ratio analysis: Total Debt / EBITDA, Senior Debt / EBITDA, Net Debt / EBITDA.", isRequired: true, isCritical: true, keywords: ["leverage ratio", "debt to EBITDA", "net leverage"] },
        { name: "Liquidity analysis: current ratio, quick ratio, cash burn rate.", isRequired: true, isCritical: true, keywords: ["liquidity", "current ratio", "quick ratio", "cash burn"] },
        { name: "Working capital cycle analysis: DSO, DPO, DIO, cash conversion cycle.", isRequired: true, isCritical: true, keywords: ["working capital", "DSO", "DPO", "DIO", "cash conversion cycle"] },
        { name: "Capital expenditure history and forward capex schedule; maintenance vs. growth split.", isRequired: true, isCritical: true, keywords: ["capex", "capital expenditure", "maintenance capex", "growth capex"] },
        { name: "Free cash flow analysis: Adjusted EBITDA - Taxes - Net Interest - Capex - Change in Working Capital.", isRequired: true, isCritical: true, keywords: ["free cash flow", "FCF", "adjusted EBITDA"] },
        { name: "Management's financial forecast (3-5 year) with assumption support; stress test / downside case.", isRequired: true, isCritical: true, keywords: ["financial forecast", "projections", "stress test", "downside case"] },
        { name: "Pro forma financial model reflecting proposed debt structure (sources & uses, DSCR, leverage).", isRequired: true, isCritical: true, keywords: ["pro forma model", "sources and uses", "debt structure"] },
        { name: "Seasonal cash flow analysis and identification of peak borrowing periods.", isRequired: true, isCritical: false, keywords: ["seasonal cash flow", "peak borrowing", "seasonality"] },
        { name: "Any off-balance sheet liabilities, contingent obligations, or underfunded pension obligations.", isRequired: true, isCritical: true, keywords: ["off-balance sheet", "contingent liabilities", "pension", "underfunded"] },
      ]
    },
    {
      name: "C. Collateral & Security Diligence",
      icon: "Lock",
      color: "red",
      sortOrder: 3,
      items: [
        { name: "Collateral schedule: itemized list of all assets pledged as security with book value, fair market value, and liquidation value estimates.", isRequired: true, isCritical: true, keywords: ["collateral schedule", "pledged assets", "book value", "liquidation value"] },
        { name: "UCC lien search results in all relevant jurisdictions; identify any prior-perfected security interests to be released or subordinated.", isRequired: true, isCritical: true, keywords: ["UCC search", "lien search", "perfected security interest", "subordination"] },
        { name: "Judgment lien and tax lien searches (federal and state) for borrower and each guarantor.", isRequired: true, isCritical: true, keywords: ["judgment lien", "tax lien", "federal lien", "state lien"] },
        { name: "Real property title reports, surveys, ALTA title insurance commitments, and appraisals for all mortgaged properties.", isRequired: true, isCritical: true, keywords: ["title report", "ALTA", "title insurance", "appraisal", "mortgage"] },
        { name: "Environmental Phase I assessments for all real property collateral; Phase II if any RECs identified.", isRequired: true, isCritical: true, keywords: ["Phase I", "Phase II", "environmental assessment", "REC"], description: "Best Practice", guidance: "ASTM E1527-21 standard" },
        { name: "Equipment appraisals (NADA, Blue Book, or independent appraiser) for all titled collateral.", isRequired: true, isCritical: false, keywords: ["equipment appraisal", "NADA", "Blue Book", "equipment value"] },
        { name: "Accounts receivable eligibility analysis under borrowing base formula (if revolving credit).", isRequired: true, isCritical: true, keywords: ["borrowing base", "AR eligibility", "revolving credit", "eligible receivables"] },
        { name: "Inventory eligibility analysis and field exam results (if revolving credit / ABL).", isRequired: true, isCritical: true, keywords: ["inventory eligibility", "field exam", "ABL", "asset-based lending"] },
        { name: "Flood zone certification for all real property collateral.", isRequired: true, isCritical: false, keywords: ["flood zone", "FEMA", "flood certification"], description: "Best Practice", guidance: "Required for federally regulated lenders" },
        { name: "Insurance certificates (and endorsements naming lender as loss payee / additional insured) for all collateral.", isRequired: true, isCritical: true, keywords: ["insurance certificate", "loss payee", "additional insured", "collateral insurance"] },
        { name: "Subordination and intercreditor agreements from all existing lienholders.", isRequired: true, isCritical: true, keywords: ["subordination agreement", "intercreditor", "lienholders"] },
        { name: "Personal guaranty documentation and guarantor financial statements.", isRequired: true, isCritical: true, keywords: ["personal guaranty", "guarantor financials", "guarantor"] },
      ]
    },
    {
      name: "D. Legal & Documentation Diligence",
      icon: "Scale",
      color: "indigo",
      sortOrder: 4,
      items: [
        { name: "Copies of all existing credit agreements, notes, and loan documents — confirm maturity dates, prepayment penalties, and acceleration triggers.", isRequired: true, isCritical: true, keywords: ["credit agreement", "loan documents", "maturity", "prepayment penalty", "acceleration"] },
        { name: "All guaranty agreements and review for limitations, carve-outs, or waivers.", isRequired: true, isCritical: true, keywords: ["guaranty agreement", "carve-outs", "waivers", "guaranty limitations"] },
        { name: "Material contracts reviewed for change-of-control and assignment consent requirements.", isRequired: true, isCritical: true, keywords: ["material contracts", "change of control", "assignment consent"] },
        { name: "Contracts containing financial maintenance covenants, cross-default provisions, or cross-acceleration triggers.", isRequired: true, isCritical: true, keywords: ["financial covenants", "cross-default", "cross-acceleration"] },
        { name: "All pending or threatened litigation, arbitration, or regulatory investigation disclosures.", isRequired: true, isCritical: true, keywords: ["litigation", "arbitration", "regulatory investigation"] },
        { name: "Attorney response letters to auditors for each of the last three (3) fiscal years.", isRequired: true, isCritical: true, keywords: ["attorney response letter", "audit response", "legal letter"] },
        { name: "Regulatory licenses and permits required to operate; confirm current and in good standing.", isRequired: true, isCritical: true, keywords: ["regulatory license", "permits", "good standing"] },
        { name: "Real property lease review: remaining term, renewal options, assignment and sublease rights, landlord default exposure.", isRequired: true, isCritical: true, keywords: ["lease review", "renewal options", "assignment rights", "sublease"] },
        { name: "Intellectual property ownership confirmation and any material IP-dependent revenue streams.", isRequired: true, isCritical: false, keywords: ["IP ownership", "IP revenue", "intellectual property"] },
        { name: "Related-party transaction review for arm's-length terms and undisclosed commitments.", isRequired: true, isCritical: true, keywords: ["related party", "arm's length", "undisclosed commitments"] },
        { name: "ERISA compliance; pension and post-retirement benefit obligations.", isRequired: true, isCritical: false, keywords: ["ERISA", "pension", "post-retirement benefits"] },
        { name: "Data privacy and cybersecurity breach history; regulatory compliance (GDPR, CCPA).", isRequired: true, isCritical: false, keywords: ["data privacy", "cybersecurity", "GDPR", "CCPA", "breach"] },
        { name: "Anti-money laundering (AML), OFAC, and KYC compliance documentation for borrower and principals.", isRequired: true, isCritical: true, keywords: ["AML", "OFAC", "KYC", "anti-money laundering", "BSA"], description: "Best Practice", guidance: "BSA/AML requirement for regulated lenders" },
        { name: "FCPA / anti-corruption compliance program for borrowers with international operations.", isRequired: true, isCritical: false, keywords: ["FCPA", "anti-corruption", "international operations"] },
      ]
    },
    {
      name: "E. Tax Diligence",
      icon: "Receipt",
      color: "amber",
      sortOrder: 5,
      items: [
        { name: "Federal and state income tax returns for the last three (3) to five (5) years.", isRequired: true, isCritical: true, keywords: ["tax returns", "federal tax", "state tax", "income tax"] },
        { name: "Schedule of any open tax audits, assessments, or tax liens.", isRequired: true, isCritical: true, keywords: ["tax audit", "tax assessment", "tax lien"] },
        { name: "Federal and state tax payment history; evidence of current tax compliance.", isRequired: true, isCritical: true, keywords: ["tax payment", "tax compliance", "payment history"] },
        { name: "Sales and use tax compliance: nexus analysis, returns, and any outstanding assessments.", isRequired: true, isCritical: false, keywords: ["sales tax", "use tax", "nexus", "tax compliance"] },
        { name: "Payroll tax compliance: Form 941/940 filings; no delinquent payroll taxes.", isRequired: true, isCritical: true, keywords: ["payroll tax", "Form 941", "Form 940", "delinquent"], description: "Best Practice", guidance: "Payroll taxes have priority over most security interests" },
        { name: "Property tax assessments and payment status for all owned real property.", isRequired: true, isCritical: false, keywords: ["property tax", "tax assessment", "payment status"] },
        { name: "Schedule of any tax reserves or uncertain tax positions.", isRequired: true, isCritical: false, keywords: ["tax reserve", "uncertain tax position", "FIN 48"] },
      ]
    },
    {
      name: "F. Insurance & Risk Management",
      icon: "Shield",
      color: "rose",
      sortOrder: 6,
      items: [
        { name: "Certificates of insurance for all lines of coverage; endorsements naming lender as additional insured / loss payee.", isRequired: true, isCritical: true, keywords: ["insurance certificate", "additional insured", "loss payee", "endorsement"] },
        { name: "Schedule of insurance: carrier, policy number, coverage type, limits, deductibles, premium, expiration.", isRequired: true, isCritical: true, keywords: ["insurance schedule", "carrier", "coverage limits", "deductibles", "premium"] },
        { name: "Insurer-issued loss runs for all lines for the last five (5) years.", isRequired: true, isCritical: true, keywords: ["loss runs", "claims history", "insurance claims"] },
        { name: "Confirmation of business interruption / contingent business interruption coverage.", isRequired: true, isCritical: true, keywords: ["business interruption", "contingent BI", "BI coverage"] },
        { name: "Key-man life insurance in amount sufficient to cover outstanding loan balance.", isRequired: true, isCritical: false, keywords: ["key man insurance", "life insurance", "loan coverage"] },
        { name: "Flood insurance for any real property collateral in FEMA Special Flood Hazard Area.", isRequired: true, isCritical: true, keywords: ["flood insurance", "FEMA", "Special Flood Hazard Area", "SFHA"] },
        { name: "Cyber liability coverage confirmation.", isRequired: true, isCritical: false, keywords: ["cyber liability", "cyber insurance", "cyber coverage"] },
      ]
    },
    {
      name: "G. Operations & Management Assessment",
      icon: "Settings",
      color: "slate",
      sortOrder: 7,
      items: [
        { name: "Management team bios, background checks, and reference checks on key principals.", isRequired: true, isCritical: true, keywords: ["management team", "background check", "reference check", "principals"] },
        { name: "Organizational chart with identification of key-man dependencies.", isRequired: true, isCritical: true, keywords: ["org chart", "key man", "organizational structure"] },
        { name: "Business plan or strategic plan (3-5 year) with narrative explanation of growth thesis.", isRequired: true, isCritical: false, keywords: ["business plan", "strategic plan", "growth thesis"] },
        { name: "Customer concentration analysis: top 10 customers as % of revenue, contract terms, renewal rates.", isRequired: true, isCritical: true, keywords: ["customer concentration", "top customers", "revenue concentration"] },
        { name: "Supplier concentration analysis: sole-source suppliers and business continuity risk.", isRequired: true, isCritical: false, keywords: ["supplier concentration", "sole source", "business continuity"] },
        { name: "Technology infrastructure overview and critical systems dependency.", isRequired: true, isCritical: false, keywords: ["technology infrastructure", "critical systems", "IT dependency"] },
        { name: "Business continuity and disaster recovery plan.", isRequired: true, isCritical: false, keywords: ["BCP", "disaster recovery", "business continuity plan"] },
        { name: "Environmental, health & safety compliance and any outstanding violations.", isRequired: true, isCritical: true, keywords: ["EHS", "environmental compliance", "health and safety", "violations"] },
        { name: "Government contract compliance (if applicable): FAR/DFARS, set-aside classifications.", isRequired: true, isCritical: false, keywords: ["government contract", "FAR", "DFARS", "set-aside"] },
      ]
    },
    {
      name: "H. Covenant Compliance & Reporting",
      icon: "ClipboardCheck",
      color: "cyan",
      sortOrder: 8,
      items: [
        { name: "Proposed financial covenant framework: minimum DSCR (e.g., 1.20x), maximum leverage ratio, minimum liquidity.", isRequired: true, isCritical: true, keywords: ["financial covenants", "DSCR", "leverage ratio", "liquidity covenant"], description: "Best Practice", guidance: "Negotiate from Adjusted EBITDA definition outward" },
        { name: "Proposed reporting requirements: monthly/quarterly financials, annual audit, compliance certificate.", isRequired: true, isCritical: true, keywords: ["reporting requirements", "compliance certificate", "quarterly financials"] },
        { name: "Borrowing base certificate template and eligibility criteria (if revolving/ABL).", isRequired: true, isCritical: true, keywords: ["borrowing base", "eligibility criteria", "revolving", "ABL"] },
        { name: "Affirmative covenants checklist: insurance maintenance, tax compliance, permits, notice of material events.", isRequired: true, isCritical: true, keywords: ["affirmative covenants", "insurance", "tax compliance", "material events"] },
        { name: "Negative covenants checklist: additional indebtedness, liens, asset sales, dividends/distributions, acquisitions.", isRequired: true, isCritical: true, keywords: ["negative covenants", "restricted payments", "additional debt", "asset sales"] },
        { name: "Change-of-control definition and trigger events in proposed loan documents.", isRequired: true, isCritical: true, keywords: ["change of control", "trigger events", "loan documents"] },
        { name: "Events of default definitions and cure period review.", isRequired: true, isCritical: true, keywords: ["events of default", "cure period", "default provisions"] },
        { name: "Springing vs. maintenance covenant structure analysis based on credit profile.", isRequired: true, isCritical: false, keywords: ["springing covenant", "maintenance covenant", "credit profile"], description: "Best Practice" },
      ]
    },
    {
      name: "I. Guarantor & Sponsor Diligence",
      icon: "UserCheck",
      color: "violet",
      sortOrder: 9,
      items: [
        { name: "Guarantor personal financial statements (signed and dated within 120 days).", isRequired: true, isCritical: true, keywords: ["personal financial statement", "guarantor PFS", "net worth"] },
        { name: "Guarantor tax returns for the last two (2) to three (3) years.", isRequired: true, isCritical: true, keywords: ["guarantor tax returns", "personal tax returns"] },
        { name: "Guarantor credit report and background check.", isRequired: true, isCritical: true, keywords: ["credit report", "background check", "guarantor credit"] },
        { name: "Guarantor liquidity analysis: liquid assets vs. total contingent guaranty exposure.", isRequired: true, isCritical: true, keywords: ["liquidity analysis", "liquid assets", "contingent exposure"] },
        { name: "Sponsor / PE fund overview: fund size, vintage, remaining investment period, LP base, prior credit track record.", isRequired: true, isCritical: true, keywords: ["sponsor overview", "PE fund", "fund size", "vintage", "LP base"], guidance: "For sponsor-backed deals" },
        { name: "Equity contribution documentation and confirmation of equity skin in the game.", isRequired: true, isCritical: true, keywords: ["equity contribution", "equity check", "skin in the game"] },
        { name: "Guarantor disclosure of other material contingent liabilities or guarantees.", isRequired: true, isCritical: true, keywords: ["contingent liabilities", "other guarantees", "material liabilities"] },
      ]
    },
    {
      name: "J. Best Practices & Supplemental",
      icon: "Star",
      color: "yellow",
      sortOrder: 10,
      items: [
        { name: "Third-party Quality of Earnings (QoE) report from reputable accounting firm — required for deals above $10M.", isRequired: true, isCritical: true, keywords: ["quality of earnings", "QoE", "third-party QoE"], description: "Best Practice", guidance: "Best practice — not always provided on smaller deals" },
        { name: "Third-party field examination (field audit) of accounts receivable and inventory for ABL facilities.", isRequired: true, isCritical: true, keywords: ["field exam", "field audit", "ABL", "accounts receivable audit"], description: "Best Practice" },
        { name: "Independent property appraisal (FIRREA-compliant) for all real property collateral.", isRequired: true, isCritical: true, keywords: ["property appraisal", "FIRREA", "real property"], description: "Best Practice", guidance: "Required for regulated lenders over de minimis thresholds" },
        { name: "Environmental indemnity agreement from borrower (and guarantor) for all real property collateral.", isRequired: true, isCritical: true, keywords: ["environmental indemnity", "real property", "borrower indemnity"], description: "Best Practice" },
        { name: "Springing deposit account control agreements (DACAs) on all material operating accounts.", isRequired: true, isCritical: true, keywords: ["DACA", "deposit account control", "springing DACA"], description: "Best Practice", guidance: "Best practice for senior secured lenders" },
        { name: "UCC search bring-down within 3-5 business days of closing.", isRequired: true, isCritical: true, keywords: ["UCC bring-down", "UCC search", "closing"], description: "Best Practice" },
        { name: "Insurance bring-down certificate at closing with lender named as loss payee / additional insured.", isRequired: true, isCritical: true, keywords: ["insurance bring-down", "closing certificate", "loss payee"], description: "Best Practice" },
        { name: "OFAC screening of borrower, principals, and beneficial owners (25%+ threshold).", isRequired: true, isCritical: true, keywords: ["OFAC screening", "sanctions", "beneficial owners"], description: "Best Practice" },
        { name: "Beneficial ownership certification (FinCEN rule) for entity borrowers.", isRequired: true, isCritical: true, keywords: ["beneficial ownership", "FinCEN", "CDD rule", "entity borrower"], description: "Best Practice", guidance: "Regulatory requirement for covered financial institutions" },
        { name: "Post-closing covenant: delivery of audited financials within 90-120 days of fiscal year end.", isRequired: true, isCritical: false, keywords: ["post-closing", "audited financials", "fiscal year"], description: "Best Practice" },
        { name: "Lender's counsel legal opinion on due authorization, enforceability, and perfection of security interests.", isRequired: true, isCritical: true, keywords: ["legal opinion", "enforceability", "perfection", "due authorization"], description: "Best Practice" },
        { name: "Sensitivity analysis: DSCR at revenue -10%, -20%, and -30% scenarios vs. proposed covenants.", isRequired: true, isCritical: true, keywords: ["sensitivity analysis", "DSCR stress test", "downside scenario"], description: "Best Practice", guidance: "Best practice for credit committee presentation" },
      ]
    },
  ];

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

    console.log(`  Created category: ${category.name}`);

    for (const itemData of catData.items) {
      sortOrderItem++;
      await db.insert(templateItems).values({
        categoryId: category.id,
        templateId: template.id,
        name: itemData.name,
        description: itemData.description || null,
        guidance: itemData.guidance || null,
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

  console.log(`Created ${categoriesData.length} categories with ${totalItems} total items`);
  return template;
}

async function main() {
  try {
    await seedRealEstateTemplate();
    await seedEquityDDTemplate();
    await seedDebtDDTemplate();
    console.log("\nAll template seeding complete!");
  } catch (error) {
    console.error("Error seeding templates:", error);
  }
}
