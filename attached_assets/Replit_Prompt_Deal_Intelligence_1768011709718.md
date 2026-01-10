# REPLIT PROMPT: Deal Intelligence Due Diligence Customization System

## PROJECT CONTEXT

I'm building Sentinel Counsel LLP, a legal intelligence platform for PE/M&A transactions. I need to enhance my existing "Deal Intelligence" due diligence report generator to support:

1. **Transaction Type Selection** - Different investment structures require different diligence (LBO vs. mezzanine debt vs. asset purchase)
2. **Industry-Specific Modules** - Litigation finance, real estate lending, healthcare, SaaS each have unique metrics
3. **User Customization** - Drag-and-drop checklist builder with save/load templates

The current implementation has a static 23-section checklist. I need to make it dynamic and context-aware.

---

## TASK 1: DATABASE SCHEMA

Create these new database tables. I'm using PostgreSQL with Drizzle ORM.

### File: `shared/schema.ts` (add to existing schema)

```typescript
import { pgTable, uuid, varchar, text, boolean, integer, decimal, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Transaction Types (equity, debt, hybrid, asset)
export const transactionTypes = pgTable('transaction_types', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  category: varchar('category', { length: 100 }).notNull(), // 'equity', 'debt', 'hybrid', 'asset'
  subcategory: varchar('subcategory', { length: 100 }),
  description: text('description'),
  parentTypeId: uuid('parent_type_id').references(() => transactionTypes.id),
  isActive: boolean('is_active').default(true),
  displayOrder: integer('display_order'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Industry Sectors
export const industrySectors = pgTable('industry_sectors', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 50 }).notNull(),
  description: text('description'),
  parentSectorId: uuid('parent_sector_id').references(() => industrySectors.id),
  icon: varchar('icon', { length: 50 }),
  isActive: boolean('is_active').default(true),
  displayOrder: integer('display_order'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Checklist Sections (the 23+ sections)
export const checklistSections = pgTable('checklist_sections', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  displayOrder: integer('display_order'),
  icon: varchar('icon', { length: 50 }),
  isLiveSearch: boolean('is_live_search').default(false),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// Master Checklist Items Library
export const checklistItemsMaster = pgTable('checklist_items_master', {
  id: uuid('id').primaryKey().defaultRandom(),
  sectionId: uuid('section_id').notNull().references(() => checklistSections.id),
  itemText: text('item_text').notNull(),
  itemDescription: text('item_description'),
  priority: varchar('priority', { length: 20 }).default('standard'), // 'critical', 'standard', 'optional'
  isDefault: boolean('is_default').default(true),
  source: varchar('source', { length: 100 }).default('system'), // 'system', 'industry', 'custom'
  createdAt: timestamp('created_at').defaultNow(),
});

// Transaction Type <-> Checklist Item Mapping
export const transactionTypeChecklistItems = pgTable('transaction_type_checklist_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  transactionTypeId: uuid('transaction_type_id').notNull().references(() => transactionTypes.id),
  checklistItemId: uuid('checklist_item_id').notNull().references(() => checklistItemsMaster.id),
  isRequired: boolean('is_required').default(false),
  isRecommended: boolean('is_recommended').default(true),
  relevanceScore: decimal('relevance_score', { precision: 3, scale: 2 }).default('1.00'),
  notes: text('notes'),
});

// Industry <-> Checklist Item Mapping
export const industryChecklistItems = pgTable('industry_checklist_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  industrySectorId: uuid('industry_sector_id').notNull().references(() => industrySectors.id),
  checklistItemId: uuid('checklist_item_id').notNull().references(() => checklistItemsMaster.id),
  isRequired: boolean('is_required').default(false),
  isRecommended: boolean('is_recommended').default(true),
  relevanceScore: decimal('relevance_score', { precision: 3, scale: 2 }).default('1.00'),
  notes: text('notes'),
});

// User-Created Checklist Templates
export const checklistTemplates = pgTable('checklist_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id'),
  createdBy: uuid('created_by'),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  transactionTypeId: uuid('transaction_type_id').references(() => transactionTypes.id),
  industrySectorId: uuid('industry_sector_id').references(() => industrySectors.id),
  isShared: boolean('is_shared').default(false),
  isDefault: boolean('is_default').default(false),
  baseTemplateId: uuid('base_template_id').references(() => checklistTemplates.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Template Items
export const checklistTemplateItems = pgTable('checklist_template_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  templateId: uuid('template_id').notNull().references(() => checklistTemplates.id),
  sectionId: uuid('section_id').notNull().references(() => checklistSections.id),
  masterItemId: uuid('master_item_id').references(() => checklistItemsMaster.id),
  customItemText: text('custom_item_text'),
  customItemDescription: text('custom_item_description'),
  isIncluded: boolean('is_included').default(true),
  isRequired: boolean('is_required').default(false),
  displayOrder: integer('display_order'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Deal Checklist Instance
export const dealChecklists = pgTable('deal_checklists', {
  id: uuid('id').primaryKey().defaultRandom(),
  dealId: uuid('deal_id').notNull(),
  templateId: uuid('template_id').references(() => checklistTemplates.id),
  transactionTypeId: uuid('transaction_type_id').references(() => transactionTypes.id),
  industrySectorId: uuid('industry_sector_id').references(() => industrySectors.id),
  name: varchar('name', { length: 255 }),
  status: varchar('status', { length: 50 }).default('draft'),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Deal Checklist Items (actual tracking)
export const dealChecklistItems = pgTable('deal_checklist_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  dealChecklistId: uuid('deal_checklist_id').notNull().references(() => dealChecklists.id),
  sectionId: uuid('section_id').notNull().references(() => checklistSections.id),
  masterItemId: uuid('master_item_id').references(() => checklistItemsMaster.id),
  itemText: text('item_text').notNull(),
  itemDescription: text('item_description'),
  status: varchar('status', { length: 50 }).default('pending'),
  priority: varchar('priority', { length: 20 }).default('standard'),
  assignedTo: uuid('assigned_to'),
  dueDate: timestamp('due_date'),
  completionDate: timestamp('completion_date'),
  notes: text('notes'),
  riskFlag: varchar('risk_flag', { length: 20 }).default('none'),
  riskNotes: text('risk_notes'),
  documentIds: jsonb('document_ids'),
  displayOrder: integer('display_order'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Relations
export const transactionTypesRelations = relations(transactionTypes, ({ one, many }) => ({
  parent: one(transactionTypes, {
    fields: [transactionTypes.parentTypeId],
    references: [transactionTypes.id],
  }),
  children: many(transactionTypes),
  checklistItems: many(transactionTypeChecklistItems),
}));

export const industrySectorsRelations = relations(industrySectors, ({ one, many }) => ({
  parent: one(industrySectors, {
    fields: [industrySectors.parentSectorId],
    references: [industrySectors.id],
  }),
  children: many(industrySectors),
  checklistItems: many(industryChecklistItems),
}));

export const checklistSectionsRelations = relations(checklistSections, ({ many }) => ({
  items: many(checklistItemsMaster),
}));

export const checklistItemsMasterRelations = relations(checklistItemsMaster, ({ one }) => ({
  section: one(checklistSections, {
    fields: [checklistItemsMaster.sectionId],
    references: [checklistSections.id],
  }),
}));
```

---

## TASK 2: SEED DATA SCRIPT

Create a seed script to populate transaction types, industries, sections, and checklist items.

### File: `server/seeds/due-diligence-seed.ts`

