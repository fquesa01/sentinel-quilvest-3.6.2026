/**
 * Sector-Specific Compliance Workflow Templates & Investigation Playbooks
 * Pre-configured workflows for common compliance scenarios by industry sector
 */

export const complianceWorkflowTemplates = [
  // 1. Broker-Dealer FINRA Investigation Workflow
  {
    industrySector: "broker_dealer",
    workflowName: "FINRA Rule 3110 - Communications Supervision Workflow",
    description: "Standard workflow for investigating potential FINRA Rule 3110 violations in broker-dealer communications",
    violationType: "finra",
    triggerConditions: {
      alertTypes: ["communication_review", "finra"],
      minRiskScore: 60,
      keywords: ["investment recommendation", "suitability", "buy", "sell"]
    },
    steps: [
      {
        stepNumber: 1,
        stepName: "Initial Triage",
        assignedRole: "compliance_officer",
        estimatedDuration: 15,
        requiredActions: [
          "Review flagged communication",
          "Identify registered representative involved",
          "Determine if customer communication or internal",
          "Assess immediate risk level"
        ],
        decisionPoints: [
          {
            decision: "Requires supervisory review?",
            yesAction: "Proceed to Step 2",
            noAction: "Close as false positive with documentation"
          }
        ]
      },
      {
        stepNumber: 2,
        stepName: "Supervisory Review",
        assignedRole: "compliance_officer",
        estimatedDuration: 30,
        requiredActions: [
          "Pull complete communication thread",
          "Review rep's CRD record and disciplinary history",
          "Check customer account profile for suitability",
          "Identify if recommendation was made",
          "Document supervision approval or exceptions"
        ],
        decisionPoints: [
          {
            decision: "Potential violation identified?",
            yesAction: "Escalate to formal investigation (Step 3)",
            noAction: "Approve with supervisory sign-off, close case"
          }
        ]
      },
      {
        stepNumber: 3,
        stepName: "Formal Investigation",
        assignedRole: "attorney",
        estimatedDuration: 120,
        requiredActions: [
          "Issue legal hold on all related communications",
          "Interview registered representative",
          "Interview branch supervisor",
          "Review customer account history and profile",
          "Analyze suitability factors",
          "Determine if FINRA rules violated"
        ],
        decisionPoints: [
          {
            decision: "Rule violation confirmed?",
            yesAction: "Proceed to remediation (Step 4)",
            noAction: "Close with findings memo"
          }
        ]
      },
      {
        stepNumber: 4,
        stepName: "Remediation & Reporting",
        assignedRole: "compliance_officer",
        estimatedDuration: 60,
        requiredActions: [
          "Document violation in compliance log",
          "Determine if self-reporting to FINRA required",
          "Implement corrective action (training, discipline)",
          "Customer remediation if applicable",
          "Update supervision procedures if systemic",
          "File FINRA Rule 4530 report if required"
        ],
        outputs: [
          "FINRA self-report (if applicable)",
          "Customer remediation letter",
          "Updated supervision procedures",
          "Rep training certification"
        ]
      }
    ],
    estimatedTotalDuration: 225,
    regulatoryDeadlines: [
      { regulation: "FINRA Rule 4530", description: "Report to FINRA within 30 days if reportable", daysAllowed: 30 }
    ]
  },

  // 2. Pharmaceutical Off-Label Promotion Investigation
  {
    industrySector: "pharmaceutical",
    workflowName: "FDA Off-Label Promotion Investigation",
    description: "Investigation workflow for potential FDCA off-label marketing violations",
    violationType: "off_label_promotion",
    triggerConditions: {
      alertTypes: ["off_label_promotion", "fda"],
      minRiskScore: 75,
      keywords: ["off-label", "unapproved use", "not indicated"]
    },
    steps: [
      {
        stepNumber: 1,
        stepName: "Immediate Risk Assessment",
        assignedRole: "compliance_officer",
        estimatedDuration: 30,
        requiredActions: [
          "Review communication for off-label claims",
          "Identify product and approved indication",
          "Determine if HCP or consumer communication",
          "Assess scope of potential exposure",
          "Implement immediate corrective action if ongoing"
        ],
        decisionPoints: [
          {
            decision: "Clear off-label promotion identified?",
            yesAction: "Escalate to legal (Step 2)",
            noAction: "Document review, close"
          }
        ]
      },
      {
        stepNumber: 2,
        stepName: "Legal Hold & Evidence Preservation",
        assignedRole: "attorney",
        estimatedDuration: 45,
        requiredActions: [
          "Issue litigation hold on all related materials",
          "Preserve promotional materials",
          "Identify all employees involved",
          "Determine geographic and temporal scope",
          "Engage outside FDA counsel if needed"
        ],
        decisionPoints: [
          {
            decision: "Potential material violation?",
            yesAction: "Proceed to formal investigation (Step 3)",
            noAction: "Monitor with heightened supervision"
          }
        ]
      },
      {
        stepNumber: 3,
        stepName: "Investigation & Root Cause Analysis",
        assignedRole: "attorney",
        estimatedDuration: 240,
        requiredActions: [
          "Interview sales reps and managers",
          "Review training records and certifications",
          "Analyze promotional review committee records",
          "Review physician speaker program content",
          "Determine if systemic or isolated",
          "Assess intent vs. inadvertent",
          "Draft investigation findings memo"
        ],
        decisionPoints: [
          {
            decision: "Systemic violation confirmed?",
            yesAction: "Proceed to self-disclosure (Step 4)",
            noAction: "Implement corrective action, monitor"
          }
        ]
      },
      {
        stepNumber: 4,
        stepName: "Remediation & Potential Self-Disclosure",
        assignedRole: "attorney",
        estimatedDuration: 180,
        requiredActions: [
          "Assess pros/cons of voluntary FDA disclosure",
          "Cease all off-label promotional activities",
          "Implement corrective action plan",
          "Retrain entire sales force",
          "Update promotional review procedures",
          "Consider voluntary disclosure to FDA/DOJ",
          "Engage FDA to negotiate resolution if appropriate"
        ],
        outputs: [
          "FDA voluntary disclosure letter (if applicable)",
          "Corrective action plan",
          "Revised promotional review SOPs",
          "Sales force retraining certification"
        ]
      }
    ],
    estimatedTotalDuration: 495,
    regulatoryDeadlines: [
      { regulation: "FDA Warning Letter Response", description: "Respond to FDA within 15 business days if warning letter issued", daysAllowed: 15 }
    ]
  },

  // 3. Defense Contractor ITAR Export Control Violation
  {
    industrySector: "defense_contractor",
    workflowName: "ITAR Export Control Investigation",
    description: "Investigation of potential ITAR violations for unauthorized export of defense articles",
    violationType: "export_control",
    triggerConditions: {
      alertTypes: ["fcpa_red_flags", "export_control"],
      minRiskScore: 90,
      keywords: ["technical data", "export", "foreign national", "deemed export"]
    },
    steps: [
      {
        stepNumber: 1,
        stepName: "Immediate Containment",
        assignedRole: "compliance_officer",
        estimatedDuration: 60,
        requiredActions: [
          "Immediately stop ongoing transfer if active",
          "Secure all technical data and defense articles",
          "Identify foreign persons with access",
          "Determine USML category of items",
          "Assess if deemed export occurred",
          "Notify empowered official"
        ],
        decisionPoints: [
          {
            decision: "Unauthorized export confirmed?",
            yesAction: "Escalate to legal immediately (Step 2)",
            noAction: "Document review, enhance controls"
          }
        ]
      },
      {
        stepNumber: 2,
        stepName: "Legal Assessment & Preliminary Review",
        assignedRole: "attorney",
        estimatedDuration: 120,
        requiredActions: [
          "Engage outside ITAR/export control counsel",
          "Preserve all evidence of export",
          "Identify all parties involved",
          "Determine destination country",
          "Assess TAA/license requirements",
          "Preliminary assessment of violation severity",
          "Consider immediate voluntary self-disclosure to DDTC"
        ],
        decisionPoints: [
          {
            decision: "Material ITAR violation?",
            yesAction: "Proceed to full investigation (Step 3)",
            noAction: "Enhanced monitoring and training"
          }
        ]
      },
      {
        stepNumber: 3,
        stepName: "Comprehensive Investigation",
        assignedRole: "attorney",
        estimatedDuration: 300,
        requiredActions: [
          "Interview all employees involved",
          "Review export control training records",
          "Analyze jurisdiction determination process",
          "Review USML classification",
          "Determine if willful vs. negligent",
          "Assess national security harm",
          "Quantify scope of unauthorized exports",
          "Draft detailed findings report"
        ],
        decisionPoints: [
          {
            decision: "Self-disclose to DDTC?",
            yesAction: "Proceed to voluntary disclosure (Step 4)",
            noAction: "Remediate and monitor (less common)"
          }
        ]
      },
      {
        stepNumber: 4,
        stepName: "Voluntary Self-Disclosure & Remediation",
        assignedRole: "attorney",
        estimatedDuration: 240,
        requiredActions: [
          "Prepare DDTC voluntary disclosure submission",
          "Implement corrective action plan",
          "Enhance export control compliance program",
          "Retrain workforce on ITAR requirements",
          "Engage with DDTC on settlement",
          "Consider parallel DOJ/DOD notifications",
          "Negotiate civil penalty resolution"
        ],
        outputs: [
          "DDTC Voluntary Disclosure",
          "Corrective Action Plan",
          "Enhanced Export Control Procedures",
          "Settlement Agreement (if applicable)"
        ]
      }
    ],
    estimatedTotalDuration: 720,
    regulatoryDeadlines: [
      { regulation: "ITAR Voluntary Disclosure", description: "Submit voluntary disclosure as soon as possible after discovering violation to maximize mitigation credit", daysAllowed: 30 }
    ]
  },

  // 4. Financial Services AML/BSA Structuring Investigation
  {
    industrySector: "financial_services",
    workflowName: "AML Structuring Investigation Workflow",
    description: "Investigation of potential currency transaction structuring to evade CTR reporting",
    violationType: "banking",
    triggerConditions: {
      alertTypes: ["aml_structuring", "banking"],
      minRiskScore: 80,
      keywords: ["split transaction", "multiple deposits", "avoid reporting"]
    },
    steps: [
      {
        stepNumber: 1,
        stepName: "Transaction Pattern Analysis",
        assignedRole: "compliance_officer",
        estimatedDuration: 45,
        requiredActions: [
          "Pull 90-day transaction history for customer",
          "Identify all cash transactions",
          "Map transaction amounts, dates, locations",
          "Identify structured transaction patterns",
          "Calculate cumulative amounts",
          "Review customer profile and expected activity"
        ],
        decisionPoints: [
          {
            decision: "Structuring pattern identified?",
            yesAction: "Escalate for SAR review (Step 2)",
            noAction: "Document analysis, continue monitoring"
          }
        ]
      },
      {
        stepNumber: 2,
        stepName: "SAR Determination & Filing",
        assignedRole: "compliance_officer",
        estimatedDuration: 120,
        requiredActions: [
          "Conduct enhanced due diligence on customer",
          "Review source of funds documentation",
          "Interview relationship manager if applicable",
          "Determine if SAR filing required",
          "Draft SAR narrative if required",
          "Identify suspicious activity amount",
          "File SAR within regulatory deadline"
        ],
        decisionPoints: [
          {
            decision: "SAR filed?",
            yesAction: "Proceed to ongoing monitoring (Step 3)",
            noAction: "Enhanced monitoring without SAR"
          }
        ]
      },
      {
        stepNumber: 3,
        stepName: "Account Action & Ongoing Monitoring",
        assignedRole: "compliance_officer",
        estimatedDuration: 60,
        requiredActions: [
          "Determine if account closure warranted",
          "Implement enhanced monitoring alerts",
          "Update customer risk rating",
          "Brief senior management if material",
          "Coordinate with law enforcement if contacted",
          "Document actions in case management system"
        ],
        outputs: [
          "SAR filing (FinCEN Form 111)",
          "Enhanced monitoring profile",
          "Account action documentation",
          "Senior management briefing"
        ]
      }
    ],
    estimatedTotalDuration: 225,
    regulatoryDeadlines: [
      { regulation: "SAR Filing", description: "File SAR within 30 days of initial detection", daysAllowed: 30 }
    ]
  },

  // 5. Technology Sector Antitrust Investigation
  {
    industrySector: "technology",
    workflowName: "Sherman Act Antitrust Investigation",
    description: "Investigation of potential price-fixing or market allocation agreements",
    violationType: "antitrust",
    triggerConditions: {
      alertTypes: ["antitrust_coordination", "antitrust"],
      minRiskScore: 85,
      keywords: ["pricing strategy", "market share", "competitor coordination"]
    },
    steps: [
      {
        stepNumber: 1,
        stepName: "Immediate Assessment & Containment",
        assignedRole: "attorney",
        estimatedDuration: 60,
        requiredActions: [
          "Review flagged communications immediately",
          "Identify all participants in communication",
          "Determine if agreement or concerted action evident",
          "Cease any ongoing coordination activities",
          "Issue litigation hold on related materials",
          "Assess if criminal antitrust violation"
        ],
        decisionPoints: [
          {
            decision: "Potential per se violation (hard-core cartel)?",
            yesAction: "Engage antitrust counsel immediately, consider DOJ leniency (Step 2)",
            noAction: "Proceed to civil violation assessment"
          }
        ]
      },
      {
        stepNumber: 2,
        stepName: "DOJ Leniency Evaluation",
        assignedRole: "attorney",
        estimatedDuration: 240,
        requiredActions: [
          "Engage experienced antitrust defense counsel",
          "Assess eligibility for DOJ leniency program",
          "Determine if first to report",
          "Evaluate cooperation requirements",
          "Assess civil liability exposure",
          "Make rapid decision on leniency application",
          "Prepare leniency submission if proceeding"
        ],
        decisionPoints: [
          {
            decision: "Apply for DOJ leniency?",
            yesAction: "Submit leniency application, full cooperation (Step 3)",
            noAction: "Proceed with internal investigation and remediation"
          }
        ]
      },
      {
        stepNumber: 3,
        stepName: "Cooperation & Investigation",
        assignedRole: "attorney",
        estimatedDuration: 480,
        requiredActions: [
          "Full cooperation with DOJ investigation",
          "Produce all responsive documents",
          "Make employees available for interviews",
          "Conduct internal investigation",
          "Identify scope of anticompetitive conduct",
          "Assess damages to customers/competitors",
          "Implement antitrust compliance program enhancements"
        ],
        outputs: [
          "DOJ cooperation proffer",
          "Document production",
          "Employee interview summaries",
          "Enhanced antitrust compliance program"
        ]
      },
      {
        stepNumber: 4,
        stepName: "Resolution & Remediation",
        assignedRole: "attorney",
        estimatedDuration: 360,
        requiredActions: [
          "Negotiate conditional leniency agreement",
          "Cease all anticompetitive conduct",
          "Implement DOJ-approved compliance program",
          "Provide ongoing cooperation",
          "Address private civil litigation",
          "Board-level compliance governance",
          "Periodic antitrust audits"
        ],
        outputs: [
          "Conditional Leniency Letter",
          "Corporate Antitrust Compliance Program",
          "Civil settlement agreements",
          "Compliance monitoring reports"
        ]
      }
    ],
    estimatedTotalDuration: 1140,
    regulatoryDeadlines: [
      { regulation: "DOJ Leniency Application", description: "Must be first to report; timing critical for leniency eligibility", daysAllowed: 7 }
    ]
  },

  // 6. General FCPA Investigation Workflow
  {
    industrySector: "general",
    workflowName: "FCPA Bribery Investigation",
    description: "Investigation of potential Foreign Corrupt Practices Act violations",
    violationType: "fcpa",
    triggerConditions: {
      alertTypes: ["fcpa_red_flags", "fcpa"],
      minRiskScore: 85,
      keywords: ["foreign official", "facilitate", "expedite", "payment"]
    },
    steps: [
      {
        stepNumber: 1,
        stepName: "Preliminary Assessment",
        assignedRole: "compliance_officer",
        estimatedDuration: 60,
        requiredActions: [
          "Review flagged communication",
          "Identify foreign official or entity involved",
          "Determine jurisdiction and risk level",
          "Assess if payment made or contemplated",
          "Identify business purpose/benefit sought",
          "Escalate to legal immediately"
        ],
        decisionPoints: [
          {
            decision: "Credible FCPA risk identified?",
            yesAction: "Escalate to legal for investigation (Step 2)",
            noAction: "Enhanced monitoring, close"
          }
        ]
      },
      {
        stepNumber: 2,
        stepName: "Legal Investigation & Evidence Gathering",
        assignedRole: "attorney",
        estimatedDuration: 360,
        requiredActions: [
          "Engage experienced FCPA counsel",
          "Issue litigation hold",
          "Interview employees involved",
          "Review third-party due diligence",
          "Analyze payment flows and beneficiaries",
          "Determine if books and records violation",
          "Assess if accurate recording occurred",
          "Evaluate internal controls failures"
        ],
        decisionPoints: [
          {
            decision: "FCPA violation confirmed?",
            yesAction: "Proceed to voluntary disclosure evaluation (Step 3)",
            noAction: "Remediate controls, close"
          }
        ]
      },
      {
        stepNumber: 3,
        stepName: "Voluntary Disclosure Decision",
        assignedRole: "attorney",
        estimatedDuration: 120,
        requiredActions: [
          "Assess DOJ FCPA Corporate Enforcement Policy applicability",
          "Evaluate SEC voluntary disclosure benefits",
          "Determine if declination/mitigation credit available",
          "Consider cooperation requirements",
          "Assess disgorgement and penalty exposure",
          "Make strategic decision on disclosure"
        ],
        decisionPoints: [
          {
            decision: "Voluntarily disclose to DOJ/SEC?",
            yesAction: "Proceed to disclosure and cooperation (Step 4)",
            noAction: "Remediate internally, monitor (higher risk)"
          }
        ]
      },
      {
        stepNumber: 4,
        stepName: "Disclosure, Cooperation & Resolution",
        assignedRole: "attorney",
        estimatedDuration: 720,
        requiredActions: [
          "Submit voluntary disclosure to DOJ/SEC",
          "Provide full cooperation",
          "Conduct comprehensive remediation",
          "Terminate implicated third parties",
          "Enhance FCPA compliance program",
          "Implement independent compliance monitor if required",
          "Negotiate resolution (DPA/NPA/declination)",
          "Disgorge ill-gotten gains"
        ],
        outputs: [
          "DOJ/SEC Voluntary Disclosure",
          "Comprehensive remediation plan",
          "Enhanced FCPA compliance program",
          "Settlement agreement (DPA/NPA)",
          "Compliance monitor reports"
        ]
      }
    ],
    estimatedTotalDuration: 1260,
    regulatoryDeadlines: [
      { regulation: "DOJ Voluntary Disclosure", description: "Disclose within reasonable time of discovery to maximize mitigation credit", daysAllowed: 60 }
    ]
  },

  // HR INVESTIGATION WORKFLOWS
  {
    industrySector: "general",
    workflowName: "Harassment Investigation - 13-Step Comprehensive Procedure",
    description: "Comprehensive 13-step workflow for investigating workplace harassment complaints under Title VII and state law",
    violationType: "harassment",
    triggerConditions: {
      alertTypes: ["harassment", "hostile_environment"],
      minRiskScore: 70,
      keywords: ["harassment", "hostile", "inappropriate", "unwanted", "offensive"]
    },
    steps: [
      {
        stepNumber: 1,
        stepName: "Complaint Receipt and Documentation",
        assignedRole: "compliance_officer",
        estimatedDuration: 30,
        requiredActions: [
          "Document complaint details (who, what, when, where, how)",
          "Identify complainant, accused, and any witnesses",
          "Record dates, times, locations of alleged incidents",
          "Preserve all evidence (emails, texts, documents)",
          "Provide complainant with anti-retaliation notice",
          "Explain investigation process and timeline"
        ],
        decisionPoints: [
          {
            decision: "Does complaint allege protected class harassment?",
            yesAction: "Proceed to Step 2 - Assessment",
            noAction: "Route to appropriate HR process (bullying, policy violation)"
          }
        ]
      },
      {
        stepNumber: 2,
        stepName: "Initial Assessment and Risk Evaluation",
        assignedRole: "compliance_officer",
        estimatedDuration: 45,
        requiredActions: [
          "Assess severity and credibility of allegations",
          "Determine if immediate interim measures needed",
          "Identify potential legal exposure (Title VII, state law)",
          "Assess risk of continued contact between parties",
          "Document decision on interim measures",
          "Select investigation team (internal vs. external)"
        ],
        decisionPoints: [
          {
            decision: "Are interim protective measures required?",
            yesAction: "Implement separation (Step 3), then investigate",
            noAction: "Proceed directly to investigation planning (Step 4)"
          }
        ]
      },
      {
        stepNumber: 3,
        stepName: "Interim Protective Measures",
        assignedRole: "compliance_officer",
        estimatedDuration: 15,
        requiredActions: [
          "Implement no-contact directive between parties",
          "Consider schedule changes or reassignment (avoid burdening complainant)",
          "Place accused on paid administrative leave if high risk",
          "Document all interim measures taken",
          "Communicate measures to affected parties",
          "Ensure no retaliation during investigation"
        ],
        outputs: [
          "Written no-contact directive",
          "Schedule modification documentation",
          "Administrative leave notice (if applicable)"
        ]
      },
      {
        stepNumber: 4,
        stepName: "Investigation Planning",
        assignedRole: "attorney",
        estimatedDuration: 60,
        requiredActions: [
          "Develop investigation plan and timeline",
          "Identify all witnesses to be interviewed",
          "Determine evidence to be collected",
          "Prepare interview questions",
          "Assign investigator (neutral, trained)",
          "Set confidentiality protocols"
        ],
        outputs: [
          "Written investigation plan",
          "Witness list",
          "Interview question sets"
        ]
      },
      {
        stepNumber: 5,
        stepName: "Complainant Interview",
        assignedRole: "attorney",
        estimatedDuration: 120,
        requiredActions: [
          "Conduct detailed interview with complainant",
          "Obtain specific details (dates, times, locations, exact conduct)",
          "Identify all witnesses and corroborating evidence",
          "Document complainant's emotional state and impact",
          "Ask about prior complaints or incidents",
          "Explain next steps and anti-retaliation protections"
        ],
        outputs: [
          "Detailed interview notes or transcript",
          "Updated witness list",
          "Evidence preservation list"
        ]
      },
      {
        stepNumber: 6,
        stepName: "Accused Interview",
        assignedRole: "attorney",
        estimatedDuration: 120,
        requiredActions: [
          "Interview accused about specific allegations",
          "Allow full opportunity to respond and provide their account",
          "Obtain accused's version of events",
          "Identify accused's witnesses and evidence",
          "Document any admissions or inconsistencies",
          "Explain seriousness and investigation process"
        ],
        outputs: [
          "Detailed interview notes or transcript",
          "Accused's witness list",
          "Accused's evidence submissions"
        ]
      },
      {
        stepNumber: 7,
        stepName: "Witness Interviews",
        assignedRole: "attorney",
        estimatedDuration: 180,
        requiredActions: [
          "Interview all identified witnesses separately",
          "Ask about specific incidents and observations",
          "Obtain corroborating or contradicting evidence",
          "Document demeanor and credibility indicators",
          "Ask about workplace culture and patterns",
          "Ensure witness confidentiality and anti-retaliation"
        ],
        outputs: [
          "Individual witness interview summaries",
          "Credibility assessments",
          "Corroboration matrix"
        ]
      },
      {
        stepNumber: 8,
        stepName: "Evidence Collection and Review",
        assignedRole: "attorney",
        estimatedDuration: 120,
        requiredActions: [
          "Collect all relevant documents (emails, texts, photos)",
          "Review personnel files for both parties",
          "Check for prior complaints or disciplinary history",
          "Analyze communication patterns and frequency",
          "Review relevant policies and training records",
          "Document all evidence collected"
        ],
        outputs: [
          "Evidence index",
          "Chronological incident timeline",
          "Communication analysis"
        ]
      },
      {
        stepNumber: 9,
        stepName: "Follow-Up Interviews (if needed)",
        assignedRole: "attorney",
        estimatedDuration: 90,
        requiredActions: [
          "Conduct follow-up interviews to clarify inconsistencies",
          "Present new evidence to parties for response",
          "Address gaps or contradictions in testimony",
          "Give both parties opportunity to respond to other's account",
          "Document all follow-up findings"
        ],
        decisionPoints: [
          {
            decision: "Are follow-up interviews necessary?",
            yesAction: "Conduct follow-ups and document",
            noAction: "Proceed to credibility assessment (Step 10)"
          }
        ]
      },
      {
        stepNumber: 10,
        stepName: "Credibility Assessment and Findings",
        assignedRole: "attorney",
        estimatedDuration: 180,
        requiredActions: [
          "Assess credibility of complainant, accused, and witnesses",
          "Evaluate corroborating and contradicting evidence",
          "Consider inherent plausibility of each account",
          "Analyze demeanor, consistency, and motive to lie",
          "Determine whether harassment occurred by preponderance of evidence",
          "Document detailed findings with supporting evidence"
        ],
        outputs: [
          "Credibility analysis",
          "Factual findings report",
          "Preponderance of evidence determination"
        ]
      },
      {
        stepNumber: 11,
        stepName: "Legal Analysis and Conclusions",
        assignedRole: "attorney",
        estimatedDuration: 120,
        requiredActions: [
          "Apply legal standards (severe or pervasive harassment test)",
          "Determine if conduct constitutes unlawful harassment",
          "Assess employer liability (supervisor vs. co-worker)",
          "Evaluate affirmative defense availability",
          "Identify policy violations even if not illegal harassment",
          "Document legal conclusions and recommendations"
        ],
        outputs: [
          "Legal analysis memorandum",
          "Violation determination",
          "Corrective action recommendations"
        ]
      },
      {
        stepNumber: 12,
        stepName: "Corrective Action and Discipline",
        assignedRole: "compliance_officer",
        estimatedDuration: 90,
        requiredActions: [
          "Determine appropriate disciplinary action if harassment found",
          "Implement discipline proportionate to severity (counseling to termination)",
          "Enhance training for department or organization-wide",
          "Update policies and reporting procedures as needed",
          "Communicate outcomes to complainant and accused (as appropriate)",
          "Document all corrective actions taken"
        ],
        decisionPoints: [
          {
            decision: "Was harassment substantiated?",
            yesAction: "Implement discipline and remediation",
            noAction: "Close investigation, document unsubstantiated finding"
          }
        ],
        outputs: [
          "Disciplinary action memo",
          "Training plan",
          "Policy updates",
          "Outcome letters"
        ]
      },
      {
        stepNumber: 13,
        stepName: "Follow-Up Monitoring and Closure",
        assignedRole: "compliance_officer",
        estimatedDuration: 60,
        requiredActions: [
          "Monitor workplace for retaliation or recurrence",
          "Conduct follow-up meetings with complainant (30/60/90 days)",
          "Verify corrective actions implemented effectively",
          "Document no retaliation occurred",
          "Update investigation file with final closure memo",
          "Retain all investigation records per retention schedule"
        ],
        outputs: [
          "Follow-up monitoring reports",
          "Final closure memorandum",
          "Record retention log"
        ]
      }
    ],
    estimatedTotalDuration: 1290,
    regulatoryDeadlines: [
      { regulation: "EEOC Charge Filing", description: "Employee has 180 days (300 in deferral states) to file EEOC charge", daysAllowed: 180 },
      { regulation: "Florida FCHR Filing", description: "Employee has 365 days to file with Florida Commission on Human Relations", daysAllowed: 365 }
    ]
  },

  {
    industrySector: "general",
    workflowName: "Discrimination Investigation Procedure",
    description: "Comprehensive investigation workflow for employment discrimination complaints under Title VII, ADA, ADEA, and Florida Civil Rights Act",
    violationType: "discrimination",
    triggerConditions: {
      alertTypes: ["discrimination", "disparate_treatment"],
      minRiskScore: 70,
      keywords: ["discrimination", "race", "gender", "age", "disability", "religion"]
    },
    steps: [
      {
        stepNumber: 1,
        stepName: "Complaint Intake",
        assignedRole: "compliance_officer",
        estimatedDuration: 45,
        requiredActions: [
          "Document protected characteristic(s) at issue",
          "Identify specific adverse employment action alleged",
          "Determine comparators (similarly situated employees)",
          "Record timeline of events",
          "Preserve all relevant evidence",
          "Provide anti-retaliation notice"
        ]
      },
      {
        stepNumber: 2,
        stepName: "Protected Class and Adverse Action Analysis",
        assignedRole: "attorney",
        estimatedDuration: 60,
        requiredActions: [
          "Verify protected class status under applicable law",
          "Determine if adverse action is materially adverse",
          "Assess whether McDonnell Douglas framework applies",
          "Identify potential disparate treatment or disparate impact",
          "Document initial legal assessment"
        ]
      },
      {
        stepNumber: 3,
        stepName: "Evidence Gathering - Personnel Files",
        assignedRole: "compliance_officer",
        estimatedDuration: 90,
        requiredActions: [
          "Pull personnel files for complainant and comparators",
          "Review performance evaluations and disciplinary history",
          "Analyze compensation and promotion history",
          "Review job descriptions and qualifications",
          "Document hiring/promotion decision-making process"
        ]
      },
      {
        stepNumber: 4,
        stepName: "Decision-Maker Interviews",
        assignedRole: "attorney",
        estimatedDuration: 120,
        requiredActions: [
          "Interview supervisor who made challenged employment decision",
          "Document stated reasons for adverse action",
          "Assess consistency with company policy and past practice",
          "Identify whether decision was based on legitimate business reason",
          "Document any evidence of discriminatory animus"
        ]
      },
      {
        stepNumber: 5,
        stepName: "Complainant Interview",
        assignedRole: "attorney",
        estimatedDuration: 90,
        requiredActions: [
          "Interview complainant about alleged discrimination",
          "Document specific statements or conduct showing bias",
          "Identify comparators and why they were treated differently",
          "Assess whether stated reasons are pretextual",
          "Document complainant's qualifications and performance"
        ]
      },
      {
        stepNumber: 6,
        stepName: "Comparator Analysis",
        assignedRole: "attorney",
        estimatedDuration: 120,
        requiredActions: [
          "Identify similarly situated employees (same supervisor, similar violations, similar qualifications)",
          "Compare treatment of complainant vs. comparators",
          "Document differences in protected class status",
          "Analyze whether differences in treatment are explained by legitimate factors",
          "Prepare comparator matrix"
        ]
      },
      {
        stepNumber: 7,
        stepName: "Witness Interviews",
        assignedRole: "attorney",
        estimatedDuration: 150,
        requiredActions: [
          "Interview witnesses to alleged discriminatory statements",
          "Interview HR personnel involved in decision",
          "Interview colleagues about work environment",
          "Document any evidence of bias or discriminatory culture",
          "Assess credibility of all witnesses"
        ]
      },
      {
        stepNumber: 8,
        stepName: "Pretext Analysis",
        assignedRole: "attorney",
        estimatedDuration: 120,
        requiredActions: [
          "Evaluate whether employer's stated reasons are pretextual",
          "Assess consistency of reasons over time",
          "Compare to how policy applied to others",
          "Document any shifting explanations or inconsistencies",
          "Analyze statistical evidence if disparate impact alleged"
        ]
      },
      {
        stepNumber: 9,
        stepName: "Factual Findings",
        assignedRole: "attorney",
        estimatedDuration: 180,
        requiredActions: [
          "Document all factual findings",
          "Determine whether complainant established prima facie case",
          "Assess whether employer articulated legitimate non-discriminatory reason",
          "Evaluate whether evidence shows pretext",
          "Prepare detailed findings report"
        ]
      },
      {
        stepNumber: 10,
        stepName: "Legal Conclusion",
        assignedRole: "attorney",
        estimatedDuration: 120,
        requiredActions: [
          "Apply McDonnell Douglas burden-shifting framework",
          "Determine whether discrimination occurred by preponderance",
          "Assess liability under Title VII, ADA, ADEA, or Florida law",
          "Identify exposure and potential damages",
          "Document legal conclusions"
        ]
      },
      {
        stepNumber: 11,
        stepName: "Remedial Action",
        assignedRole: "compliance_officer",
        estimatedDuration: 90,
        requiredActions: [
          "Reverse discriminatory decision if discrimination found",
          "Provide make-whole relief (back pay, promotion, reinstatement)",
          "Discipline decision-makers if discrimination substantiated",
          "Implement training for supervisors and staff",
          "Update policies to prevent recurrence"
        ]
      },
      {
        stepNumber: 12,
        stepName: "Outcome Communication",
        assignedRole: "compliance_officer",
        estimatedDuration: 30,
        requiredActions: [
          "Communicate outcome to complainant (general findings)",
          "Provide written summary of investigation conclusions",
          "Explain remedial actions taken (if discrimination found)",
          "Remind of anti-retaliation protections",
          "Document all communications"
        ]
      },
      {
        stepNumber: 13,
        stepName: "Monitoring and Follow-Up",
        assignedRole: "compliance_officer",
        estimatedDuration: 60,
        requiredActions: [
          "Monitor for retaliation against complainant",
          "Verify remedial actions implemented",
          "Conduct follow-up check-ins",
          "Document case closure",
          "Retain records per EEOC requirements (1 year minimum)"
        ]
      }
    ],
    estimatedTotalDuration: 1320,
    regulatoryDeadlines: [
      { regulation: "EEOC Charge", description: "Employee has 180 days (300 in deferral states) from discriminatory act", daysAllowed: 180 },
      { regulation: "Florida FCHR", description: "365 days to file with Florida Commission on Human Relations", daysAllowed: 365 },
      { regulation: "Record Retention", description: "EEOC requires retention of personnel records for 1 year from termination", daysAllowed: 365 }
    ]
  },

  {
    industrySector: "general",
    workflowName: "Retaliation Investigation Procedure",
    description: "Investigation workflow for retaliation complaints under Title VII, SOX, OSHA, and Florida whistleblower laws",
    violationType: "retaliation",
    triggerConditions: {
      alertTypes: ["retaliation", "whistleblower"],
      minRiskScore: 75,
      keywords: ["retaliation", "reprisal", "retaliate", "complained", "reported"]
    },
    steps: [
      {
        stepNumber: 1,
        stepName: "Protected Activity Identification",
        assignedRole: "compliance_officer",
        estimatedDuration: 45,
        requiredActions: [
          "Document protected activity (discrimination complaint, OSHA report, SOX disclosure)",
          "Verify activity is protected under applicable law",
          "Establish timeline of protected activity",
          "Identify who had knowledge of protected activity",
          "Document adverse action alleged"
        ]
      },
      {
        stepNumber: 2,
        stepName: "Adverse Action Assessment",
        assignedRole: "attorney",
        estimatedDuration: 60,
        requiredActions: [
          "Determine if action is materially adverse under Burlington Northern standard",
          "Assess whether action might deter reasonable person from protected activity",
          "Document timing of adverse action relative to protected activity",
          "Identify decision-makers and their knowledge of protected activity"
        ]
      },
      {
        stepNumber: 3,
        stepName: "Causation Analysis - Temporal Proximity",
        assignedRole: "attorney",
        estimatedDuration: 45,
        requiredActions: [
          "Calculate time between protected activity and adverse action",
          "Assess strength of temporal proximity (days/weeks = strong, months = weak)",
          "Document any intervening events",
          "Identify evidence of causal connection beyond timing"
        ]
      },
      {
        stepNumber: 4,
        stepName: "Decision-Maker Interview",
        assignedRole: "attorney",
        estimatedDuration: 120,
        requiredActions: [
          "Interview supervisor who took adverse action",
          "Document stated business reasons for action",
          "Verify decision-maker knew about protected activity",
          "Assess whether reasons are consistent with past practice",
          "Document any evidence of retaliatory animus"
        ]
      },
      {
        stepNumber: 5,
        stepName: "Evidence Review - Pre and Post Protected Activity",
        assignedRole: "attorney",
        estimatedDuration: 90,
        requiredActions: [
          "Review complainant's performance evaluations before and after",
          "Analyze discipline history pre and post protected activity",
          "Document any change in treatment after protected activity",
          "Review emails/communications for evidence of animus",
          "Identify pattern of antagonism following protected activity"
        ]
      },
      {
        stepNumber: 6,
        stepName: "Complainant Interview",
        assignedRole: "attorney",
        estimatedDuration: 90,
        requiredActions: [
          "Interview complainant about protected activity",
          "Document how employer learned of protected activity",
          "Identify evidence of causal connection",
          "Document changes in treatment post-protected activity",
          "Assess complainant's credibility"
        ]
      },
      {
        stepNumber: 7,
        stepName: "Comparator Analysis",
        assignedRole: "attorney",
        estimatedDuration: 90,
        requiredActions: [
          "Identify similarly situated employees who did not engage in protected activity",
          "Compare treatment of complainant vs. comparators",
          "Document whether complainant treated differently",
          "Analyze whether differential treatment explained by legitimate factors"
        ]
      },
      {
        stepNumber: 8,
        stepName: "Witness Interviews",
        assignedRole: "attorney",
        estimatedDuration: 120,
        requiredActions: [
          "Interview witnesses to retaliatory statements or conduct",
          "Document any evidence of animus toward complainant",
          "Interview HR about decision-making process",
          "Assess whether decision followed normal procedures"
        ]
      },
      {
        stepNumber: 9,
        stepName: "Pretext Assessment",
        assignedRole: "attorney",
        estimatedDuration: 120,
        requiredActions: [
          "Evaluate whether stated reasons are pretextual",
          "Assess whether reasons shifted over time",
          "Compare to how similarly situated employees treated",
          "Document weaknesses in employer's justification",
          "Analyze whether same action would have occurred absent protected activity"
        ]
      },
      {
        stepNumber: 10,
        stepName: "But-For Causation Determination",
        assignedRole: "attorney",
        estimatedDuration: 90,
        requiredActions: [
          "Apply but-for causation test (protected activity was but-for cause)",
          "Evaluate all evidence of causal connection",
          "Assess contributing factor vs. but-for standard",
          "Document causation analysis",
          "Determine whether retaliation proven by preponderance"
        ]
      },
      {
        stepNumber: 11,
        stepName: "Legal Conclusions and Findings",
        assignedRole: "attorney",
        estimatedDuration: 120,
        requiredActions: [
          "Apply legal framework (Title VII, SOX, OSHA, Florida §448.102)",
          "Determine whether retaliation occurred",
          "Assess employer liability and exposure",
          "Identify potential damages (reinstatement, back pay, emotional distress)",
          "Document detailed legal analysis"
        ]
      },
      {
        stepNumber: 12,
        stepName: "Corrective Action",
        assignedRole: "compliance_officer",
        estimatedDuration: 90,
        requiredActions: [
          "Reverse retaliatory action if retaliation substantiated",
          "Provide make-whole relief (reinstatement, back pay, restore benefits)",
          "Discipline retaliators",
          "Train managers on retaliation prohibitions",
          "Update anti-retaliation policies"
        ]
      },
      {
        stepNumber: 13,
        stepName: "Follow-Up and Monitoring",
        assignedRole: "compliance_officer",
        estimatedDuration: 60,
        requiredActions: [
          "Monitor to ensure no continuing retaliation",
          "Conduct periodic check-ins with complainant",
          "Verify remedial actions effective",
          "Document case closure",
          "Retain investigation records"
        ]
      }
    ],
    estimatedTotalDuration: 1200,
    regulatoryDeadlines: [
      { regulation: "SOX Whistleblower", description: "Complaint to DOL OSHA within 180 days of retaliation", daysAllowed: 180 },
      { regulation: "OSHA Retaliation", description: "Complaint to OSHA within 30 days of retaliation", daysAllowed: 30 },
      { regulation: "Florida Whistleblower", description: "3-year statute of limitations for civil action", daysAllowed: 1095 }
    ]
  }
];

