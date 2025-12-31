import { db } from "../db";
import { dealTemplates, templateCategories, templateItems } from "@shared/schema";
import { eq } from "drizzle-orm";

async function seedRealEstateTemplate() {
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

async function main() {
  try {
    await seedRealEstateTemplate();
    console.log("\nTemplate seeding complete!");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding templates:", error);
    process.exit(1);
  }
}

main();
