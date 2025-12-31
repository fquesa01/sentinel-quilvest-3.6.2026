/**
 * Sector-Specific Rule Pack Seed Data
 * Pre-configured compliance rule packs for different industry sectors
 */

export const sectorRulePacksData = [
  // 1. Broker-Dealer / Financial Services
  {
    packName: "Broker-Dealer Compliance Pack",
    industrySector: "broker_dealer",
    description: "Comprehensive compliance monitoring for FINRA-regulated broker-dealers including trade supervision, communications review, and insider trading prevention",
    regulatoryBodies: [
      { name: "Financial Industry Regulatory Authority", acronym: "FINRA", jurisdiction: "federal" },
      { name: "Securities and Exchange Commission", acronym: "SEC", jurisdiction: "federal" },
      { name: "Municipal Securities Rulemaking Board", acronym: "MSRB", jurisdiction: "federal" }
    ],
    ruleCategories: [
      "Supervision of Communications",
      "Insider Trading",
      "Market Manipulation",
      "Best Execution",
      "Suitability",
      "Outside Business Activities",
      "Gifts and Entertainment",
      "Political Contributions"
    ],
    isActive: "true",
    version: 1,
    detectionRules: [
      {
        ruleName: "FINRA 3110 - Supervision Communications Review",
        ruleDescription: "Detect communications requiring supervisory review under FINRA Rule 3110",
        detectionType: "other_violation",
        violationType: "finra",
        keywords: ["recommending", "buy", "sell", "trade", "investment opportunity", "guaranteed return", "risk-free"],
        severity: "medium",
        riskScore: 60,
        requiresAiConfirmation: "true"
      },
      {
        ruleName: "Reg BI - Best Interest Obligation",
        ruleDescription: "Monitor for potential Regulation Best Interest violations in customer communications",
        detectionType: "off_channel_steering",
        violationType: "reg_bi",
        keywords: ["commission", "fee structure", "conflict of interest", "proprietary product", "revenue sharing"],
        severity: "high",
        riskScore: 75,
        requiresAiConfirmation: "true"
      },
      {
        ruleName: "FINRA 3210 - Prohibited Borrowing/Lending",
        ruleDescription: "Detect prohibited lending arrangements between registered persons and customers",
        detectionType: "other_violation",
        violationType: "finra",
        keywords: ["loan", "borrow", "lend", "personal loan", "line of credit", "IOU"],
        severity: "high",
        riskScore: 80,
        requiresAiConfirmation: "false"
      },
      {
        ruleName: "FINRA 2010 - Gifts & Entertainment Limits",
        ruleDescription: "Monitor gifts and entertainment exceeding $100 per person per year",
        detectionType: "teaching_moment",
        violationType: "finra",
        keywords: ["dinner", "tickets", "golf", "gift", "entertainment", "concert", "sporting event"],
        regexPatterns: ["\\$\\d{3,}", "\\d{3,}\\s*dollars"],
        severity: "low",
        riskScore: 40,
        requiresAiConfirmation: "true"
      }
    ]
  },

  // 2. Investment Advisor
  {
    packName: "Investment Advisor Compliance Pack",
    industrySector: "investment_advisor",
    description: "SEC-registered investment advisor compliance for fiduciary duty, custody rules, advertising, and Form ADV accuracy",
    regulatoryBodies: [
      { name: "Securities and Exchange Commission", acronym: "SEC", jurisdiction: "federal" },
      { name: "State Securities Regulators", acronym: "NASAA", jurisdiction: "state" }
    ],
    ruleCategories: [
      "Fiduciary Duty",
      "Custody Rule",
      "Advertising Rule",
      "Form ADV Accuracy",
      "Code of Ethics",
      "Performance Reporting",
      "Privacy (Reg S-P)"
    ],
    isActive: "true",
    version: 1,
    detectionRules: [
      {
        ruleName: "Custody Rule 206(4)-2 - Client Asset Protection",
        ruleDescription: "Monitor for improper handling of client assets or custody arrangements",
        detectionType: "aml_suspicious_transaction",
        violationType: "custody_rule",
        keywords: ["custody", "client funds", "client assets", "wire transfer", "ACH", "account access"],
        severity: "critical",
        riskScore: 90,
        requiresAiConfirmation: "true"
      },
      {
        ruleName: "Advertising Rule 206(4)-1 - Testimonials & Performance",
        ruleDescription: "Detect prohibited testimonials or misleading performance claims",
        detectionType: "other_violation",
        violationType: "advertising",
        keywords: ["testimonial", "best advisor", "top performer", "guaranteed", "track record", "past performance"],
        severity: "medium",
        riskScore: 65,
        requiresAiConfirmation: "true"
      },
      {
        ruleName: "Reg S-P - Customer Privacy Protection",
        ruleDescription: "Monitor for unauthorized disclosure of customer information",
        detectionType: "reg_sp_privacy_violation",
        violationType: "privacy",
        keywords: ["SSN", "social security", "account number", "tax ID", "DOB", "date of birth"],
        severity: "high",
        riskScore: 80,
        requiresAiConfirmation: "false"
      }
    ]
  },

  // 3. Life Sciences / Pharmaceutical
  {
    packName: "Life Sciences Compliance Pack",
    industrySector: "life_sciences",
    description: "FDA-regulated life sciences compliance including clinical trial monitoring, off-label promotion prevention, and healthcare provider interactions",
    regulatoryBodies: [
      { name: "Food and Drug Administration", acronym: "FDA", jurisdiction: "federal" },
      { name: "Department of Health and Human Services", acronym: "HHS", jurisdiction: "federal" },
      { name: "Office of Inspector General", acronym: "OIG", jurisdiction: "federal" }
    ],
    ruleCategories: [
      "Off-Label Promotion",
      "Clinical Trial Integrity",
      "Adverse Event Reporting",
      "HCP Interactions",
      "Anti-Kickback Statute",
      "False Claims Act",
      "Sunshine Act Reporting"
    ],
    isActive: "true",
    version: 1,
    detectionRules: [
      {
        ruleName: "FDCA - Off-Label Promotion Detection",
        ruleDescription: "Detect potential off-label marketing of FDA-approved drugs",
        detectionType: "other_violation",
        violationType: "off_label_promotion",
        keywords: ["unapproved use", "investigational", "off-label", "not indicated", "alternative indication"],
        severity: "critical",
        riskScore: 95,
        requiresAiConfirmation: "true"
      },
      {
        ruleName: "Clinical Trial Monitoring - GCP Violations",
        ruleDescription: "Monitor for Good Clinical Practice violations in trial communications",
        detectionType: "other_violation",
        violationType: "clinical_trial",
        keywords: ["protocol deviation", "SAE", "serious adverse event", "unblinding", "data manipulation"],
        severity: "critical",
        riskScore: 90,
        requiresAiConfirmation: "true"
      },
      {
        ruleName: "Anti-Kickback Statute - HCP Payment Monitoring",
        ruleDescription: "Detect improper remuneration to healthcare providers",
        detectionType: "fcpa_payment_intent",
        violationType: "healthcare_fraud",
        keywords: ["consulting fee", "speaker program", "advisory board", "honorarium", "per diem"],
        regexPatterns: ["\\$\\d{4,}", "\\d{4,}\\s*dollars"],
        severity: "high",
        riskScore: 85,
        requiresAiConfirmation: "true"
      },
      {
        ruleName: "Adverse Event Reporting - 15-Day Rule",
        ruleDescription: "Identify unreported serious adverse events requiring FDA notification",
        detectionType: "other_violation",
        violationType: "fda",
        keywords: ["death", "hospitalization", "life-threatening", "disability", "adverse event", "AE", "SAE"],
        severity: "critical",
        riskScore: 95,
        requiresAiConfirmation: "false"
      }
    ]
  },

  // 4. Defense Contractor / Aerospace
  {
    packName: "Defense Contractor Compliance Pack",
    industrySector: "defense_contractor",
    description: "ITAR, EAR, and FAR compliance for defense contractors including export controls, cost accounting, and procurement integrity",
    regulatoryBodies: [
      { name: "Department of State - DDTC", acronym: "DDTC", jurisdiction: "federal" },
      { name: "Department of Commerce - BIS", acronym: "BIS", jurisdiction: "federal" },
      { name: "Department of Defense", acronym: "DoD", jurisdiction: "federal" },
      { name: "Defense Contract Audit Agency", acronym: "DCAA", jurisdiction: "federal" }
    ],
    ruleCategories: [
      "ITAR Export Controls",
      "EAR Compliance",
      "FAR Cost Accounting",
      "Procurement Integrity",
      "Cybersecurity (CMMC)",
      "False Claims Prevention",
      "Classified Information"
    ],
    isActive: "true",
    version: 1,
    detectionRules: [
      {
        ruleName: "ITAR - Export Control Violations",
        ruleDescription: "Detect unauthorized export of defense articles or technical data",
        detectionType: "other_violation",
        violationType: "export_control",
        keywords: ["technical data", "export", "foreign national", "deemed export", "ITAR", "USML"],
        severity: "critical",
        riskScore: 100,
        requiresAiConfirmation: "true"
      },
      {
        ruleName: "FAR 31.205 - Unallowable Cost Identification",
        ruleDescription: "Identify potentially unallowable costs in government contracts",
        detectionType: "other_violation",
        violationType: "procurement_fraud",
        keywords: ["lobbying", "entertainment", "alcohol", "personal expense", "political contribution"],
        severity: "high",
        riskScore: 75,
        requiresAiConfirmation: "true"
      },
      {
        ruleName: "Procurement Integrity Act - Contractor Information",
        ruleDescription: "Monitor for improper receipt of source selection or bid information",
        detectionType: "antitrust_price_fixing",
        violationType: "procurement_fraud",
        keywords: ["bid information", "source selection", "competitor bid", "pricing data", "evaluation criteria"],
        severity: "critical",
        riskScore: 90,
        requiresAiConfirmation: "true"
      },
      {
        ruleName: "CMMC - Cybersecurity Information Protection",
        ruleDescription: "Detect potential CUI or FCI information spillage",
        detectionType: "off_channel_steering",
        violationType: "data_security",
        keywords: ["CUI", "controlled unclassified", "FCI", "federal contract information", "personal device"],
        severity: "high",
        riskScore: 80,
        requiresAiConfirmation: "true"
      }
    ]
  },

  // 5. Medical Device
  {
    packName: "Medical Device Compliance Pack",
    industrySector: "medical_device",
    description: "FDA medical device compliance including Quality System Regulation, MDR, adverse event reporting, and UDI requirements",
    regulatoryBodies: [
      { name: "Food and Drug Administration - CDRH", acronym: "FDA/CDRH", jurisdiction: "federal" },
      { name: "Centers for Medicare & Medicaid Services", acronym: "CMS", jurisdiction: "federal" }
    ],
    ruleCategories: [
      "Quality System Regulation (QSR)",
      "Medical Device Reporting (MDR)",
      "Premarket Approval",
      "510(k) Clearance",
      "UDI Compliance",
      "Adverse Event Reporting",
      "Promotional Claims"
    ],
    isActive: "true",
    version: 1,
    detectionRules: [
      {
        ruleName: "21 CFR Part 820 - QSR Design Control",
        ruleDescription: "Monitor for design control violations in product development",
        detectionType: "other_violation",
        violationType: "fda",
        keywords: ["design change", "DHF", "design history file", "validation", "verification", "undocumented change"],
        severity: "high",
        riskScore: 80,
        requiresAiConfirmation: "true"
      },
      {
        ruleName: "MDR - Medical Device Reporting (30-Day/5-Day)",
        ruleDescription: "Identify reportable device-related deaths, serious injuries, or malfunctions",
        detectionType: "other_violation",
        violationType: "fda",
        keywords: ["device failure", "patient harm", "malfunction", "MDR", "reportable event", "serious injury"],
        severity: "critical",
        riskScore: 95,
        requiresAiConfirmation: "false"
      },
      {
        ruleName: "Off-Label Promotion - Medical Device",
        ruleDescription: "Detect promotion beyond approved/cleared indications for use",
        detectionType: "other_violation",
        violationType: "off_label_promotion",
        keywords: ["off-label", "unapproved use", "investigational", "510(k) indication", "not cleared for"],
        severity: "high",
        riskScore: 85,
        requiresAiConfirmation: "true"
      }
    ]
  },

  // 6. Technology / Software
  {
    packName: "Technology Sector Compliance Pack",
    industrySector: "technology",
    description: "Technology sector compliance for data privacy, export controls, antitrust, and IP protection",
    regulatoryBodies: [
      { name: "Federal Trade Commission", acronym: "FTC", jurisdiction: "federal" },
      { name: "Department of Commerce - BIS", acronym: "BIS", jurisdiction: "federal" },
      { name: "State Attorneys General", acronym: "State AG", jurisdiction: "state" }
    ],
    ruleCategories: [
      "Data Privacy (GDPR/CCPA)",
      "Export Controls (EAR)",
      "Antitrust",
      "IP Protection",
      "Consumer Protection",
      "Accessibility (ADA)",
      "Security Breach Notification"
    ],
    isActive: "true",
    version: 1,
    detectionRules: [
      {
        ruleName: "GDPR/CCPA - Personal Data Protection",
        ruleDescription: "Monitor for unauthorized processing or sharing of personal data",
        detectionType: "reg_sp_privacy_violation",
        violationType: "privacy",
        keywords: ["personal data", "PII", "user data", "email list", "customer database", "data transfer"],
        severity: "high",
        riskScore: 80,
        requiresAiConfirmation: "true"
      },
      {
        ruleName: "Sherman Act - Price Fixing Detection",
        ruleDescription: "Detect potential price-fixing or market allocation discussions",
        detectionType: "antitrust_price_fixing",
        violationType: "antitrust",
        keywords: ["pricing strategy", "market share", "competitor pricing", "price floor", "bid rigging"],
        severity: "critical",
        riskScore: 90,
        requiresAiConfirmation: "true"
      },
      {
        ruleName: "EAR - Encryption Export Controls",
        ruleDescription: "Monitor for unauthorized export of encryption technology",
        detectionType: "other_violation",
        violationType: "export_control",
        keywords: ["encryption", "cryptography", "export", "ECCN", "5D002", "mass market exception"],
        severity: "high",
        riskScore: 75,
        requiresAiConfirmation: "true"
      }
    ]
  },

  // 7. General Financial Services
  {
    packName: "Financial Services Compliance Pack",
    industrySector: "financial_services",
    description: "General financial services compliance covering AML, BSA, sanctions, consumer protection, and fair lending",
    regulatoryBodies: [
      { name: "Financial Crimes Enforcement Network", acronym: "FinCEN", jurisdiction: "federal" },
      { name: "Office of Foreign Assets Control", acronym: "OFAC", jurisdiction: "federal" },
      { name: "Consumer Financial Protection Bureau", acronym: "CFPB", jurisdiction: "federal" },
      { name: "Office of the Comptroller of the Currency", acronym: "OCC", jurisdiction: "federal" }
    ],
    ruleCategories: [
      "Anti-Money Laundering (AML)",
      "Bank Secrecy Act (BSA)",
      "OFAC Sanctions",
      "Fair Lending",
      "Consumer Protection",
      "Unfair/Deceptive Practices",
      "Privacy (GLBA)"
    ],
    isActive: "true",
    version: 1,
    detectionRules: [
      {
        ruleName: "BSA/AML - Structuring Detection",
        ruleDescription: "Identify potential structuring to evade CTR reporting",
        detectionType: "aml_suspicious_transaction",
        violationType: "banking",
        keywords: ["split transaction", "multiple deposits", "$9,000", "just under 10k", "avoid reporting"],
        regexPatterns: ["\\$9[,\\d]{3,}", "\\$8[,\\d]{3,}"],
        severity: "critical",
        riskScore: 90,
        requiresAiConfirmation: "true"
      },
      {
        ruleName: "OFAC - Sanctions Screening Alerts",
        ruleDescription: "Monitor for potential OFAC sanctions violations",
        detectionType: "fcpa_third_party_risk",
        violationType: "sanctions",
        keywords: ["Iran", "North Korea", "Syria", "Cuba", "SDN list", "blocked person", "sanctioned country"],
        severity: "critical",
        riskScore: 100,
        requiresAiConfirmation: "false"
      },
      {
        ruleName: "ECOA/Reg B - Fair Lending Monitoring",
        ruleDescription: "Detect potential discriminatory lending practices",
        detectionType: "teaching_moment",
        violationType: "discrimination",
        keywords: ["protected class", "race", "religion", "national origin", "familial status", "redlining"],
        severity: "high",
        riskScore: 85,
        requiresAiConfirmation: "true"
      },
      {
        ruleName: "GLBA - Customer Information Safeguards",
        ruleDescription: "Monitor for unauthorized disclosure of customer financial information",
        detectionType: "reg_sp_privacy_violation",
        violationType: "privacy",
        keywords: ["account balance", "credit score", "loan application", "financial information", "customer data"],
        severity: "high",
        riskScore: 75,
        requiresAiConfirmation: "true"
      }
    ]
  },

  // 8. General (Cross-Sector)
  {
    packName: "General Compliance Pack",
    industrySector: "general",
    description: "General corporate compliance applicable across all sectors including FCPA, antitrust, employment law, and data privacy",
    regulatoryBodies: [
      { name: "Department of Justice", acronym: "DOJ", jurisdiction: "federal" },
      { name: "Securities and Exchange Commission", acronym: "SEC", jurisdiction: "federal" },
      { name: "Equal Employment Opportunity Commission", acronym: "EEOC", jurisdiction: "federal" }
    ],
    ruleCategories: [
      "Foreign Corrupt Practices Act",
      "Antitrust",
      "Employment Discrimination",
      "Workplace Harassment",
      "Insider Trading",
      "Data Privacy",
      "Records Retention"
    ],
    isActive: "true",
    version: 1,
    detectionRules: [
      // FCPA Rules
      {
        ruleName: "FCPA - Facilitation / Grease Payment",
        ruleDescription: "Surface explicit/euphemistic bribe requests around foreign officials using terms like facilitation fee, grease payment, under the table",
        detectionType: "fcpa_foreign_official",
        violationType: "fcpa",
        keywords: ["facilitation fee", "grease payment", "under the table", "backhander", "sweetener", "envelope", "make it happen", "oiling the wheels", "official", "minister", "ministry", "regulator", "customs", "inspector", "permit"],
        severity: "critical",
        riskScore: 85,
        requiresAiConfirmation: "true"
      },
      {
        ruleName: "FCPA - Gifts & Hospitality for Officials",
        ruleDescription: "Detect high-value gifts/travel for foreign officials that may breach policy",
        detectionType: "fcpa_foreign_official",
        violationType: "fcpa",
        keywords: ["gift", "hospitality", "tickets", "hotel", "per diem", "five-star", "business class", "first class", "gala", "lodging", "official", "minister", "government"],
        severity: "critical",
        riskScore: 80,
        requiresAiConfirmation: "true"
      },
      {
        ruleName: "FCPA - Travel for Officials/Relatives",
        ruleDescription: "Sponsoring travel/hospitality for foreign officials or their relatives",
        detectionType: "fcpa_foreign_official",
        violationType: "fcpa",
        keywords: ["itinerary", "visa", "per diem", "lodging", "tickets", "official", "minister", "government", "spouse", "family", "plus one", "children"],
        severity: "critical",
        riskScore: 82,
        requiresAiConfirmation: "true"
      },
      {
        ruleName: "FCPA - Charity with Government Nexus",
        ruleDescription: "Charitable/sponsorship payments tied to permits or officials",
        detectionType: "fcpa_third_party_risk",
        violationType: "fcpa",
        keywords: ["donation", "sponsorship", "charity", "foundation", "CSR", "scholarship", "relief fund", "permit", "license", "approval", "expedite", "official", "ministry"],
        severity: "critical",
        riskScore: 78,
        requiresAiConfirmation: "true"
      },
      {
        ruleName: "FCPA - Third-Party Success Fee",
        ruleDescription: "Risky intermediaries with opaque success fees in high-risk countries",
        detectionType: "fcpa_third_party_risk",
        violationType: "fcpa",
        keywords: ["agent", "consultant", "distributor", "intermediary", "broker", "representative", "success fee", "commission", "finder", "customs", "import", "consulting", "facilitation", "service fee"],
        severity: "critical",
        riskScore: 83,
        requiresAiConfirmation: "true"
      },
      {
        ruleName: "FCPA - Discounts to SOE",
        ruleDescription: "Price concessions to state-owned entities or regulators",
        detectionType: "fcpa_third_party_risk",
        violationType: "fcpa",
        keywords: ["discount", "rebate", "credit", "rebilling", "state-owned", "SOE", "ministry", "end of month", "quarter end", "close this week"],
        severity: "high",
        riskScore: 70,
        requiresAiConfirmation: "true"
      },
      {
        ruleName: "FCPA - Off-Book Funds",
        ruleDescription: "Special account, petty cash, off-book tracking indicating potential slush fund",
        detectionType: "fcpa_books_records",
        violationType: "fcpa",
        keywords: ["off books", "slush", "special account", "petty cash", "cash box", "undocumented"],
        severity: "critical",
        riskScore: 84,
        requiresAiConfirmation: "true"
      },
      {
        ruleName: "FCPA - Foreign Political Contributions",
        ruleDescription: "Company funds directed to foreign political parties or campaigns",
        detectionType: "fcpa_foreign_official",
        violationType: "fcpa",
        keywords: ["campaign", "party donation", "election fund", "PAC", "political contribution"],
        severity: "critical",
        riskScore: 79,
        requiresAiConfirmation: "true"
      },
      {
        ruleName: "FCPA - Expedite Customs/Permits",
        ruleDescription: "Payments to speed customs clearance, inspections, or permits",
        detectionType: "fcpa_foreign_official",
        violationType: "fcpa",
        keywords: ["expedite customs", "clear customs", "inspection fee", "stamp fee", "processing fee", "customs", "official", "cash", "envelope", "cash payment"],
        severity: "critical",
        riskScore: 86,
        requiresAiConfirmation: "true"
      },
      {
        ruleName: "FCPA - False or Vague Invoices",
        ruleDescription: "Books-and-records violations including vague descriptors and backdating",
        detectionType: "fcpa_books_records",
        violationType: "fcpa",
        keywords: ["backdate", "retroactive", "reissue", "consulting", "facilitation", "service fee", "marketing support", "retainer", "vague description"],
        severity: "high",
        riskScore: 72,
        requiresAiConfirmation: "true"
      },

      // SOX Rules
      {
        ruleName: "SOX - Pull Forward Revenue",
        ruleDescription: "Pressure to accelerate revenue recognition before quarter close",
        detectionType: "sox_revenue_recognition",
        violationType: "sox",
        keywords: ["pull forward", "bring forward", "ship-and-book", "book this quarter", "before close", "quarter end", "EoQ", "Q1", "Q2", "Q3", "Q4", "no PO", "PO later"],
        severity: "critical",
        riskScore: 82,
        requiresAiConfirmation: "true"
      },
      {
        ruleName: "SOX - Side Letter",
        ruleDescription: "Off-contract terms affecting revenue recognition including price protection and contingencies",
        detectionType: "sox_revenue_recognition",
        violationType: "sox",
        keywords: ["side letter", "price protection", "right of return", "acceptance criteria", "consignment", "revenue", "recognize", "ship", "invoice"],
        severity: "critical",
        riskScore: 85,
        requiresAiConfirmation: "true"
      },
      {
        ruleName: "SOX - Manual JE w/o Support",
        ruleDescription: "Topside/manual journal entries lacking backup documentation or approvals",
        detectionType: "sox_internal_controls",
        violationType: "sox",
        keywords: ["journal entry", "J/E", "topside", "manual entry", "reclassify", "plug", "true-up", "no backup", "no support", "approve later", "after audit"],
        severity: "critical",
        riskScore: 84,
        requiresAiConfirmation: "true"
      },
      {
        ruleName: "SOX - Split to Avoid Threshold",
        ruleDescription: "Breaking payments/invoices to bypass approval controls",
        detectionType: "sox_internal_controls",
        violationType: "sox",
        keywords: ["split the invoice", "two smaller invoices", "under the limit", "avoid approval", "bypass", "threshold"],
        severity: "high",
        riskScore: 74,
        requiresAiConfirmation: "true"
      },
      {
        ruleName: "SOX - Backdating",
        ruleDescription: "Altering effective dates to fit quarter timing or circumvent controls",
        detectionType: "sox_books_records",
        violationType: "sox",
        keywords: ["backdate", "change the date", "make effective as of", "retroactive to", "quarter end", "month end", "close"],
        severity: "critical",
        riskScore: 80,
        requiresAiConfirmation: "true"
      },
      {
        ruleName: "SOX - Log Tampering",
        ruleDescription: "Requests to delete/disable audit logs or tamper with audit trails",
        detectionType: "sox_internal_controls",
        violationType: "sox",
        keywords: ["delete logs", "purge history", "clear audit", "turn off audit", "disable logging", "ERP", "GL", "subledger", "billing", "revenue system"],
        severity: "critical",
        riskScore: 88,
        requiresAiConfirmation: "true"
      },
      {
        ruleName: "SOX - No PO / Off-Cycle",
        ruleDescription: "Purchases without PO or off-workflow to bypass 3-way match controls",
        detectionType: "sox_internal_controls",
        violationType: "sox",
        keywords: ["no PO", "PO later", "off-cycle", "rush payment", "urgent wire", "consulting", "facilitation", "service fee"],
        severity: "high",
        riskScore: 73,
        requiresAiConfirmation: "true"
      },
      {
        ruleName: "SOX - RevRec Override",
        ruleDescription: "Directives to override revenue recognition rules or defer/accelerate recognition",
        detectionType: "sox_revenue_recognition",
        violationType: "sox",
        keywords: ["override", "force book", "recognize anyway", "defer revenue", "accelerate recognition", "delivery", "acceptance", "PO", "contingency"],
        severity: "critical",
        riskScore: 81,
        requiresAiConfirmation: "true"
      },
      {
        ruleName: "SOX - Emergency Access at Close",
        ruleDescription: "Granting high-risk system access around period close (potential SOD breach)",
        detectionType: "sox_internal_controls",
        violationType: "sox",
        keywords: ["grant admin", "emergency access", "temporary admin", "elevate privileges", "GL", "ERP", "production DB", "billing", "revenue"],
        severity: "critical",
        riskScore: 80,
        requiresAiConfirmation: "true"
      },
      {
        ruleName: "SOX - Vendor Change + Urgent Pay",
        ruleDescription: "Risk of improper payments through vendor master or bank detail changes with urgent payment requests",
        detectionType: "sox_internal_controls",
        violationType: "sox",
        keywords: ["change bank details", "update account", "new vendor setup", "urgent payment", "today", "immediately", "wire transfer"],
        severity: "high",
        riskScore: 72,
        requiresAiConfirmation: "true"
      },

      // Existing rules
      {
        ruleName: "Sherman Act Section 1 - Antitrust",
        ruleDescription: "Monitor for anticompetitive agreements or market allocation",
        detectionType: "antitrust_market_allocation",
        violationType: "antitrust",
        keywords: ["market share", "divide market", "customer allocation", "price fixing", "bid rigging"],
        severity: "critical",
        riskScore: 90,
        requiresAiConfirmation: "true"
      },
      {
        ruleName: "Title VII - Workplace Harassment",
        ruleDescription: "Detect potential harassment or discriminatory communications",
        detectionType: "teaching_moment",
        violationType: "harassment",
        keywords: ["sexual", "unwelcome", "hostile environment", "protected class", "discriminatory"],
        severity: "high",
        riskScore: 80,
        requiresAiConfirmation: "true"
      },
      {
        ruleName: "Insider Trading - MNPI Sharing",
        ruleDescription: "Identify potential sharing of material non-public information",
        detectionType: "other_violation",
        violationType: "sec",
        keywords: ["confidential", "insider information", "earnings", "M&A", "acquisition", "non-public"],
        severity: "critical",
        riskScore: 95,
        requiresAiConfirmation: "true"
      }
    ]
  },

  // HR INVESTIGATIONS COMPLIANCE PACK
  {
    packName: "HR Investigations Compliance Pack",
    industrySector: "general",
    description: "Comprehensive HR compliance monitoring for employment law violations including discrimination, harassment, retaliation, wage/hour, and workplace safety under Title VII, ADA, FLSA, OSHA, and Florida employment laws",
    regulatoryBodies: [
      { name: "Equal Employment Opportunity Commission", acronym: "EEOC", jurisdiction: "federal" },
      { name: "Department of Labor", acronym: "DOL", jurisdiction: "federal" },
      { name: "Occupational Safety and Health Administration", acronym: "OSHA", jurisdiction: "federal" },
      { name: "Florida Commission on Human Relations", acronym: "FCHR", jurisdiction: "florida" },
      { name: "Florida Department of Commerce", acronym: "FDOC", jurisdiction: "florida" }
    ],
    ruleCategories: [
      "Discrimination",
      "Harassment",
      "Retaliation",
      "Wage and Hour",
      "Workplace Safety",
      "Whistleblower Protection",
      "Reasonable Accommodation",
      "FMLA Leave",
      "Workplace Violence",
      "Policy Compliance"
    ],
    isActive: "true",
    version: 1,
    detectionRules: [
      // DISCRIMINATION RULES
      {
        ruleName: "Title VII - Race/Color Discrimination",
        ruleDescription: "Detect discriminatory language or conduct based on race or color in violation of Title VII",
        detectionType: "teaching_moment",
        violationType: "discrimination",
        keywords: ["race", "color", "ethnic", "minority", "diversity", "quota", "racial"],
        regexPatterns: ["\\b(black|white|asian|hispanic|latino|african american)\\s+(people|employees|workers)\\b"],
        severity: "high",
        riskScore: 85,
        requiresAiConfirmation: "true"
      },
      {
        ruleName: "Title VII - Sex/Gender Discrimination",
        ruleDescription: "Identify potential sex or gender discrimination including pregnancy discrimination",
        detectionType: "teaching_moment",
        violationType: "discrimination",
        keywords: ["gender", "pregnant", "maternity", "female", "male", "women", "men", "motherhood penalty"],
        severity: "high",
        riskScore: 85,
        requiresAiConfirmation: "true"
      },
      {
        ruleName: "Title VII - Religious Discrimination",
        ruleDescription: "Monitor for religious discrimination or failure to accommodate religious practices",
        detectionType: "teaching_moment",
        violationType: "discrimination",
        keywords: ["religion", "religious", "faith", "prayer", "sabbath", "religious accommodation", "headscarf", "hijab"],
        severity: "high",
        riskScore: 80,
        requiresAiConfirmation: "true"
      },
      {
        ruleName: "ADEA - Age Discrimination",
        ruleDescription: "Detect age-based discrimination against employees 40 years or older",
        detectionType: "teaching_moment",
        violationType: "discrimination",
        keywords: ["too old", "young blood", "fresh perspective", "overqualified", "near retirement", "digital native", "millennials"],
        regexPatterns: ["\\b(old|older|elderly|senior|aged)\\s+(worker|employee)"],
        severity: "high",
        riskScore: 85,
        requiresAiConfirmation: "true"
      },
      {
        ruleName: "ADA - Disability Discrimination",
        ruleDescription: "Identify disability discrimination or failure to provide reasonable accommodation",
        detectionType: "teaching_moment",
        violationType: "discrimination",
        keywords: ["disability", "disabled", "handicapped", "medical condition", "reasonable accommodation", "ADA", "essential functions"],
        severity: "high",
        riskScore: 85,
        requiresAiConfirmation: "true"
      },
      {
        ruleName: "Florida §760.10 - Marital Status Discrimination",
        ruleDescription: "Detect discrimination based on marital status (unique Florida protection)",
        detectionType: "teaching_moment",
        violationType: "discrimination",
        keywords: ["married", "single", "divorced", "marital status", "spouse", "unmarried"],
        severity: "medium",
        riskScore: 70,
        requiresAiConfirmation: "true"
      },

      // HARASSMENT RULES
      {
        ruleName: "Title VII - Sexual Harassment (Quid Pro Quo)",
        ruleDescription: "Detect quid pro quo sexual harassment where employment benefits conditioned on sexual favors",
        detectionType: "teaching_moment",
        violationType: "harassment",
        keywords: ["date me", "sleep with", "sexual favor", "go out with me", "romantic relationship", "quid pro quo"],
        severity: "critical",
        riskScore: 95,
        requiresAiConfirmation: "true"
      },
      {
        ruleName: "Title VII - Hostile Work Environment",
        ruleDescription: "Identify severe or pervasive unwelcome conduct creating hostile work environment",
        detectionType: "teaching_moment",
        violationType: "harassment",
        keywords: ["unwelcome", "hostile", "offensive", "inappropriate touching", "sexual comment", "harassing", "intimidating"],
        severity: "high",
        riskScore: 85,
        requiresAiConfirmation: "true"
      },
      {
        ruleName: "Harassment - Racial/Ethnic Slurs",
        ruleDescription: "Detect racial or ethnic harassment creating hostile environment",
        detectionType: "teaching_moment",
        violationType: "harassment",
        keywords: ["racial slur", "ethnic joke", "racist comment", "offensive stereotype"],
        severity: "critical",
        riskScore: 90,
        requiresAiConfirmation: "true"
      },
      {
        ruleName: "Harassment - Age-Related",
        ruleDescription: "Monitor for age-based harassment or hostile environment for older workers",
        detectionType: "teaching_moment",
        violationType: "harassment",
        keywords: ["old timer", "dinosaur", "past your prime", "can't teach old dog", "boomer"],
        severity: "high",
        riskScore: 80,
        requiresAiConfirmation: "true"
      },

      // RETALIATION RULES
      {
        ruleName: "Title VII - Discrimination Complaint Retaliation",
        ruleDescription: "Detect retaliation against employee who complained about discrimination",
        detectionType: "teaching_moment",
        violationType: "retaliation",
        keywords: ["complained", "HR complaint", "EEOC", "discrimination charge", "troublemaker", "filed complaint"],
        severity: "critical",
        riskScore: 95,
        requiresAiConfirmation: "true"
      },
      {
        ruleName: "SOX §806 - Whistleblower Retaliation",
        ruleDescription: "Identify retaliation against employee who reported fraud or securities violations",
        detectionType: "teaching_moment",
        violationType: "retaliation",
        keywords: ["whistleblower", "reported fraud", "SEC complaint", "Dodd-Frank", "hotline call"],
        severity: "critical",
        riskScore: 95,
        requiresAiConfirmation: "true"
      },
      {
        ruleName: "OSHA - Safety Complaint Retaliation",
        ruleDescription: "Monitor for retaliation against employees reporting workplace safety hazards",
        detectionType: "teaching_moment",
        violationType: "retaliation",
        keywords: ["OSHA complaint", "safety concern", "reported hazard", "unsafe conditions"],
        severity: "high",
        riskScore: 90,
        requiresAiConfirmation: "true"
      },
      {
        ruleName: "Florida §448.102 - State Whistleblower Retaliation",
        ruleDescription: "Detect retaliation under Florida Private Whistleblower Act",
        detectionType: "teaching_moment",
        violationType: "retaliation",
        keywords: ["reported violation", "disclosed to agency", "Florida whistleblower", "law violation report"],
        severity: "high",
        riskScore: 90,
        requiresAiConfirmation: "true"
      },

      // WAGE AND HOUR RULES
      {
        ruleName: "FLSA - Off-the-Clock Work",
        ruleDescription: "Detect directives to work off-the-clock or without compensation",
        detectionType: "other_violation",
        violationType: "wage_hour",
        keywords: ["off the clock", "before clocking in", "after clock out", "don't record time", "comp time instead"],
        severity: "high",
        riskScore: 85,
        requiresAiConfirmation: "true"
      },
      {
        ruleName: "FLSA - Overtime Misclassification",
        ruleDescription: "Identify improper exempt classification to avoid overtime payments",
        detectionType: "other_violation",
        violationType: "wage_hour",
        keywords: ["reclassify as exempt", "no overtime", "salaried employee", "exempt status", "duties test"],
        severity: "high",
        riskScore: 85,
        requiresAiConfirmation: "true"
      },
      {
        ruleName: "FLSA - Minimum Wage Violations",
        ruleDescription: "Monitor for payments below federal or Florida minimum wage",
        detectionType: "other_violation",
        violationType: "wage_hour",
        keywords: ["below minimum", "wage reduction", "unpaid training", "deduction reducing wage"],
        regexPatterns: ["\\$[0-9]\\.[0-9]{2}\\s+per\\s+hour", "\\$1[0-2]\\.[0-9]{2}\\s*\\/\\s*hr"],
        severity: "critical",
        riskScore: 90,
        requiresAiConfirmation: "true"
      },
      {
        ruleName: "FLSA - Meal Break Violations",
        ruleDescription: "Detect working through unpaid meal breaks without compensation",
        detectionType: "other_violation",
        violationType: "wage_hour",
        keywords: ["work through lunch", "skip break", "eat at desk", "no meal break", "lunch meeting unpaid"],
        severity: "medium",
        riskScore: 70,
        requiresAiConfirmation: "true"
      },

      // HEALTH AND SAFETY RULES
      {
        ruleName: "OSHA - General Duty Clause Violations",
        ruleDescription: "Identify recognized workplace hazards causing serious harm or death",
        detectionType: "other_violation",
        violationType: "health_safety",
        keywords: ["unsafe", "hazard", "dangerous condition", "safety violation", "OSHA", "injury risk"],
        severity: "critical",
        riskScore: 90,
        requiresAiConfirmation: "true"
      },
      {
        ruleName: "OSHA - Retaliation for Safety Complaints",
        ruleDescription: "Detect retaliation against employees reporting safety concerns",
        detectionType: "teaching_moment",
        violationType: "health_safety",
        keywords: ["safety complaint", "OSHA report", "unsafe work", "refuse dangerous work"],
        severity: "critical",
        riskScore: 95,
        requiresAiConfirmation: "true"
      },
      {
        ruleName: "Workplace Violence Prevention",
        ruleDescription: "Monitor for threats, intimidation, or violence indicators",
        detectionType: "other_violation",
        violationType: "health_safety",
        keywords: ["threaten", "going to hurt", "watch your back", "bring a gun", "physical altercation", "assault"],
        severity: "critical",
        riskScore: 98,
        requiresAiConfirmation: "false"
      },

      // WORKPLACE BULLYING RULES
      {
        ruleName: "Workplace Bullying - Intimidation",
        ruleDescription: "Detect bullying, intimidation, or abusive conduct not covered by discrimination laws",
        detectionType: "teaching_moment",
        violationType: "workplace_bullying",
        keywords: ["bully", "intimidate", "humiliate", "belittle", "demean", "public criticism", "yelling"],
        severity: "medium",
        riskScore: 65,
        requiresAiConfirmation: "true"
      },

      // THEFT AND FRAUD RULES
      {
        ruleName: "Employee Theft - Company Property",
        ruleDescription: "Identify theft or misappropriation of company property or funds",
        detectionType: "other_violation",
        violationType: "theft_fraud",
        keywords: ["stealing", "took without permission", "unauthorized", "missing inventory", "embezzle"],
        severity: "high",
        riskScore: 85,
        requiresAiConfirmation: "true"
      },
      {
        ruleName: "Expense Fraud",
        ruleDescription: "Detect fraudulent expense reports or reimbursement claims",
        detectionType: "other_violation",
        violationType: "theft_fraud",
        keywords: ["fake receipt", "inflated expense", "personal expense", "duplicate claim", "expense fraud"],
        severity: "high",
        riskScore: 80,
        requiresAiConfirmation: "true"
      },
      {
        ruleName: "Time Theft",
        ruleDescription: "Monitor for time clock fraud or buddy punching",
        detectionType: "other_violation",
        violationType: "theft_fraud",
        keywords: ["clock in for me", "buddy punch", "fake timecard", "time theft", "inflated hours"],
        severity: "medium",
        riskScore: 70,
        requiresAiConfirmation: "true"
      },

      // POLICY VIOLATION RULES
      {
        ruleName: "Code of Conduct Violations",
        ruleDescription: "Detect violations of company code of conduct or ethics policies",
        detectionType: "teaching_moment",
        violationType: "policy_violation",
        keywords: ["against policy", "code of conduct", "ethics violation", "conflict of interest", "unauthorized"],
        severity: "medium",
        riskScore: 60,
        requiresAiConfirmation: "true"
      },
      {
        ruleName: "Confidentiality Breaches",
        ruleDescription: "Identify unauthorized disclosure of confidential or proprietary information",
        detectionType: "other_violation",
        violationType: "policy_violation",
        keywords: ["confidential", "proprietary", "trade secret", "NDA", "unauthorized disclosure", "leak"],
        severity: "high",
        riskScore: 80,
        requiresAiConfirmation: "true"
      },

      // WHISTLEBLOWER PROTECTION RULES
      {
        ruleName: "Dodd-Frank Whistleblower Protection",
        ruleDescription: "Monitor for retaliation against Dodd-Frank whistleblowers",
        detectionType: "teaching_moment",
        violationType: "whistleblower",
        keywords: ["Dodd-Frank", "SEC whistleblower", "reported to SEC", "securities violation report"],
        severity: "critical",
        riskScore: 95,
        requiresAiConfirmation: "true"
      },

      // REASONABLE ACCOMMODATION RULES
      {
        ruleName: "ADA - Failure to Accommodate Disability",
        ruleDescription: "Detect refusal or failure to provide reasonable accommodation for disability",
        detectionType: "teaching_moment",
        violationType: "accommodation",
        keywords: ["accommodation request", "disability", "ADA accommodation", "interactive process", "undue hardship"],
        severity: "high",
        riskScore: 85,
        requiresAiConfirmation: "true"
      },
      {
        ruleName: "Religious Accommodation Denial",
        ruleDescription: "Identify failure to accommodate sincerely held religious beliefs",
        detectionType: "teaching_moment",
        violationType: "accommodation",
        keywords: ["religious accommodation", "sabbath", "prayer time", "religious observance", "faith practice"],
        severity: "high",
        riskScore: 80,
        requiresAiConfirmation: "true"
      },
      {
        ruleName: "FMLA - Leave Denial or Interference",
        ruleDescription: "Detect improper denial of FMLA leave or interference with FMLA rights",
        detectionType: "teaching_moment",
        violationType: "accommodation",
        keywords: ["FMLA", "family leave", "medical leave", "serious health condition", "maternity leave", "deny leave request"],
        severity: "high",
        riskScore: 85,
        requiresAiConfirmation: "true"
      },
      {
        ruleName: "Pregnancy Accommodation",
        ruleDescription: "Monitor for failure to accommodate pregnancy-related limitations",
        detectionType: "teaching_moment",
        violationType: "accommodation",
        keywords: ["pregnant", "pregnancy accommodation", "light duty", "lifting restriction", "prenatal appointments"],
        severity: "high",
        riskScore: 85,
        requiresAiConfirmation: "true"
      }
    ]
  }
];
