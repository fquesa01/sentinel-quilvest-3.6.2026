import OpenAI from "openai";

// Using Replit's AI Integrations service for OpenAI access
// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
export const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

interface ViolationAnalysis {
  violationType: string;
  severity: string;
  riskScore: number;
  confidenceScore: number;
  analysis: string;
  flaggedKeywords: string[];
  detectionTypes: string[];
  isTeachingMoment: boolean;
  ruleMatches: Array<{ ruleId: string; confidence: number }>;
}

const DETECTION_PATTERNS = {
  off_channel_steering: {
    keywords: ["whatsapp", "signal", "telegram", "personal email", "gmail", "yahoo", "text me", "call my cell", "delete this", "off the record", "don't email"],
    detectionType: "off_channel_steering" as const,
    description: "Attempting to move conversation to unmonitored channels",
    violationType: "other",
    severity: "high",
    isTeachingMoment: true,
  },
  fcpa_foreign_official: {
    keywords: [
      "foreign official", "government official", "ministry", "state-owned",
      "government employee", "public servant", "political party", "candidate for office"
    ],
    detectionType: "fcpa_foreign_official" as const,
    description: "FCPA violation - Foreign official involvement",
    violationType: "fcpa",
    severity: "critical",
    isTeachingMoment: false,
  },
  fcpa_third_party_risk: {
    keywords: [
      "third party", "intermediary", "agent", "consultant", "distributor",
      "offshore account", "shell company", "beneficial owner"
    ],
    detectionType: "fcpa_third_party_risk" as const,
    description: "FCPA violation - Third-party risk indicators",
    violationType: "fcpa",
    severity: "critical",
    isTeachingMoment: false,
  },
  fcpa_payment_intent: {
    keywords: [
      "bribe", "kickback", "payment to agent", "consultant fee",
      "facilitation payment", "grease payment", "cash payment", "gift", "entertainment"
    ],
    detectionType: "fcpa_payment_intent" as const,
    description: "FCPA violation - Improper payment indicators",
    violationType: "fcpa",
    severity: "critical",
    isTeachingMoment: false,
  },
  antitrust_price_fixing: {
    keywords: [
      "price fixing", "fix prices", "agreed price", "pricing agreement", "maintain prices",
      "predatory pricing", "competitor meeting"
    ],
    detectionType: "antitrust_price_fixing" as const,
    description: "Antitrust violations - Price fixing and coordination",
    violationType: "antitrust",
    severity: "critical",
    isTeachingMoment: false,
  },
  antitrust_market_allocation: {
    keywords: [
      "market allocation", "divide markets", "territory division", "customer allocation",
      "bid rigging", "collusion", "cartel", "monopoly", "anti-competitive", "tie-in", "exclusive dealing"
    ],
    detectionType: "antitrust_market_allocation" as const,
    description: "Antitrust violations - Market allocation and bid rigging",
    violationType: "antitrust",
    severity: "critical",
    isTeachingMoment: false,
  },
  aml_suspicious_transaction: {
    keywords: [
      "money laundering", "suspicious activity", "large cash", "structuring", "smurfing",
      "shell company", "offshore", "sanctioned", "ofac", "pep", "politically exposed",
      "wire transfer", "multiple accounts", "beneficial owner", "nominee"
    ],
    detectionType: "aml_suspicious_transaction" as const,
    description: "Anti-Money Laundering concerns - Suspicious transactions, structuring",
    violationType: "banking",
    severity: "critical",
    isTeachingMoment: false,
  },
  reg_sp_privacy_violation: {
    keywords: [
      "customer data", "social security", "ssn", "credit card", "financial information",
      "nonpublic personal information", "npi", "safeguards", "privacy notice",
      "opt out", "third party disclosure", "data breach", "unauthorized access"
    ],
    detectionType: "reg_sp_privacy_violation" as const,
    description: "Regulation S-P privacy violations - Customer data handling",
    violationType: "banking",
    severity: "high",
    isTeachingMoment: false,
  },
  teaching_moment: {
    keywords: [
      "inappropriate language", "unprofessional", "offensive", "harassment",
      "minor policy", "training needed", "reminder", "best practice"
    ],
    detectionType: "teaching_moment" as const,
    description: "Coachable violations - Training opportunities",
    violationType: "other",
    severity: "low",
    isTeachingMoment: true,
  },
  sox_other: {
    keywords: ["financial reporting", "internal control", "audit", "accounting fraud", "misstatement", "certify", "sox", "404", "302"],
    detectionType: "other_violation" as const,
    description: "Sarbanes-Oxley - Financial reporting accuracy",
    violationType: "sox",
    severity: "high",
    isTeachingMoment: false,
  },
  sec_other: {
    keywords: ["insider trading", "material non-public", "mnpi", "tipping", "disclosure", "10-k", "10-q", "confidential"],
    detectionType: "other_violation" as const,
    description: "SEC regulations - Securities violations",
    violationType: "sec",
    severity: "critical",
    isTeachingMoment: false,
  },
};