```typescript
import { db } from '../db';
import { 
  transactionTypes, 
  industrySectors, 
  checklistSections, 
  checklistItemsMaster,
  transactionTypeChecklistItems,
  industryChecklistItems
} from '../../shared/schema';

export async function seedDueDiligenceData() {
  console.log('Seeding due diligence data...');

  // ========== TRANSACTION TYPES ==========
  const txTypes = await db.insert(transactionTypes).values([
    // Equity - Control
    { name: 'Leveraged Buyout (LBO)', category: 'equity', subcategory: 'control', description: 'Control acquisition using significant debt financing', displayOrder: 1 },
    { name: 'Management Buyout (MBO)', category: 'equity', subcategory: 'control', description: 'Acquisition by existing management team', displayOrder: 2 },
    { name: 'Strategic Acquisition', category: 'equity', subcategory: 'control', description: 'Acquisition by strategic buyer for synergies', displayOrder: 3 },
    { name: 'Platform Acquisition', category: 'equity', subcategory: 'control', description: 'Initial acquisition for add-on strategy', displayOrder: 4 },
    { name: 'Add-on/Bolt-on Acquisition', category: 'equity', subcategory: 'control', description: 'Bolt-on to existing platform company', displayOrder: 5 },
    // Equity - Minority
    { name: 'Growth Equity', category: 'equity', subcategory: 'minority', description: 'Minority investment to fund expansion', displayOrder: 6 },
    { name: 'Venture Capital', category: 'equity', subcategory: 'minority', description: 'Early-stage minority investment', displayOrder: 7 },
    { name: 'PIPE', category: 'equity', subcategory: 'minority', description: 'Private investment in public equity', displayOrder: 8 },
    // Debt - Senior
    { name: 'Senior Secured Loan', category: 'debt', subcategory: 'senior', description: 'First lien secured financing', displayOrder: 10 },
    { name: 'Asset-Based Loan (ABL)', category: 'debt', subcategory: 'senior', description: 'Lending against receivables and inventory', displayOrder: 11 },
    { name: 'Term Loan B', category: 'debt', subcategory: 'senior', description: 'Syndicated institutional term loan', displayOrder: 12 },
    { name: 'Direct Lending', category: 'debt', subcategory: 'senior', description: 'Non-bank direct origination', displayOrder: 13 },
    // Debt - Subordinated
    { name: 'Mezzanine Financing', category: 'debt', subcategory: 'subordinated', description: 'Subordinated debt with equity kicker', displayOrder: 14 },
    { name: 'Unitranche', category: 'debt', subcategory: 'subordinated', description: 'Blended senior/subordinated facility', displayOrder: 15 },
    // Debt - Special Situations
    { name: 'Distressed Debt', category: 'debt', subcategory: 'special_situations', description: 'Investment in troubled company debt', displayOrder: 16 },
    { name: 'DIP Financing', category: 'debt', subcategory: 'special_situations', description: 'Debtor-in-possession financing', displayOrder: 17 },
    // Hybrid
    { name: 'Convertible Note', category: 'hybrid', subcategory: 'convertible', description: 'Debt convertible to equity', displayOrder: 20 },
    { name: 'Preferred Equity', category: 'hybrid', subcategory: 'preferred', description: 'Senior equity with fixed returns', displayOrder: 21 },
    { name: 'Sale-Leaseback', category: 'hybrid', subcategory: 'structured', description: 'Asset sale with lease-back arrangement', displayOrder: 22 },
    { name: 'Royalty/Revenue Financing', category: 'hybrid', subcategory: 'structured', description: 'Returns based on revenue share', displayOrder: 23 },
    { name: 'Dividend Recapitalization', category: 'hybrid', subcategory: 'recap', description: 'Debt-funded shareholder distribution', displayOrder: 24 },
    // Asset
    { name: 'Asset Purchase', category: 'asset', subcategory: 'carveout', description: 'Purchase of specific assets', displayOrder: 30 },
    { name: 'Carve-out/Spin-off', category: 'asset', subcategory: 'carveout', description: 'Division separation from parent', displayOrder: 31 },
    { name: 'IP Acquisition', category: 'asset', subcategory: 'ip', description: 'Purchase of intellectual property', displayOrder: 32 },
    { name: 'Real Estate Acquisition', category: 'asset', subcategory: 'real_estate', description: 'Direct property acquisition', displayOrder: 33 },
  ]).returning();

  // ========== INDUSTRY SECTORS ==========
  const industries = await db.insert(industrySectors).values([
    { name: 'Financial Services', code: 'FINSERV', description: 'Banking, insurance, asset management, specialty finance', icon: '🏦', displayOrder: 1 },
    { name: 'Healthcare', code: 'HEALTHCARE', description: 'Healthcare services, life sciences, medical devices', icon: '🏥', displayOrder: 2 },
    { name: 'Technology', code: 'TECH', description: 'Software, hardware, IT services', icon: '💻', displayOrder: 3 },
    { name: 'Energy & Infrastructure', code: 'ENERGY', description: 'Oil & gas, renewables, utilities', icon: '⚡', displayOrder: 4 },
    { name: 'Manufacturing & Industrial', code: 'MANUFACTURING', description: 'General manufacturing, aerospace, industrial', icon: '🏭', displayOrder: 5 },
    { name: 'Consumer & Retail', code: 'CONSUMER', description: 'Retail, consumer products, restaurants', icon: '🛒', displayOrder: 6 },
    { name: 'Real Estate', code: 'REALESTATE', description: 'Property, REITs, real estate services', icon: '🏢', displayOrder: 7 },
    { name: 'Professional Services', code: 'PROFSERV', description: 'Legal, accounting, consulting, staffing', icon: '💼', displayOrder: 8 },
    { name: 'Transportation & Logistics', code: 'TRANSPORT', description: 'Trucking, shipping, logistics', icon: '🚚', displayOrder: 9 },
    { name: 'Media & Entertainment', code: 'MEDIA', description: 'Media, entertainment, gaming', icon: '🎬', displayOrder: 10 },
  ]).returning();

  // Get IDs for sub-sectors
  const finservId = industries.find(i => i.code === 'FINSERV')?.id;
  const healthcareId = industries.find(i => i.code === 'HEALTHCARE')?.id;
  const techId = industries.find(i => i.code === 'TECH')?.id;
  const realestateId = industries.find(i => i.code === 'REALESTATE')?.id;

  // Sub-sectors
  await db.insert(industrySectors).values([
    { name: 'Litigation Finance', code: 'FINSERV_LITFIN', parentSectorId: finservId, displayOrder: 1 },
    { name: 'Private Credit / Direct Lending', code: 'FINSERV_PRIVCREDIT', parentSectorId: finservId, displayOrder: 2 },
    { name: 'Insurance', code: 'FINSERV_INSURANCE', parentSectorId: finservId, displayOrder: 3 },
    { name: 'Asset Management', code: 'FINSERV_AM', parentSectorId: finservId, displayOrder: 4 },
    { name: 'Real Estate Lending', code: 'REALESTATE_LENDING', parentSectorId: realestateId, displayOrder: 1 },
    { name: 'Real Estate Operating', code: 'REALESTATE_OPERATING', parentSectorId: realestateId, displayOrder: 2 },
    { name: 'Healthcare Services', code: 'HEALTHCARE_SERVICES', parentSectorId: healthcareId, displayOrder: 1 },
    { name: 'Life Sciences / Pharma', code: 'HEALTHCARE_LIFESCI', parentSectorId: healthcareId, displayOrder: 2 },
    { name: 'Software / SaaS', code: 'TECH_SAAS', parentSectorId: techId, displayOrder: 1 },
    { name: 'Hardware / IoT', code: 'TECH_HARDWARE', parentSectorId: techId, displayOrder: 2 },
  ]);

  // ========== CHECKLIST SECTIONS ==========
  const sections = await db.insert(checklistSections).values([
    { name: 'Corporate Structure & Organization', displayOrder: 1, icon: 'Building2' },
    { name: 'Capitalization & Ownership', displayOrder: 2, icon: 'PieChart' },
    { name: 'Subsidiaries & Joint Ventures', displayOrder: 3, icon: 'GitBranch' },
    { name: 'Financial Due Diligence', displayOrder: 4, icon: 'DollarSign' },
    { name: 'Quality of Earnings Analysis', displayOrder: 5, icon: 'TrendingUp' },
    { name: 'Working Capital Analysis', displayOrder: 6, icon: 'RefreshCw' },
    { name: 'Debt & Capital Structure', displayOrder: 7, icon: 'CreditCard' },
    { name: 'Tax Matters & Compliance', displayOrder: 8, icon: 'FileText' },
    { name: 'Legal & Litigation Review', displayOrder: 9, icon: 'Scale' },
    { name: 'Material Contracts Analysis', displayOrder: 10, icon: 'FileSignature' },
    { name: 'Intellectual Property Assessment', displayOrder: 11, icon: 'Lightbulb' },
    { name: 'Real Property & Leases', displayOrder: 12, icon: 'Home' },
    { name: 'Environmental Compliance', displayOrder: 13, icon: 'Leaf' },
    { name: 'Human Resources & Labor', displayOrder: 14, icon: 'Users' },
    { name: 'Insurance Coverage Review', displayOrder: 15, icon: 'Shield' },
    { name: 'IT & Cybersecurity', displayOrder: 16, icon: 'Lock' },
    { name: 'Regulatory & Compliance', displayOrder: 17, icon: 'ClipboardCheck' },
    { name: 'Customer & Vendor Analysis', displayOrder: 18, icon: 'Handshake' },
    { name: 'Integration Considerations', displayOrder: 19, icon: 'Puzzle' },
    { name: 'Risk Summary & Red Flags', displayOrder: 20, icon: 'AlertTriangle' },
    { name: 'Media Coverage Analysis', displayOrder: 21, icon: 'Newspaper', isLiveSearch: true },
    { name: 'External Litigation Research', displayOrder: 22, icon: 'Search', isLiveSearch: true },
    { name: 'Regulatory Actions & Enforcement', displayOrder: 23, icon: 'Gavel', isLiveSearch: true },
  ]).returning();

  // ========== CHECKLIST ITEMS ==========
  // Get section IDs
  const sectionMap = sections.reduce((acc, s) => ({ ...acc, [s.name]: s.id }), {} as Record<string, string>);

  // Corporate Structure items
  const corporateItems = [
    'Certificate/Articles of Incorporation (including all amendments)',
    'Bylaws (current and all historical versions)',
    'Certificate of Good Standing from state of incorporation',
    'Certificates of Good Standing from all foreign qualification states',
    'Organizational chart showing all subsidiaries and affiliates',
    'List of jurisdictions where qualified to do business',
    'Minutes of Board of Directors meetings (last 5 years)',
    'Minutes of shareholder/member meetings (last 5 years)',
    'Written consents in lieu of meetings',
  ];

  // Capitalization items
  const capItems = [
    'Capitalization table (fully diluted)',
    'Stock ledger and certificate records',
    'Shareholder agreements',
    'Voting agreements and proxies',
    'Stock option plans and agreements',
    'Warrant agreements',
    'Convertible note/debt instruments',
    'Anti-dilution provisions',
    'Preemptive rights and rights of first refusal',
    'Registration rights agreements',
  ];

  // Financial items
  const financialItems = [
    'Audited financial statements (last 3-5 years)',
    'Unaudited interim financial statements (current year)',
    'Management letters from auditors',
    'Internal financial statements by month (last 24 months)',
    'Revenue recognition policies and analysis',
    'Schedule of accounting policies',
    'Audit committee reports',
  ];

  // QoE items
  const qoeItems = [
    'Revenue by customer, product line, and geography',
    'Gross margin analysis by segment',
    'EBITDA bridge and adjustments schedule',
    'Non-recurring items identification and support',
    'Related party transactions',
    'Pro forma earnings reconciliation',
    'Deferred revenue schedule and analysis',
    'Backlog analysis and documentation',
  ];

  // Working Capital items
  const wcItems = [
    'Net working capital calculation methodology',
    'Accounts receivable aging schedule',
    'Bad debt reserve analysis and write-off history',
    'Inventory analysis by category',
    'Inventory obsolescence reserves',
    'Accounts payable aging schedule',
    'Accrued liabilities detail and support',
    'Working capital seasonality analysis',
  ];

  // Debt items
  const debtItems = [
    'Long-term debt schedule',
    'Credit agreements and amendments',
    'Debt compliance certificates',
    'Covenant calculations and compliance history',
    'Capital lease obligations',
    'Letters of credit',
    'Guarantees and contingent liabilities',
    'Change of control provisions in debt documents',
  ];

  // Tax items
  const taxItems = [
    'Federal income tax returns (last 5 years)',
    'State income tax returns (last 5 years)',
    'IRS audit history and correspondence',
    'Net operating loss carryforwards',
    'Tax credit carryforwards (R&D, foreign tax)',
    'Section 382 limitation analysis',
    'Transfer pricing documentation',
    'Sales tax nexus analysis',
  ];

  // Litigation items
  const litigationItems = [
    'Schedule of all pending litigation',
    'Complaints, answers, and key pleadings',
    'Demand letters received',
    'Settlement negotiations in progress',
    'Litigation reserve schedule',
    'DOJ/SEC investigations or inquiries',
    'Regulatory agency investigations',
    'Government contract disputes',
  ];

  // Material Contracts items
  const contractItems = [
    'Top 20 customer contracts',
    'Master service agreements',
    'Customer concentration analysis',
    'Top 20 supplier contracts',
    'Single-source supplier agreements',
    'Distribution agreements',
    'Licensing agreements (inbound and outbound)',
    'Government contracts',
  ];

  // IP items
  const ipItems = [
    'Schedule of all patents (issued and pending)',
    'Patent assignment agreements',
    'Freedom to operate opinions',
    'Schedule of all trademarks',
    'Domain name portfolio',
    'Copyright registrations',
    'Trade secret protection measures',
    'Open source software usage and compliance',
  ];

  // Real Property items
  const realPropertyItems = [
    'Schedule of owned properties',
    'Deeds and title insurance policies',
    'Schedule of all leases',
    'Commercial lease agreements and amendments',
    'Lease abstracts (term, rent, options)',
    'Equipment lease schedules',
    'UCC financing statement searches',
  ];

  // Environmental items
  const environmentalItems = [
    'Environmental permits and licenses',
    'Phase I Environmental Site Assessments',
    'Phase II Environmental Site Assessments',
    'Known contamination issues',
    'Remediation cost estimates',
    'CERCLA/Superfund site involvement',
  ];

  // HR items
  const hrItems = [
    'Employee census by location and department',
    'Organization chart',
    'Executive employment agreements',
    'Key employee agreements',
    'Non-compete agreements',
    'Compensation structure and pay scales',
    'Bonus and incentive plans',
    'Collective bargaining agreements',
    'I-9 compliance documentation',
    'EEOC charges and complaints',
  ];

  // Insurance items
  const insuranceItems = [
    'General liability insurance',
    'Professional liability (E&O) insurance',
    'Directors & Officers (D&O) insurance',
    'Cyber/privacy liability insurance',
    'Workers compensation insurance',
    'Insurance claims history (last 5 years)',
    'Loss runs from all carriers',
  ];

  // IT items
  const itItems = [
    'IT systems architecture documentation',
    'Software inventory and licenses',
    'Cloud services inventory',
    'Disaster recovery plan',
    'Information security policy',
    'Penetration testing results',
    'Security incident history',
    'SOC 2 audit reports',
  ];

  // Regulatory items
  const regulatoryItems = [
    'Business licenses',
    'Industry-specific permits',
    'Compliance program documentation',
    'Privacy policy',
    'GDPR compliance documentation',
    'FCPA compliance program',
    'Export control compliance',
  ];

  // Customer/Vendor items
  const customerItems = [
    'Customer list with revenue by customer',
    'Customer concentration analysis',
    'Customer acquisition costs',
    'Churn/attrition analysis',
    'Net revenue retention metrics',
    'Supplier list with spend analysis',
    'Supply chain risk assessment',
  ];

  // Integration items
  const integrationItems = [
    'Integration planning documents',
    'Synergy identification and quantification',
    'IT integration assessment',
    'Facility consolidation analysis',
    'Day-one requirements checklist',
    'First 100 days plan',
  ];

  // Risk Summary items
  const riskItems = [
    'Key findings summary',
    'Material issues identified',
    'Red flags requiring attention',
    'Outstanding information requests',
    'Third-party advisor recommendations',
    'Deal structure considerations',
  ];

  // Insert all items
  const allItems = [
    ...corporateItems.map(text => ({ sectionId: sectionMap['Corporate Structure & Organization'], itemText: text })),
    ...capItems.map(text => ({ sectionId: sectionMap['Capitalization & Ownership'], itemText: text })),
    ...financialItems.map(text => ({ sectionId: sectionMap['Financial Due Diligence'], itemText: text })),
    ...qoeItems.map(text => ({ sectionId: sectionMap['Quality of Earnings Analysis'], itemText: text })),
    ...wcItems.map(text => ({ sectionId: sectionMap['Working Capital Analysis'], itemText: text })),
    ...debtItems.map(text => ({ sectionId: sectionMap['Debt & Capital Structure'], itemText: text })),
    ...taxItems.map(text => ({ sectionId: sectionMap['Tax Matters & Compliance'], itemText: text })),
    ...litigationItems.map(text => ({ sectionId: sectionMap['Legal & Litigation Review'], itemText: text })),
    ...contractItems.map(text => ({ sectionId: sectionMap['Material Contracts Analysis'], itemText: text })),
    ...ipItems.map(text => ({ sectionId: sectionMap['Intellectual Property Assessment'], itemText: text })),
    ...realPropertyItems.map(text => ({ sectionId: sectionMap['Real Property & Leases'], itemText: text })),
    ...environmentalItems.map(text => ({ sectionId: sectionMap['Environmental Compliance'], itemText: text })),
    ...hrItems.map(text => ({ sectionId: sectionMap['Human Resources & Labor'], itemText: text })),
    ...insuranceItems.map(text => ({ sectionId: sectionMap['Insurance Coverage Review'], itemText: text })),
    ...itItems.map(text => ({ sectionId: sectionMap['IT & Cybersecurity'], itemText: text })),
    ...regulatoryItems.map(text => ({ sectionId: sectionMap['Regulatory & Compliance'], itemText: text })),
    ...customerItems.map(text => ({ sectionId: sectionMap['Customer & Vendor Analysis'], itemText: text })),
    ...integrationItems.map(text => ({ sectionId: sectionMap['Integration Considerations'], itemText: text })),
    ...riskItems.map(text => ({ sectionId: sectionMap['Risk Summary & Red Flags'], itemText: text })),
  ];

  await db.insert(checklistItemsMaster).values(allItems);

  // ========== INDUSTRY-SPECIFIC ITEMS ==========
  // Get sub-sector IDs
  const litfinSector = await db.query.industrySectors.findFirst({ where: (s, { eq }) => eq(s.code, 'FINSERV_LITFIN') });
  const realEstateLendingSector = await db.query.industrySectors.findFirst({ where: (s, { eq }) => eq(s.code, 'REALESTATE_LENDING') });
  const saasSector = await db.query.industrySectors.findFirst({ where: (s, { eq }) => eq(s.code, 'TECH_SAAS') });
  const healthcareServicesSector = await db.query.industrySectors.findFirst({ where: (s, { eq }) => eq(s.code, 'HEALTHCARE_SERVICES') });

  // Litigation Finance specific items
  if (litfinSector) {
    const litfinItems = await db.insert(checklistItemsMaster).values([
      { sectionId: sectionMap['Financial Due Diligence'], itemText: 'Case portfolio inventory and status report', source: 'industry' },
      { sectionId: sectionMap['Financial Due Diligence'], itemText: 'Win/loss rates by case type and jurisdiction', source: 'industry' },
      { sectionId: sectionMap['Financial Due Diligence'], itemText: 'Average case duration and settlement timelines', source: 'industry' },
      { sectionId: sectionMap['Financial Due Diligence'], itemText: 'Funding commitment vs. deployed capital analysis', source: 'industry' },
      { sectionId: sectionMap['Financial Due Diligence'], itemText: 'Recovery rates and IRR by vintage', source: 'industry' },
      { sectionId: sectionMap['Material Contracts Analysis'], itemText: 'Law firm relationships and track record', source: 'industry' },
      { sectionId: sectionMap['Material Contracts Analysis'], itemText: 'Litigation funding agreements template review', source: 'industry' },
      { sectionId: sectionMap['Material Contracts Analysis'], itemText: 'Waterfall/priority of returns provisions', source: 'industry' },
      { sectionId: sectionMap['Regulatory & Compliance'], itemText: 'Champerty/maintenance law compliance by jurisdiction', source: 'industry' },
      { sectionId: sectionMap['Regulatory & Compliance'], itemText: 'Conflicts of interest protocols', source: 'industry' },
      { sectionId: sectionMap['Regulatory & Compliance'], itemText: 'Case selection criteria and underwriting process', source: 'industry' },
      { sectionId: sectionMap['Risk Summary & Red Flags'], itemText: 'Portfolio concentration by case type/jurisdiction', source: 'industry' },
      { sectionId: sectionMap['Risk Summary & Red Flags'], itemText: 'Adverse judgment exposure analysis', source: 'industry' },
    ]).returning();

    // Link to industry
    await db.insert(industryChecklistItems).values(
      litfinItems.map(item => ({
        industrySectorId: litfinSector.id,
        checklistItemId: item.id,
        isRequired: true,
        isRecommended: true,
      }))
    );
  }

  // Real Estate Lending specific items
  if (realEstateLendingSector) {
    const reLendingItems = await db.insert(checklistItemsMaster).values([
      { sectionId: sectionMap['Financial Due Diligence'], itemText: 'Loan-to-value (LTV) ratios by loan', source: 'industry' },
      { sectionId: sectionMap['Financial Due Diligence'], itemText: 'Debt service coverage ratios (DSCR)', source: 'industry' },
      { sectionId: sectionMap['Financial Due Diligence'], itemText: 'Collateral property appraisals', source: 'industry' },
      { sectionId: sectionMap['Financial Due Diligence'], itemText: 'Loan maturity schedule', source: 'industry' },
      { sectionId: sectionMap['Financial Due Diligence'], itemText: 'Interest rate exposure analysis', source: 'industry' },
      { sectionId: sectionMap['Material Contracts Analysis'], itemText: 'Borrower/sponsor financial statements', source: 'industry' },
      { sectionId: sectionMap['Material Contracts Analysis'], itemText: 'Guarantor analysis', source: 'industry' },
      { sectionId: sectionMap['Material Contracts Analysis'], itemText: 'Subordination/intercreditor agreements', source: 'industry' },
      { sectionId: sectionMap['Real Property & Leases'], itemText: 'Property condition assessments', source: 'industry' },
      { sectionId: sectionMap['Real Property & Leases'], itemText: 'Rent roll analysis', source: 'industry' },
      { sectionId: sectionMap['Real Property & Leases'], itemText: 'Lease rollover exposure', source: 'industry' },
      { sectionId: sectionMap['Risk Summary & Red Flags'], itemText: 'Geographic/property type concentration', source: 'industry' },
      { sectionId: sectionMap['Risk Summary & Red Flags'], itemText: 'Construction loan completion risk', source: 'industry' },
    ]).returning();

    await db.insert(industryChecklistItems).values(
      reLendingItems.map(item => ({
        industrySectorId: realEstateLendingSector.id,
        checklistItemId: item.id,
        isRequired: true,
        isRecommended: true,
      }))
    );
  }

  // SaaS specific items
  if (saasSector) {
    const saasItems = await db.insert(checklistItemsMaster).values([
      { sectionId: sectionMap['Financial Due Diligence'], itemText: 'Monthly/Annual Recurring Revenue (MRR/ARR)', source: 'industry' },
      { sectionId: sectionMap['Financial Due Diligence'], itemText: 'Net Revenue Retention (NRR)', source: 'industry' },
      { sectionId: sectionMap['Financial Due Diligence'], itemText: 'Gross and Net Churn rates', source: 'industry' },
      { sectionId: sectionMap['Financial Due Diligence'], itemText: 'Cohort analysis by vintage', source: 'industry' },
      { sectionId: sectionMap['Financial Due Diligence'], itemText: 'Rule of 40 calculation', source: 'industry' },
      { sectionId: sectionMap['Customer & Vendor Analysis'], itemText: 'Customer Acquisition Cost (CAC)', source: 'industry' },
      { sectionId: sectionMap['Customer & Vendor Analysis'], itemText: 'CAC Payback Period', source: 'industry' },
      { sectionId: sectionMap['Customer & Vendor Analysis'], itemText: 'Lifetime Value (LTV) and LTV:CAC ratio', source: 'industry' },
      { sectionId: sectionMap['Customer & Vendor Analysis'], itemText: 'Logo retention vs. dollar retention', source: 'industry' },
      { sectionId: sectionMap['IT & Cybersecurity'], itemText: 'Technical debt assessment', source: 'industry' },
      { sectionId: sectionMap['IT & Cybersecurity'], itemText: 'Infrastructure scalability analysis', source: 'industry' },
      { sectionId: sectionMap['IT & Cybersecurity'], itemText: 'Open source license compliance audit', source: 'industry' },
    ]).returning();

    await db.insert(industryChecklistItems).values(
      saasItems.map(item => ({
        industrySectorId: saasSector.id,
        checklistItemId: item.id,
        isRequired: true,
        isRecommended: true,
      }))
    );
  }

  // Healthcare Services specific items
  if (healthcareServicesSector) {
    const healthcareItems = await db.insert(checklistItemsMaster).values([
      { sectionId: sectionMap['Financial Due Diligence'], itemText: 'Payor mix and reimbursement rates', source: 'industry' },
      { sectionId: sectionMap['Financial Due Diligence'], itemText: 'Patient volume and acuity trends', source: 'industry' },
      { sectionId: sectionMap['Financial Due Diligence'], itemText: 'Value-based care contracts analysis', source: 'industry' },
      { sectionId: sectionMap['Regulatory & Compliance'], itemText: 'Medicare/Medicaid certification status', source: 'industry' },
      { sectionId: sectionMap['Regulatory & Compliance'], itemText: 'State licensure and CON requirements', source: 'industry' },
      { sectionId: sectionMap['Regulatory & Compliance'], itemText: 'Stark Law/Anti-Kickback compliance', source: 'industry' },
      { sectionId: sectionMap['Regulatory & Compliance'], itemText: 'HIPAA compliance program', source: 'industry' },
      { sectionId: sectionMap['Regulatory & Compliance'], itemText: 'Clinical quality metrics and accreditations', source: 'industry' },
      { sectionId: sectionMap['Human Resources & Labor'], itemText: 'Physician employment/referral arrangements', source: 'industry' },
      { sectionId: sectionMap['Human Resources & Labor'], itemText: 'Credentialing and privileging records', source: 'industry' },
      { sectionId: sectionMap['Legal & Litigation Review'], itemText: 'Malpractice claims history', source: 'industry' },
      { sectionId: sectionMap['IT & Cybersecurity'], itemText: 'Electronic health records systems', source: 'industry' },
    ]).returning();

    await db.insert(industryChecklistItems).values(
      healthcareItems.map(item => ({
        industrySectorId: healthcareServicesSector.id,
        checklistItemId: item.id,
        isRequired: true,
        isRecommended: true,
      }))
    );
  }

  console.log('Due diligence seed data complete!');
}
```