export const investigationPlaybookTemplates = {
  fcpa: {
    title: "FCPA Investigation Playbook",
    description: "Comprehensive playbook for investigating Foreign Corrupt Practices Act violations",
    initialSteps: [
      "Secure all potentially relevant communications and documents",
      "Interview key personnel to understand facts",
      "Identify foreign officials or government entities involved",
      "Trace payment flows and beneficiaries",
      "Review third-party due diligence records"
    ],
    keyQuestions: [
      "Was a payment, gift, or thing of value provided?",
      "Was it provided to a foreign official or intermediary?",
      "Was the purpose to obtain or retain business?",
      "Were the payments accurately recorded in books and records?",
      "What internal controls existed and did they fail?"
    ],
    evidenceChecklist: [
      "Communications with foreign officials or intermediaries",
      "Payment authorization and wire transfer records",
      "Invoices and contracts with third parties",
      "Due diligence reports on agents/consultants",
      "Books and records showing how payments recorded",
      "Training records and compliance certifications",
      "Prior internal audit findings"
    ],
    legalConsiderations: [
      "DOJ FCPA Corporate Enforcement Policy (2024) - mitigation credit for voluntary disclosure",
      "SEC cooperation framework",
      "Statute of limitations (5 years criminal, no limit civil)",
      "Successor liability for M&A transactions",
      "Parallel proceedings (DOJ, SEC, foreign regulators)"
    ]
  },
  antitrust: {
    title: "Antitrust Investigation Playbook",
    description: "Playbook for investigating potential Sherman Act violations (price-fixing, market allocation)",
    initialSteps: [
      "Immediately cease any suspect coordination activities",
      "Secure all communications with competitors",
      "Identify all employees who participated in industry events",
      "Preserve trade association meeting materials",
      "Assess whether conduct is per se illegal or rule of reason"
    ],
    keyQuestions: [
      "Was there an agreement or understanding with competitors?",
      "Did the agreement relate to price, output, or market allocation?",
      "What evidence exists of the agreement (emails, meetings, parallel conduct)?",
      "Was there a business justification (joint venture, legitimate collaboration)?",
      "What was the competitive harm to customers?"
    ],
    evidenceChecklist: [
      "Communications with competitors (emails, texts, recorded calls)",
      "Trade association meeting minutes and attendance",
      "Pricing documents showing parallel changes",
      "Market allocation discussions or territorial agreements",
      "Customer complaints about pricing or availability",
      "Economic analysis of market impact"
    ],
    legalConsiderations: [
      "Criminal vs. civil exposure",
      "DOJ Antitrust Division leniency program - first to report avoids criminal prosecution",
      "Parallel state AG investigations",
      "Private treble damages litigation exposure",
      "Individual criminal liability for executives"
    ]
  },
  aml: {
    title: "AML/BSA Investigation Playbook",
    description: "Bank Secrecy Act and Anti-Money Laundering investigation procedures",
    initialSteps: [
      "Pull complete transaction history for customer",
      "Analyze patterns: structuring, rapid movement of funds, high-risk jurisdictions",
      "Review KYC and CDD documentation",
      "Check against OFAC SDN list and sanctions screening",
      "Determine if Currency Transaction Report (CTR) was filed"
    ],
    keyQuestions: [
      "Was there an attempt to structure transactions to evade reporting?",
      "What is the source of funds?",
      "Does the activity match the customer profile?",
      "Are there red flags for money laundering?",
      "Is a Suspicious Activity Report (SAR) required?"
    ],
    evidenceChecklist: [
      "Transaction logs showing deposits, withdrawals, transfers",
      "Customer identification and verification documents",
      "Source of wealth documentation",
      "Communications with customer about transactions",
      "Prior SARs or CTRs filed",
      "Account opening documents and risk rating"
    ],
    legalConsiderations: [
      "SAR filing deadline: 30 days from initial detection",
      "Prohibition on tipping off customer about SAR",
      "Continuing obligation to monitor after SAR",
      "Civil penalties up to $250,000 per violation",
      "Criminal penalties for willful violations"
    ]
  }
};