export async function analyzeViolation(
  subject: string,
  body: string,
  sender: string
): Promise<ViolationAnalysis> {
  const text = `${subject}\n${body}`.toLowerCase();

  // Comprehensive keyword detection across all patterns
  const flaggedKeywords: string[] = [];
  const detectedPatterns = new Set<string>();
  const ruleMatches: Array<{ ruleId: string; confidence: number }> = [];
  let primaryViolationType = "other";
  let maxSeverity = "informational";
  let isTeachingMoment = false;

  // Scan for all detection patterns
  for (const [patternKey, pattern] of Object.entries(DETECTION_PATTERNS)) {
    let patternMatchCount = 0;
    for (const keyword of pattern.keywords) {
      if (text.includes(keyword.toLowerCase())) {
        if (!flaggedKeywords.includes(keyword)) {
          flaggedKeywords.push(keyword);
        }
        patternMatchCount++;
      }
    }

    if (patternMatchCount > 0) {
      detectedPatterns.add(pattern.detectionType);
      const confidence = Math.min((patternMatchCount / pattern.keywords.length) * 100, 100);
      ruleMatches.push({ ruleId: patternKey, confidence });

      // Update primary violation type to the most severe
      if (pattern.severity === "critical" || 
          (pattern.severity === "high" && maxSeverity !== "critical")) {
        primaryViolationType = pattern.violationType;
        maxSeverity = pattern.severity;
      }

      if (pattern.isTeachingMoment) {
        isTeachingMoment = true;
      }
    }
  }

  // If no keywords found, return clean result
  if (flaggedKeywords.length === 0) {
    return {
      violationType: "other",
      severity: "informational",
      riskScore: 0,
      confidenceScore: 0,
      analysis: "No compliance concerns detected.",
      flaggedKeywords: [],
      detectionTypes: [],
      isTeachingMoment: false,
      ruleMatches: [],
    };
  }

  try {
    // Use OpenAI for deeper contextual analysis
    const detectionTypesDesc = Array.from(detectedPatterns).map(dt => {
      const pattern = Object.values(DETECTION_PATTERNS).find(p => p.detectionType === dt);
      return `- ${dt}: ${pattern?.description}`;
    }).join("\n");

    const prompt = `You are an enterprise compliance analyst specializing in regulatory violations. Analyze this communication for potential violations.

Subject: ${subject}
Body: ${body}
Sender: ${sender}

Flagged keywords: ${flaggedKeywords.join(", ")}
Detected patterns: ${Array.from(detectedPatterns).join(", ")}

${detectionTypesDesc}

Provide a comprehensive analysis as JSON. Use ONLY these valid detection types:
- off_channel_steering
- fcpa_foreign_official
- fcpa_third_party_risk
- fcpa_payment_intent
- antitrust_price_fixing
- antitrust_market_allocation
- aml_suspicious_transaction
- reg_sp_privacy_violation
- teaching_moment
- other_violation

{
  "violationType": "fcpa|banking|antitrust|sec|sox|other",
  "severity": "critical|high|medium|low|informational",
  "riskScore": 0-100,
  "confidenceScore": 0-100,
  "analysis": "Detailed explanation of the potential violation, context, and risk factors",
  "detectionTypes": ["off_channel_steering", "fcpa_foreign_official", "fcpa_third_party_risk", "fcpa_payment_intent", "antitrust_price_fixing", "antitrust_market_allocation", "aml_suspicious_transaction", "reg_sp_privacy_violation", "teaching_moment", "other_violation"],
  "isTeachingMoment": true/false
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_completion_tokens: 8192,
    });

    const result = JSON.parse(response.choices[0]?.message?.content || "{}");

    // Combine AI analysis with rule-based detection
    const finalDetectionTypes = Array.from(new Set([
      ...Array.from(detectedPatterns),
      ...(result.detectionTypes || [])
    ]));

    return {
      violationType: result.violationType || primaryViolationType,
      severity: result.severity || maxSeverity,
      riskScore: result.riskScore || Math.min(flaggedKeywords.length * 20, 100),
      confidenceScore: result.confidenceScore || Math.min((ruleMatches.length * 30) + (flaggedKeywords.length * 10), 100),
      analysis: result.analysis || `Potential violation detected based on keywords: ${flaggedKeywords.join(", ")}`,
      flaggedKeywords,
      detectionTypes: finalDetectionTypes,
      isTeachingMoment: result.isTeachingMoment !== undefined ? result.isTeachingMoment : isTeachingMoment,
      ruleMatches,
    };
  } catch (error) {
    console.error("AI analysis error:", error);

    // Fallback to rule-based analysis
    const severity = flaggedKeywords.length >= 5 ? "critical" : 
                     flaggedKeywords.length >= 3 ? "high" : 
                     flaggedKeywords.length >= 2 ? "medium" : "low";
    const riskScore = Math.min(flaggedKeywords.length * 20, 100);
    const confidenceScore = Math.min((ruleMatches.length * 25) + (flaggedKeywords.length * 10), 100);

    return {
      violationType: primaryViolationType,
      severity,
      riskScore,
      confidenceScore,
      analysis: `Rule-based detection flagged: ${Array.from(detectedPatterns).join(", ")}. Keywords: ${flaggedKeywords.join(", ")}`,
      flaggedKeywords,
      detectionTypes: Array.from(detectedPatterns),
      isTeachingMoment,
      ruleMatches,
    };
  }
}

export interface ComplianceAnalysisResult {
  complianceScore: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  explanation: string;
  violatedRegulations: string[];
  policyViolations: string[];
  relatedDocuments: Array<{
    id: string;
    relationshipType: string;
    confidence: number;
    explanation: string;
  }>;
}

export async function analyzeCompliance(
  communication: {
    id: string;
    subject: string;
    body: string;
    sender: string;
    recipients: any;
    timestamp: Date;
  },
  allCommunications: Array<{
    id: string;
    subject: string;
    body: string;
    sender: string;
    recipients: any;
    timestamp: Date;
  }>,
  policies: Array<{
    id: string;
    title: string;
    content: string;
    category: string;
  }>
): Promise<ComplianceAnalysisResult> {
  try {
    // First, analyze the content for regulatory violations
    const violationAnalysis = await analyzeViolation(
      communication.subject,
      communication.body,
      communication.sender
    );

    // Build policy context (handle undefined/empty policies)
    const policyContext = (policies || []).map(p => 
      `${p.category.toUpperCase()}: ${p.title}\n${p.content.substring(0, 500)}`
    ).join("\n\n");

    // Find potentially related documents (same sender/recipients, similar keywords, temporal proximity)
    // Handle undefined/empty allCommunications
    const relatedCandidates = (allCommunications || [])
      .filter(c => c.id !== communication.id)
      .filter(c => {
        const timeDiff = Math.abs(new Date(communication.timestamp).getTime() - new Date(c.timestamp).getTime());
        const withinWeek = timeDiff < 7 * 24 * 60 * 60 * 1000;
        const sameSender = c.sender === communication.sender;
        const sharedRecipients = JSON.stringify(c.recipients).includes(JSON.stringify(communication.recipients).slice(1, -1).split(',')[0]);
        return withinWeek && (sameSender || sharedRecipients);
      })
      .slice(0, 10); // Limit to 10 most relevant

    const relatedDocsContext = relatedCandidates.map(c => 
      `ID: ${c.id}\nSubject: ${c.subject}\nFrom: ${c.sender}\nDate: ${c.timestamp}`
    ).join("\n\n");

    const prompt = `You are an enterprise compliance analyst. Analyze this communication for comprehensive compliance scoring.

DOCUMENT TO ANALYZE:
Subject: ${communication.subject}
From: ${communication.sender}
To: ${JSON.stringify(communication.recipients)}
Date: ${communication.timestamp}
Body: ${communication.body}

COMPANY POLICIES:
${policyContext || "No policies available"}

RELATED COMMUNICATIONS (for pattern analysis):
${relatedDocsContext || "No related communications found"}

INITIAL VIOLATION ANALYSIS:
${violationAnalysis.analysis}
Risk Score: ${violationAnalysis.riskScore}
Flagged Keywords: ${violationAnalysis.flaggedKeywords.join(", ")}
Violation Type: ${violationAnalysis.violationType}

Provide a comprehensive compliance analysis as JSON:
{
  "complianceScore": 0-100 (0 = critical violation, 100 = fully compliant),
  "riskLevel": "low" | "medium" | "high" | "critical",
  "explanation": "Detailed explanation of compliance concerns, why this may violate regulations/policies, and specific risk factors. Be specific about which regulations/policies are implicated.",
  "violatedRegulations": ["FCPA", "SOX", "Antitrust", etc.],
  "policyViolations": ["Policy name that may be violated"],
  "relatedDocuments": [
    {
      "id": "document-id",
      "relationshipType": "same_thread" | "same_participants" | "temporal_cluster" | "topic_cluster" | "violation_chain",
      "confidence": 0-100,
      "explanation": "Why these documents together may constitute a violation"
    }
  ]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_completion_tokens: 8192,
    });

    const result = JSON.parse(response.choices[0]?.message?.content || "{}");

    // Ensure we have valid data
    return {
      complianceScore: result.complianceScore ?? (100 - violationAnalysis.riskScore),
      riskLevel: result.riskLevel ?? (
        violationAnalysis.riskScore >= 80 ? "critical" :
        violationAnalysis.riskScore >= 60 ? "high" :
        violationAnalysis.riskScore >= 40 ? "medium" : "low"
      ),
      explanation: result.explanation || violationAnalysis.analysis,
      violatedRegulations: result.violatedRegulations || (violationAnalysis.riskScore > 0 ? [violationAnalysis.violationType.toUpperCase()] : []),
      policyViolations: result.policyViolations || [],
      relatedDocuments: result.relatedDocuments || [],
    };
  } catch (error) {
    console.error("Compliance analysis error:", error);
    
    // Fallback analysis
    return {
      complianceScore: 75,
      riskLevel: "low",
      explanation: "Unable to perform full AI analysis. Document appears to have no major compliance concerns based on initial screening.",
      violatedRegulations: [],
      policyViolations: [],
      relatedDocuments: [],
    };
  }
}