---

## TASK 3: API ROUTES

Create API endpoints for transaction types, industries, and checklist management.

### File: `server/routes/due-diligence.ts`

```typescript
import { Router } from 'express';
import { db } from '../db';
import { 
  transactionTypes, 
  industrySectors, 
  checklistSections,
  checklistItemsMaster,
  checklistTemplates,
  checklistTemplateItems,
  dealChecklists,
  dealChecklistItems,
  industryChecklistItems,
  transactionTypeChecklistItems
} from '../../shared/schema';
import { eq, and, isNull, asc } from 'drizzle-orm';

const router = Router();

// ========== TRANSACTION TYPES ==========
router.get('/transaction-types', async (req, res) => {
  try {
    const types = await db.select().from(transactionTypes)
      .where(eq(transactionTypes.isActive, true))
      .orderBy(asc(transactionTypes.displayOrder));
    
    // Group by category
    const grouped = types.reduce((acc, type) => {
      if (!acc[type.category]) acc[type.category] = [];
      acc[type.category].push(type);
      return acc;
    }, {} as Record<string, typeof types>);
    
    res.json({ transactionTypes: types, grouped });
  } catch (error) {
    console.error('Error fetching transaction types:', error);
    res.status(500).json({ error: 'Failed to fetch transaction types' });
  }
});

// ========== INDUSTRY SECTORS ==========
router.get('/industry-sectors', async (req, res) => {
  try {
    const sectors = await db.select().from(industrySectors)
      .where(eq(industrySectors.isActive, true))
      .orderBy(asc(industrySectors.displayOrder));
    
    // Build hierarchy
    const parents = sectors.filter(s => !s.parentSectorId);
    const children = sectors.filter(s => s.parentSectorId);
    
    const hierarchy = parents.map(parent => ({
      ...parent,
      children: children.filter(c => c.parentSectorId === parent.id)
    }));
    
    res.json({ sectors: hierarchy });
  } catch (error) {
    console.error('Error fetching industry sectors:', error);
    res.status(500).json({ error: 'Failed to fetch industry sectors' });
  }
});

// ========== CHECKLIST SECTIONS ==========
router.get('/checklist-sections', async (req, res) => {
  try {
    const sections = await db.select().from(checklistSections)
      .where(eq(checklistSections.isActive, true))
      .orderBy(asc(checklistSections.displayOrder));
    
    res.json({ sections });
  } catch (error) {
    console.error('Error fetching checklist sections:', error);
    res.status(500).json({ error: 'Failed to fetch sections' });
  }
});

// ========== GET CHECKLIST ITEMS BY SECTION ==========
router.get('/checklist-items', async (req, res) => {
  try {
    const { sectionId, transactionTypeId, industrySectorId } = req.query;
    
    // Get all default items
    let items = await db.select().from(checklistItemsMaster)
      .where(
        sectionId 
          ? eq(checklistItemsMaster.sectionId, sectionId as string)
          : eq(checklistItemsMaster.isDefault, true)
      );
    
    // If industry specified, add industry-specific items
    if (industrySectorId) {
      const industryItems = await db.select({
        item: checklistItemsMaster,
        mapping: industryChecklistItems
      })
      .from(industryChecklistItems)
      .innerJoin(checklistItemsMaster, eq(industryChecklistItems.checklistItemId, checklistItemsMaster.id))
      .where(eq(industryChecklistItems.industrySectorId, industrySectorId as string));
      
      const industryItemIds = new Set(industryItems.map(i => i.item.id));
      items = [
        ...items.filter(i => !industryItemIds.has(i.id)),
        ...industryItems.map(i => ({ ...i.item, isRequired: i.mapping.isRequired }))
      ];
    }
    
    res.json({ items });
  } catch (error) {
    console.error('Error fetching checklist items:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// ========== BUILD CHECKLIST FOR CONFIGURATION ==========
router.post('/build-checklist', async (req, res) => {
  try {
    const { transactionTypeId, industrySectorId, includeLiveSearch = true } = req.body;
    
    // Get all sections
    let sections = await db.select().from(checklistSections)
      .where(eq(checklistSections.isActive, true))
      .orderBy(asc(checklistSections.displayOrder));
    
    // Filter out live search sections if not included
    if (!includeLiveSearch) {
      sections = sections.filter(s => !s.isLiveSearch);
    }
    
    // Get default items for each section
    const items = await db.select().from(checklistItemsMaster)
      .where(eq(checklistItemsMaster.isDefault, true));
    
    // Get industry-specific items if specified
    let industryItems: any[] = [];
    if (industrySectorId) {
      industryItems = await db.select({
        item: checklistItemsMaster,
        mapping: industryChecklistItems
      })
      .from(industryChecklistItems)
      .innerJoin(checklistItemsMaster, eq(industryChecklistItems.checklistItemId, checklistItemsMaster.id))
      .where(eq(industryChecklistItems.industrySectorId, industrySectorId));
    }
    
    // Build response structure
    const result = sections.map(section => {
      const sectionItems = items.filter(i => i.sectionId === section.id);
      const sectionIndustryItems = industryItems
        .filter(i => i.item.sectionId === section.id)
        .map(i => ({
          ...i.item,
          isRequired: i.mapping.isRequired,
          isIndustrySpecific: true
        }));
      
      // Merge and dedupe
      const allItems = [
        ...sectionItems.map(i => ({ ...i, isRequired: false, isIndustrySpecific: false })),
        ...sectionIndustryItems.filter(ii => !sectionItems.some(si => si.id === ii.id))
      ];
      
      return {
        ...section,
        items: allItems,
        isExpanded: true
      };
    });
    
    res.json({ sections: result });
  } catch (error) {
    console.error('Error building checklist:', error);
    res.status(500).json({ error: 'Failed to build checklist' });
  }
});

// ========== TEMPLATES ==========
router.get('/templates', async (req, res) => {
  try {
    const { organizationId } = req.query;
    
    const templates = await db.select().from(checklistTemplates)
      .where(organizationId 
        ? eq(checklistTemplates.organizationId, organizationId as string)
        : eq(checklistTemplates.isShared, true)
      );
    
    res.json({ templates });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

router.post('/templates', async (req, res) => {
  try {
    const { name, description, transactionTypeId, industrySectorId, items, organizationId, createdBy } = req.body;
    
    // Create template
    const [template] = await db.insert(checklistTemplates).values({
      name,
      description,
      transactionTypeId,
      industrySectorId,
      organizationId,
      createdBy,
      isShared: false
    }).returning();
    
    // Add items
    if (items && items.length > 0) {
      await db.insert(checklistTemplateItems).values(
        items.map((item: any, index: number) => ({
          templateId: template.id,
          sectionId: item.sectionId,
          masterItemId: item.masterItemId,
          customItemText: item.customItemText,
          isIncluded: item.isIncluded ?? true,
          isRequired: item.isRequired ?? false,
          displayOrder: index
        }))
      );
    }
    
    res.json({ template });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

router.get('/templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const template = await db.query.checklistTemplates.findFirst({
      where: eq(checklistTemplates.id, id)
    });
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    const items = await db.select().from(checklistTemplateItems)
      .where(eq(checklistTemplateItems.templateId, id))
      .orderBy(asc(checklistTemplateItems.displayOrder));
    
    res.json({ template, items });
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

// ========== DEAL CHECKLISTS ==========
router.post('/deals/:dealId/checklists', async (req, res) => {
  try {
    const { dealId } = req.params;
    const { templateId, transactionTypeId, industrySectorId, name, sections, createdBy } = req.body;
    
    // Create deal checklist
    const [checklist] = await db.insert(dealChecklists).values({
      dealId,
      templateId,
      transactionTypeId,
      industrySectorId,
      name: name || 'Due Diligence Checklist',
      createdBy,
      status: 'draft'
    }).returning();
    
    // Add items from sections
    if (sections && sections.length > 0) {
      const itemsToInsert = sections.flatMap((section: any) => 
        section.items.map((item: any, index: number) => ({
          dealChecklistId: checklist.id,
          sectionId: section.id,
          masterItemId: item.id.startsWith('custom-') ? null : item.id,
          itemText: item.text || item.itemText,
          itemDescription: item.description || item.itemDescription,
          priority: item.isRequired ? 'critical' : 'standard',
          status: 'pending',
          displayOrder: index
        }))
      );
      
      await db.insert(dealChecklistItems).values(itemsToInsert);
    }
    
    res.json({ checklist });
  } catch (error) {
    console.error('Error creating deal checklist:', error);
    res.status(500).json({ error: 'Failed to create deal checklist' });
  }
});

router.get('/deals/:dealId/checklists', async (req, res) => {
  try {
    const { dealId } = req.params;
    
    const checklists = await db.select().from(dealChecklists)
      .where(eq(dealChecklists.dealId, dealId));
    
    res.json({ checklists });
  } catch (error) {
    console.error('Error fetching deal checklists:', error);
    res.status(500).json({ error: 'Failed to fetch deal checklists' });
  }
});

router.get('/deals/:dealId/checklists/:checklistId', async (req, res) => {
  try {
    const { checklistId } = req.params;
    
    const checklist = await db.query.dealChecklists.findFirst({
      where: eq(dealChecklists.id, checklistId)
    });
    
    if (!checklist) {
      return res.status(404).json({ error: 'Checklist not found' });
    }
    
    const items = await db.select().from(dealChecklistItems)
      .where(eq(dealChecklistItems.dealChecklistId, checklistId))
      .orderBy(asc(dealChecklistItems.displayOrder));
    
    // Group by section
    const sections = await db.select().from(checklistSections)
      .orderBy(asc(checklistSections.displayOrder));
    
    const groupedItems = sections.map(section => ({
      ...section,
      items: items.filter(i => i.sectionId === section.id)
    })).filter(s => s.items.length > 0);
    
    res.json({ checklist, sections: groupedItems });
  } catch (error) {
    console.error('Error fetching deal checklist:', error);
    res.status(500).json({ error: 'Failed to fetch checklist' });
  }
});

router.patch('/deals/:dealId/checklists/:checklistId/items/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    const updates = req.body;
    
    const [updated] = await db.update(dealChecklistItems)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(dealChecklistItems.id, itemId))
      .returning();
    
    res.json({ item: updated });
  } catch (error) {
    console.error('Error updating checklist item:', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

export default router;
```

---

## TASK 4: REACT COMPONENTS

### File: `client/src/components/deal-intelligence/TransactionTypeSelector.tsx`

```tsx
import { useState } from 'react';
import { ChevronRight, ChevronDown, Check, Building2, CreditCard, RefreshCw, Home } from 'lucide-react';

interface TransactionType {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  description?: string;
}

interface TransactionTypeSelectorProps {
  value?: string;
  onChange: (typeId: string, type: TransactionType) => void;
  transactionTypes: TransactionType[];
}

const categoryConfig = {
  equity: { label: 'Equity Investments', icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50' },
  debt: { label: 'Debt & Credit', icon: CreditCard, color: 'text-green-600', bg: 'bg-green-50' },
  hybrid: { label: 'Hybrid & Structured', icon: RefreshCw, color: 'text-purple-600', bg: 'bg-purple-50' },
  asset: { label: 'Asset Transactions', icon: Home, color: 'text-orange-600', bg: 'bg-orange-50' },
};

export function TransactionTypeSelector({ value, onChange, transactionTypes }: TransactionTypeSelectorProps) {
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['equity']);
  
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => 
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  };
  
  const typesByCategory = transactionTypes.reduce((acc, type) => {
    if (!acc[type.category]) acc[type.category] = [];
    acc[type.category].push(type);
    return acc;
  }, {} as Record<string, TransactionType[]>);
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100 overflow-hidden">
      {Object.entries(categoryConfig).map(([key, config]) => {
        const Icon = config.icon;
        const types = typesByCategory[key] || [];
        const isExpanded = expandedCategories.includes(key);
        const hasSelection = types.some(t => t.id === value);
        
        return (
          <div key={key}>
            <button
              onClick={() => toggleCategory(key)}
              className={`w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors ${hasSelection ? config.bg : ''}`}
            >
              <span className="flex items-center gap-3">
                <Icon className={`w-5 h-5 ${config.color}`} />
                <span className="font-medium text-gray-900">{config.label}</span>
                <span className="text-sm text-gray-400">({types.length})</span>
              </span>
              <div className="flex items-center gap-2">
                {hasSelection && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${config.bg} ${config.color}`}>
                    Selected
                  </span>
                )}
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </button>
            
            {isExpanded && types.length > 0 && (
              <div className="bg-gray-50 px-4 py-2 space-y-1">
                {types.map(type => (
                  <button
                    key={type.id}
                    onClick={() => onChange(type.id, type)}
                    className={`w-full text-left px-4 py-3 rounded-lg flex items-center justify-between transition-all ${
                      value === type.id 
                        ? 'bg-indigo-100 text-indigo-900 ring-2 ring-indigo-500' 
                        : 'hover:bg-white text-gray-700 hover:shadow-sm'
                    }`}
                  >
                    <div>
                      <div className="font-medium">{type.name}</div>
                      {type.description && (
                        <div className="text-sm text-gray-500 mt-0.5">{type.description}</div>
                      )}
                    </div>
                    {value === type.id && (
                      <Check className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

### File: `client/src/components/deal-intelligence/IndustrySectorSelector.tsx`

```tsx
import { useState, useMemo } from 'react';
import { Search, Check, ChevronDown, ChevronRight } from 'lucide-react';

interface IndustrySector {
  id: string;
  name: string;
  code: string;
  description?: string;
  icon?: string;
  children?: IndustrySector[];
}

interface IndustrySectorSelectorProps {
  value?: string;
  onChange: (sectorId: string, sector: IndustrySector) => void;
  sectors: IndustrySector[];
}

const industryIcons: Record<string, string> = {
  FINSERV: '🏦', HEALTHCARE: '🏥', TECH: '💻', ENERGY: '⚡',
  MANUFACTURING: '🏭', CONSUMER: '🛒', REALESTATE: '🏢',
  PROFSERV: '💼', TRANSPORT: '🚚', MEDIA: '🎬',
};

export function IndustrySectorSelector({ value, onChange, sectors }: IndustrySectorSelectorProps) {
  const [search, setSearch] = useState('');
  const [expandedSectors, setExpandedSectors] = useState<string[]>([]);
  
  const filteredSectors = useMemo(() => {
    if (!search) return sectors;
    const lower = search.toLowerCase();
    return sectors.filter(s => 
      s.name.toLowerCase().includes(lower) ||
      s.code.toLowerCase().includes(lower) ||
      s.children?.some(c => c.name.toLowerCase().includes(lower))
    );
  }, [sectors, search]);
  
  const toggleSector = (sectorId: string) => {
    setExpandedSectors(prev =>
      prev.includes(sectorId) ? prev.filter(id => id !== sectorId) : [...prev, sectorId]
    );
  };
  
  const isSelected = (sector: IndustrySector) => {
    return value === sector.id || sector.children?.some(c => c.id === value);
  };
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="p-3 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search industries..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
      </div>
      
      <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
        {filteredSectors.map(sector => {
          const hasChildren = sector.children && sector.children.length > 0;
          const isExpanded = expandedSectors.includes(sector.id);
          const selected = isSelected(sector);
          
          return (
            <div key={sector.id}>
              <button
                onClick={() => hasChildren ? toggleSector(sector.id) : onChange(sector.id, sector)}
                className={`w-full px-4 py-3 flex items-center justify-between transition-colors ${
                  selected ? 'bg-indigo-50' : 'hover:bg-gray-50'
                }`}
              >
                <span className="flex items-center gap-3">
                  <span className="text-xl">{industryIcons[sector.code] || '📊'}</span>
                  <span>
                    <span className={`font-medium ${selected ? 'text-indigo-900' : 'text-gray-900'}`}>
                      {sector.name}
                    </span>
                    {sector.description && (
                      <span className="text-sm text-gray-500 block">{sector.description}</span>
                    )}
                  </span>
                </span>
                <div className="flex items-center gap-2">
                  {value === sector.id && <Check className="w-5 h-5 text-indigo-600" />}
                  {hasChildren && (
                    isExpanded ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </button>
              
              {hasChildren && isExpanded && (
                <div className="bg-gray-50 px-4 py-2 space-y-1">
                  {sector.children!.map(child => (
                    <button
                      key={child.id}
                      onClick={() => onChange(child.id, child)}
                      className={`w-full text-left px-4 py-2 rounded-lg flex items-center justify-between text-sm transition-all ${
                        value === child.id
                          ? 'bg-indigo-100 text-indigo-900 ring-2 ring-indigo-500'
                          : 'hover:bg-white text-gray-600 hover:shadow-sm'
                      }`}
                    >
                      <span>{child.name}</span>
                      {value === child.id && <Check className="w-4 h-4 text-indigo-600" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

### File: `client/src/components/deal-intelligence/ChecklistBuilder.tsx`

```tsx
import { useState } from 'react';
import { 
  DndContext, closestCenter, DragEndEvent, useSensor, useSensors, PointerSensor 
} from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  Plus, Trash2, GripVertical, Star, ChevronDown, ChevronRight, Search, X 
} from 'lucide-react';

interface ChecklistItem {
  id: string;
  itemText: string;
  itemDescription?: string;
  isRequired: boolean;
  isCustom?: boolean;
  isIndustrySpecific?: boolean;
}

interface ChecklistSection {
  id: string;
  name: string;
  icon?: string;
  isLiveSearch?: boolean;
  items: ChecklistItem[];
  isExpanded?: boolean;
}

interface ChecklistBuilderProps {
  sections: ChecklistSection[];
  onChange: (sections: ChecklistSection[]) => void;
  readOnly?: boolean;
}

function SortableItem({ 
  item, 
  onRemove, 
  onToggleRequired, 
  readOnly 
}: { 
  item: ChecklistItem; 
  onRemove: () => void; 
  onToggleRequired: () => void;
  readOnly?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
    id: item.id, 
    disabled: readOnly 
  });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all ${
        item.isRequired 
          ? 'border-amber-200 bg-amber-50' 
          : 'border-gray-200 bg-white hover:border-gray-300'
      } ${isDragging ? 'shadow-lg ring-2 ring-indigo-500' : ''}`}
    >
      {!readOnly && (
        <button {...attributes} {...listeners} className="cursor-grab text-gray-400 hover:text-gray-600">
          <GripVertical className="w-4 h-4" />
        </button>
      )}
      
      <div className="w-4 h-4 border-2 border-gray-300 rounded flex-shrink-0" />
      
      <div className="flex-1 min-w-0">
        <span className="text-sm text-gray-800">{item.itemText}</span>
        {item.itemDescription && (
          <span className="text-xs text-gray-500 block mt-0.5">{item.itemDescription}</span>
        )}
      </div>
      
      <div className="flex items-center gap-1.5">
        {item.isCustom && (
          <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">Custom</span>
        )}
        {item.isIndustrySpecific && (
          <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">Industry</span>
        )}
        
        {!readOnly && (
          <>
            <button
              onClick={onToggleRequired}
              className={`p-1.5 rounded-lg transition-colors ${
                item.isRequired
                  ? 'text-amber-600 bg-amber-100 hover:bg-amber-200'
                  : 'text-gray-400 hover:text-amber-600 hover:bg-gray-100'
              }`}
              title={item.isRequired ? 'Mark as optional' : 'Mark as required'}
            >
              <Star className={`w-4 h-4 ${item.isRequired ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={onRemove}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function ChecklistBuilder({ sections, onChange, readOnly = false }: ChecklistBuilderProps) {
  const [search, setSearch] = useState('');
  const [addingToSection, setAddingToSection] = useState<string | null>(null);
  const [newItemText, setNewItemText] = useState('');
  
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  
  const toggleSection = (sectionId: string) => {
    onChange(sections.map(s => 
      s.id === sectionId ? { ...s, isExpanded: !s.isExpanded } : s
    ));
  };
  
  const handleDragEnd = (sectionId: string) => (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    
    onChange(sections.map(section => {
      if (section.id !== sectionId) return section;
      const oldIndex = section.items.findIndex(i => i.id === active.id);
      const newIndex = section.items.findIndex(i => i.id === over.id);
      return { ...section, items: arrayMove(section.items, oldIndex, newIndex) };
    }));
  };
  
  const removeItem = (sectionId: string, itemId: string) => {
    onChange(sections.map(section => 
      section.id === sectionId
        ? { ...section, items: section.items.filter(i => i.id !== itemId) }
        : section
    ));
  };
  
  const toggleRequired = (sectionId: string, itemId: string) => {
    onChange(sections.map(section => 
      section.id === sectionId
        ? { ...section, items: section.items.map(item =>
            item.id === itemId ? { ...item, isRequired: !item.isRequired } : item
          )}
        : section
    ));
  };
  
  const addCustomItem = (sectionId: string) => {
    if (!newItemText.trim()) return;
    
    const newItem: ChecklistItem = {
      id: `custom-${Date.now()}`,
      itemText: newItemText.trim(),
      isRequired: false,
      isCustom: true
    };
    
    onChange(sections.map(section =>
      section.id === sectionId
        ? { ...section, items: [...section.items, newItem] }
        : section
    ));
    
    setNewItemText('');
    setAddingToSection(null);
  };
  
  const filteredSections = sections.map(section => ({
    ...section,
    items: search 
      ? section.items.filter(item => item.itemText.toLowerCase().includes(search.toLowerCase()))
      : section.items
  }));
  
  const totalItems = sections.reduce((acc, s) => acc + s.items.length, 0);
  const requiredItems = sections.reduce((acc, s) => acc + s.items.filter(i => i.isRequired).length, 0);
  
  return (
    <div className="space-y-4">
      {/* Header Stats */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-600">{totalItems} total items</span>
          <span className="text-amber-600 font-medium">{requiredItems} required</span>
        </div>
      </div>
      
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search checklist items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
        {search && (
          <button 
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      
      {/* Sections */}
      <div className="space-y-3">
        {filteredSections.map((section, sectionIndex) => (
          <div key={section.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <span className="flex items-center gap-3">
                {section.isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-500" />
                )}
                <span className="font-semibold text-gray-900">
                  {sectionIndex + 1}. {section.name}
                </span>
                {section.isLiveSearch && (
                  <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                    Live Search
                  </span>
                )}
              </span>
              
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">{section.items.length} items</span>
                {section.items.filter(i => i.isRequired).length > 0 && (
                  <span className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded-full">
                    {section.items.filter(i => i.isRequired).length} required
                  </span>
                )}
              </div>
            </button>
            
            {section.isExpanded && (
              <div className="p-4">
                {section.items.length > 0 ? (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd(section.id)}
                  >
                    <SortableContext items={section.items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-2">
                        {section.items.map(item => (
                          <SortableItem
                            key={item.id}
                            item={item}
                            onRemove={() => removeItem(section.id, item.id)}
                            onToggleRequired={() => toggleRequired(section.id, item.id)}
                            readOnly={readOnly}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">No items in this section</p>
                )}
                
                {!readOnly && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    {addingToSection === section.id ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Enter custom checklist item..."
                          value={newItemText}
                          onChange={(e) => setNewItemText(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && addCustomItem(section.id)}
                          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                          autoFocus
                        />
                        <button
                          onClick={() => addCustomItem(section.id)}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                        >
                          Add
                        </button>
                        <button
                          onClick={() => { setAddingToSection(null); setNewItemText(''); }}
                          className="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAddingToSection(section.id)}
                        className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                      >
                        <Plus className="w-4 h-4" />
                        Add Custom Item
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## TASK 5: MAIN PAGE COMPONENT

### File: `client/src/pages/DealIntelligence.tsx`

```tsx
import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  FileText, Globe, Settings, Sparkles, Download, Save, Copy, 
  ChevronRight, ChevronLeft, Loader2, Check 
} from 'lucide-react';
import { TransactionTypeSelector } from '@/components/deal-intelligence/TransactionTypeSelector';
import { IndustrySectorSelector } from '@/components/deal-intelligence/IndustrySectorSelector';
import { ChecklistBuilder } from '@/components/deal-intelligence/ChecklistBuilder';

type Step = 'config' | 'customize' | 'generate';

export default function DealIntelligence() {
  const [step, setStep] = useState<Step>('config');
  const [selectedDeal, setSelectedDeal] = useState<string>('');
  const [targetCompanyName, setTargetCompanyName] = useState('');
  const [transactionTypeId, setTransactionTypeId] = useState<string | null>(null);
  const [transactionType, setTransactionType] = useState<any>(null);
  const [industrySectorId, setIndustrySectorId] = useState<string | null>(null);
  const [industrySector, setIndustrySector] = useState<any>(null);
  const [includeLiveSearch, setIncludeLiveSearch] = useState(true);
  const [checklistSections, setChecklistSections] = useState<any[]>([]);
  
  // Fetch transaction types
  const { data: transactionTypesData } = useQuery({
    queryKey: ['transaction-types'],
    queryFn: async () => {
      const res = await fetch('/api/due-diligence/transaction-types');
      return res.json();
    }
  });
  
  // Fetch industry sectors
  const { data: industrySectorsData } = useQuery({
    queryKey: ['industry-sectors'],
    queryFn: async () => {
      const res = await fetch('/api/due-diligence/industry-sectors');
      return res.json();
    }
  });
  
  // Fetch deals
  const { data: dealsData } = useQuery({
    queryKey: ['deals'],
    queryFn: async () => {
      const res = await fetch('/api/deals');
      return res.json();
    }
  });
  
  // Build checklist mutation
  const buildChecklistMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/due-diligence/build-checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionTypeId,
          industrySectorId,
          includeLiveSearch
        })
      });
      return res.json();
    },
    onSuccess: (data) => {
      setChecklistSections(data.sections);
    }
  });
  
  // Generate report mutation
  const generateReportMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/deals/${selectedDeal}/checklists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionTypeId,
          industrySectorId,
          name: `Due Diligence - ${targetCompanyName}`,
          sections: checklistSections
        })
      });
      return res.json();
    }
  });
  
  // Load checklist when moving to customize step
  useEffect(() => {
    if (step === 'customize' && checklistSections.length === 0) {
      buildChecklistMutation.mutate();
    }
  }, [step]);
  
  const canProceedFromConfig = selectedDeal && targetCompanyName;
  const canProceedFromCustomize = checklistSections.length > 0;
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <h1 className="text-2xl font-bold text-gray-900">Deal Intelligence</h1>
          <p className="text-gray-600 mt-1">
            Generate comprehensive AI-powered M&A due diligence reports for private equity transactions
          </p>
        </div>
      </div>
      
      {/* Progress Steps */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center gap-2">
            {[
              { key: 'config', label: 'Configure', num: 1 },
              { key: 'customize', label: 'Customize', num: 2 },
              { key: 'generate', label: 'Generate', num: 3 }
            ].map((s, i) => (
              <div key={s.key} className="flex items-center">
                <button
                  onClick={() => {
                    if (s.key === 'config') setStep('config');
                    else if (s.key === 'customize' && canProceedFromConfig) setStep('customize');
                    else if (s.key === 'generate' && canProceedFromCustomize) setStep('generate');
                  }}
                  disabled={
                    (s.key === 'customize' && !canProceedFromConfig) ||
                    (s.key === 'generate' && !canProceedFromCustomize)
                  }
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    step === s.key
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-gray-500 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                >
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium ${
                    step === s.key ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {s.num}
                  </span>
                  <span className="font-medium">{s.label}</span>
                </button>
                {i < 2 && <ChevronRight className="w-5 h-5 text-gray-300 mx-2" />}
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Step 1: Configuration */}
        {step === 'config' && (
          <div className="space-y-8">
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                AI Due Diligence Report Generator
              </h2>
              <p className="text-gray-600 mb-6">
                Automatically analyzes deal data room documents and generates a comprehensive due diligence checklist report with findings, risk flags, and recommended next steps.
              </p>
              
              {/* Deal Selection */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Deal to Analyze
                  </label>
                  <select
                    value={selectedDeal}
                    onChange={(e) => setSelectedDeal(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select a deal...</option>
                    {dealsData?.deals?.map((deal: any) => (
                      <option key={deal.id} value={deal.id}>{deal.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Company Name
                  </label>
                  <input
                    type="text"
                    placeholder="Enter target company name"
                    value={targetCompanyName}
                    onChange={(e) => setTargetCompanyName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Auto-populated from deal name. Customize if needed for report headers.
                  </p>
                </div>
              </div>
              
              {/* Live Search Toggle */}
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-green-600" />
                    <div>
                      <span className="font-medium text-gray-900">Include Live Web Search</span>
                      <p className="text-sm text-gray-600">
                        Adds sections 21-23 with real-time web search for media coverage, litigation history, and regulatory enforcement actions.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIncludeLiveSearch(!includeLiveSearch)}
                    className={`relative w-14 h-7 rounded-full transition-colors ${
                      includeLiveSearch ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      includeLiveSearch ? 'translate-x-7' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-8">
              {/* Transaction Type */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-indigo-600" />
                  Transaction Type
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                  Select the investment structure to customize due diligence requirements.
                </p>
                {transactionTypeId && transactionType && (
                  <div className="mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center justify-between">
                    <div>
                      <span className="font-medium text-indigo-900">{transactionType.name}</span>
                      <span className="text-sm text-indigo-600 block">{transactionType.description}</span>
                    </div>
                    <Check className="w-5 h-5 text-indigo-600" />
                  </div>
                )}
                <TransactionTypeSelector
                  value={transactionTypeId || undefined}
                  onChange={(id, type) => { setTransactionTypeId(id); setTransactionType(type); }}
                  transactionTypes={transactionTypesData?.transactionTypes || []}
                />
              </div>
              
              {/* Industry Sector */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                  Industry Sector
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                  Select the target's industry to include sector-specific diligence items.
                </p>
                {industrySectorId && industrySector && (
                  <div className="mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center justify-between">
                    <span className="font-medium text-indigo-900">{industrySector.name}</span>
                    <Check className="w-5 h-5 text-indigo-600" />
                  </div>
                )}
                <IndustrySectorSelector
                  value={industrySectorId || undefined}
                  onChange={(id, sector) => { setIndustrySectorId(id); setIndustrySector(sector); }}
                  sectors={industrySectorsData?.sectors || []}
                />
              </div>
            </div>
          </div>
        )}
        
        {/* Step 2: Customize Checklist */}
        {step === 'customize' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Customize Due Diligence Checklist</h2>
                  <p className="text-sm text-gray-600">
                    Add, remove, or reorder items. Mark critical items as required with the star icon.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm font-medium">
                    <Save className="w-4 h-4" />
                    Save as Template
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm font-medium">
                    <Copy className="w-4 h-4" />
                    Load Template
                  </button>
                </div>
              </div>
              
              {buildChecklistMutation.isPending ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                  <span className="ml-3 text-gray-600">Building checklist...</span>
                </div>
              ) : (
                <ChecklistBuilder
                  sections={checklistSections}
                  onChange={setChecklistSections}
                />
              )}
            </div>
          </div>
        )}
        
        {/* Step 3: Generate */}
        {step === 'generate' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Report Summary</h2>
              
              <div className="grid grid-cols-4 gap-6 mb-6">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-500 block mb-1">Target Company</span>
                  <span className="font-semibold text-gray-900">{targetCompanyName}</span>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-500 block mb-1">Transaction Type</span>
                  <span className="font-semibold text-gray-900">{transactionType?.name || 'Not specified'}</span>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-500 block mb-1">Industry</span>
                  <span className="font-semibold text-gray-900">{industrySector?.name || 'Not specified'}</span>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-500 block mb-1">Total Items</span>
                  <span className="font-semibold text-gray-900">
                    {checklistSections.reduce((acc, s) => acc + s.items.length, 0)}
                  </span>
                </div>
              </div>
              
              <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg mb-6">
                <h3 className="font-medium text-indigo-900 mb-2">Data Sources</h3>
                <ul className="text-sm text-indigo-700 space-y-1">
                  <li>• Financial statements and projections will be analyzed</li>
                  <li>• Legal documents and contracts will be reviewed</li>
                  <li>• AI-powered risk flagging and scoring enabled</li>
                  {includeLiveSearch && <li>• Live web search for media, litigation, and regulatory actions</li>}
                </ul>
              </div>
              
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  <strong>Confidentiality Notice:</strong> Generated reports are marked as attorney work product and should be treated as confidential material. The AI analysis supplements but does not replace professional due diligence by qualified advisors.
                </p>
              </div>
            </div>
            
            <button
              onClick={() => generateReportMutation.mutate()}
              disabled={generateReportMutation.isPending}
              className="w-full py-4 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {generateReportMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating Report...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Generate Due Diligence Report PDF
                </>
              )}
            </button>
          </div>
        )}
        
        {/* Navigation */}
        <div className="flex justify-between mt-8">
          {step !== 'config' && (
            <button
              onClick={() => setStep(step === 'generate' ? 'customize' : 'config')}
              className="flex items-center gap-2 px-6 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 font-medium"
            >
              <ChevronLeft className="w-5 h-5" />
              Previous
            </button>
          )}
          {step !== 'generate' && (
            <button
              onClick={() => {
                if (step === 'config') setStep('customize');
                else setStep('generate');
              }}
              disabled={step === 'config' && !canProceedFromConfig}
              className="ml-auto flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

## TASK 6: REGISTER ROUTES AND RUN MIGRATIONS

1. Add the due diligence routes to your main server file:

```typescript
// server/index.ts or server/routes.ts
import dueDiligenceRoutes from './routes/due-diligence';
app.use('/api/due-diligence', dueDiligenceRoutes);
```

2. Run database migrations:
```bash
npm run db:push
```

3. Run the seed script:
```bash
npx tsx server/seeds/due-diligence-seed.ts
```

4. Install required dependencies:
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

---

## TASK 7: ADD PAGE ROUTE

Add the route to your router configuration:

```tsx
// client/src/App.tsx or router config
import DealIntelligence from './pages/DealIntelligence';

// Add route
<Route path="/deal-intelligence" element={<DealIntelligence />} />
```

---

## SUMMARY

This implementation adds:

1. **Transaction Type Selection** - 25 transaction types across 4 categories (equity, debt, hybrid, asset)
2. **Industry Sector Selection** - 10 parent industries with sub-sectors including Litigation Finance, Real Estate Lending, SaaS, Healthcare
3. **Dynamic Checklist Building** - Automatically includes industry-specific items based on selection
4. **Drag-and-Drop Customization** - Reorder items, mark as required, add custom items
5. **Template System** - Save and load custom checklist configurations
6. **3-Step Wizard** - Configure → Customize → Generate flow

The checklist dynamically adjusts based on:
- Transaction type (LBO needs different items than mezzanine financing)
- Industry sector (litigation finance has case metrics, SaaS has ARR/churn)
- User customization (add/remove/reorder items)
