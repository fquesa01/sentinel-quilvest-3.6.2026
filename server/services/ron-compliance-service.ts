import { db } from "../db";
import { eq, and, sql } from "drizzle-orm";
import { ronComplianceChecks, ronSigners, ronEligibilityChecks, ronAltIdvRecords } from "@shared/schema";
import type { InsertRonComplianceCheck, RonComplianceCheck, InsertRonEligibilityCheck, RonEligibilityCheck, InsertRonAltIdvRecord, RonAltIdvRecord } from "@shared/schema";

type ComplianceCheckType = RonComplianceCheck["checkType"];
type ComplianceResult = RonComplianceCheck["result"];

interface StateComplianceRule {
  state: string;
  stateName: string;
  statute: string;
  requirements: {
    kbaRequired: boolean;
    kbaMinScore: number;
    kbaQuestionCount: number;
    kbaTimeLimit: number;
    credentialAnalysisRequired: boolean;
    livenessRequired: boolean;
    biometricMatchRequired: boolean;
    ofacRequired: boolean;
    amlRequired: boolean;
    audioVideoRequired: boolean;
    recordingRetentionYears: number;
    notaryMustBeInState: boolean;
    signerLocationRestriction: string;
    electronicJournalRequired: boolean;
    tamperEvidentSealRequired: boolean;
    bondAmount: number;
    eoInsuranceAmount: number;
    ronTrainingHours: number;
    ronExamPassScore: number;
  };
  ronPermittedDocumentTypes: string[];
  ronRestrictedDocumentTypes: string[];
  countyOverrides: Record<string, { restricted: boolean; restrictedDocTypes?: string[]; note: string }>;
  alternativeIdvMethods: {
    credibleWitness: boolean;
    personalKnowledge: boolean;
    credibleWitnessRequirements?: {
      witnessCount: number;
      witnessIdvRequired: boolean;
      witnessKbaRequired: boolean;
    };
    personalKnowledgeRequirements?: {
      notaryMustBeCommissioned: boolean;
      formalAttestationRequired: boolean;
      priorRelationshipRequired: boolean;
    };
  };
}

const stateComplianceRules: Record<string, StateComplianceRule> = {
  FL: {
    state: "FL",
    stateName: "Florida",
    statute: "Chapter 117, F.S. / 1N-7001, F.A.C.",
    requirements: {
      kbaRequired: true,
      kbaMinScore: 4,
      kbaQuestionCount: 5,
      kbaTimeLimit: 120,
      credentialAnalysisRequired: true,
      livenessRequired: true,
      biometricMatchRequired: false,
      ofacRequired: true,
      amlRequired: true,
      audioVideoRequired: true,
      recordingRetentionYears: 10,
      notaryMustBeInState: true,
      signerLocationRestriction: "none",
      electronicJournalRequired: true,
      tamperEvidentSealRequired: true,
      bondAmount: 25000,
      eoInsuranceAmount: 25000,
      ronTrainingHours: 2,
      ronExamPassScore: 70,
    },
    ronPermittedDocumentTypes: [
      "general", "deed", "mortgage", "power_of_attorney", "affidavit",
      "trust", "closing_disclosure", "note", "corporate_documents",
    ],
    ronRestrictedDocumentTypes: [],
    countyOverrides: {
      "Miami-Dade": { restricted: false, note: "Full RON permitted" },
      "Broward": { restricted: false, note: "Full RON permitted" },
    },
    alternativeIdvMethods: {
      credibleWitness: true,
      personalKnowledge: true,
      credibleWitnessRequirements: {
        witnessCount: 1,
        witnessIdvRequired: true,
        witnessKbaRequired: false,
      },
      personalKnowledgeRequirements: {
        notaryMustBeCommissioned: true,
        formalAttestationRequired: true,
        priorRelationshipRequired: true,
      },
    },
  },
  TX: {
    state: "TX",
    stateName: "Texas",
    statute: "Chapter 406, Gov't Code / SB 2128",
    requirements: {
      kbaRequired: true,
      kbaMinScore: 4,
      kbaQuestionCount: 5,
      kbaTimeLimit: 120,
      credentialAnalysisRequired: true,
      livenessRequired: true,
      biometricMatchRequired: false,
      ofacRequired: true,
      amlRequired: false,
      audioVideoRequired: true,
      recordingRetentionYears: 5,
      notaryMustBeInState: true,
      signerLocationRestriction: "none",
      electronicJournalRequired: true,
      tamperEvidentSealRequired: true,
      bondAmount: 10000,
      eoInsuranceAmount: 25000,
      ronTrainingHours: 4,
      ronExamPassScore: 80,
    },
    ronPermittedDocumentTypes: [
      "general", "deed", "mortgage", "power_of_attorney", "affidavit",
      "trust", "closing_disclosure", "note", "corporate_documents",
    ],
    ronRestrictedDocumentTypes: ["will"],
    countyOverrides: {
      "Harris": { restricted: false, note: "Full RON permitted" },
      "Travis": { restricted: false, note: "Full RON permitted" },
    },
    alternativeIdvMethods: {
      credibleWitness: true,
      personalKnowledge: true,
      credibleWitnessRequirements: {
        witnessCount: 2,
        witnessIdvRequired: true,
        witnessKbaRequired: true,
      },
      personalKnowledgeRequirements: {
        notaryMustBeCommissioned: true,
        formalAttestationRequired: true,
        priorRelationshipRequired: true,
      },
    },
  },
  VA: {
    state: "VA",
    stateName: "Virginia",
    statute: "§47.1-2 et seq.",
    requirements: {
      kbaRequired: true,
      kbaMinScore: 4,
      kbaQuestionCount: 5,
      kbaTimeLimit: 120,
      credentialAnalysisRequired: true,
      livenessRequired: true,
      biometricMatchRequired: false,
      ofacRequired: true,
      amlRequired: false,
      audioVideoRequired: true,
      recordingRetentionYears: 5,
      notaryMustBeInState: false,
      signerLocationRestriction: "none",
      electronicJournalRequired: true,
      tamperEvidentSealRequired: true,
      bondAmount: 10000,
      eoInsuranceAmount: 25000,
      ronTrainingHours: 2,
      ronExamPassScore: 70,
    },
    ronPermittedDocumentTypes: [
      "general", "deed", "mortgage", "power_of_attorney", "affidavit",
      "trust", "closing_disclosure", "note",
    ],
    ronRestrictedDocumentTypes: [],
    countyOverrides: {},
    alternativeIdvMethods: {
      credibleWitness: true,
      personalKnowledge: true,
      credibleWitnessRequirements: {
        witnessCount: 1,
        witnessIdvRequired: true,
        witnessKbaRequired: false,
      },
      personalKnowledgeRequirements: {
        notaryMustBeCommissioned: true,
        formalAttestationRequired: true,
        priorRelationshipRequired: false,
      },
    },
  },
  CA: {
    state: "CA",
    stateName: "California",
    statute: "SB 696 (2025 RON authorization)",
    requirements: {
      kbaRequired: true,
      kbaMinScore: 4,
      kbaQuestionCount: 5,
      kbaTimeLimit: 120,
      credentialAnalysisRequired: true,
      livenessRequired: true,
      biometricMatchRequired: true,
      ofacRequired: true,
      amlRequired: true,
      audioVideoRequired: true,
      recordingRetentionYears: 10,
      notaryMustBeInState: true,
      signerLocationRestriction: "none",
      electronicJournalRequired: true,
      tamperEvidentSealRequired: true,
      bondAmount: 15000,
      eoInsuranceAmount: 25000,
      ronTrainingHours: 6,
      ronExamPassScore: 70,
    },
    ronPermittedDocumentTypes: [
      "general", "power_of_attorney", "affidavit", "trust", "corporate_documents",
    ],
    ronRestrictedDocumentTypes: ["deed", "mortgage", "note"],
    countyOverrides: {
      "Los Angeles": { restricted: true, restrictedDocTypes: ["deed"], note: "LA County restricts RON for deed transfers" },
      "San Francisco": { restricted: false, note: "Full RON permitted for allowed document types" },
    },
    alternativeIdvMethods: {
      credibleWitness: true,
      personalKnowledge: false,
      credibleWitnessRequirements: {
        witnessCount: 1,
        witnessIdvRequired: true,
        witnessKbaRequired: true,
      },
    },
  },
  NY: {
    state: "NY",
    stateName: "New York",
    statute: "Electronic Notarization Act (S.1780-C)",
    requirements: {
      kbaRequired: true,
      kbaMinScore: 4,
      kbaQuestionCount: 5,
      kbaTimeLimit: 120,
      credentialAnalysisRequired: true,
      livenessRequired: true,
      biometricMatchRequired: false,
      ofacRequired: true,
      amlRequired: true,
      audioVideoRequired: true,
      recordingRetentionYears: 10,
      notaryMustBeInState: true,
      signerLocationRestriction: "none",
      electronicJournalRequired: true,
      tamperEvidentSealRequired: true,
      bondAmount: 10000,
      eoInsuranceAmount: 25000,
      ronTrainingHours: 3,
      ronExamPassScore: 70,
    },
    ronPermittedDocumentTypes: [
      "general", "deed", "mortgage", "power_of_attorney", "affidavit",
      "trust", "closing_disclosure", "note",
    ],
    ronRestrictedDocumentTypes: ["will"],
    countyOverrides: {
      "New York": { restricted: true, restrictedDocTypes: ["deed"], note: "NYC requires in-person notarization for deed transfers" },
    },
    alternativeIdvMethods: {
      credibleWitness: true,
      personalKnowledge: true,
      credibleWitnessRequirements: {
        witnessCount: 1,
        witnessIdvRequired: true,
        witnessKbaRequired: true,
      },
      personalKnowledgeRequirements: {
        notaryMustBeCommissioned: true,
        formalAttestationRequired: true,
        priorRelationshipRequired: true,
      },
    },
  },
};

export function getComplianceRules(state: string): StateComplianceRule | null {
  return stateComplianceRules[state.toUpperCase()] || null;
}

export function getAllSupportedStates(): StateComplianceRule[] {
  return Object.values(stateComplianceRules);
}

export interface EligibilityCheckParams {
  jurisdiction: string;
  transactionType?: string;
  documentTypes?: string[];
  county?: string;
}

export interface EligibilityResult {
  result: "eligible" | "ineligible" | "conditional" | "manual_review";
  reasons: string[];
  warnings: string[];
  alternativeIdvMethods: {
    credibleWitness: boolean;
    personalKnowledge: boolean;
  };
}

export function checkRonEligibility(params: EligibilityCheckParams): EligibilityResult {
  const rules = getComplianceRules(params.jurisdiction);
  const reasons: string[] = [];
  const warnings: string[] = [];

  if (!rules) {
    return {
      result: "ineligible",
      reasons: [`State "${params.jurisdiction}" does not have RON authorization or is not yet supported in this system`],
      warnings: [],
      alternativeIdvMethods: { credibleWitness: false, personalKnowledge: false },
    };
  }

  const docTypes = params.documentTypes || [];
  for (const docType of docTypes) {
    if (rules.ronRestrictedDocumentTypes.includes(docType)) {
      reasons.push(`Document type "${docType}" is explicitly restricted for RON in ${rules.stateName}`);
    } else if (rules.ronPermittedDocumentTypes.length > 0 && !rules.ronPermittedDocumentTypes.includes(docType)) {
      reasons.push(`Document type "${docType}" is not in the list of permitted RON document types for ${rules.stateName}`);
    }
  }

  if (params.county && rules.countyOverrides[params.county]) {
    const override = rules.countyOverrides[params.county];
    if (override.restricted) {
      const restrictedInCounty = docTypes.filter(dt =>
        override.restrictedDocTypes?.includes(dt)
      );
      if (restrictedInCounty.length > 0) {
        reasons.push(`County "${params.county}" does not accept RON for: ${restrictedInCounty.join(", ")}. ${override.note}`);
      } else if (override.restrictedDocTypes && override.restrictedDocTypes.length > 0) {
        warnings.push(`County "${params.county}" has restrictions: ${override.note}`);
      }
    } else {
      warnings.push(`County "${params.county}": ${override.note}`);
    }
  }

  if (rules.requirements.biometricMatchRequired) {
    warnings.push(`${rules.stateName} requires biometric matching — ensure your IDV provider supports this`);
  }

  if (rules.requirements.notaryMustBeInState) {
    warnings.push(`Notary must be physically located in ${rules.stateName} during the session`);
  }

  if (rules.requirements.amlRequired) {
    warnings.push(`${rules.stateName} requires AML screening for signers`);
  }

  let result: EligibilityResult["result"];
  if (reasons.length > 0) {
    result = "ineligible";
  } else if (warnings.length > 0) {
    result = "conditional";
  } else {
    result = "eligible";
  }

  return {
    result,
    reasons,
    warnings,
    alternativeIdvMethods: {
      credibleWitness: rules.alternativeIdvMethods.credibleWitness,
      personalKnowledge: rules.alternativeIdvMethods.personalKnowledge,
    },
  };
}

export async function saveEligibilityCheck(
  params: InsertRonEligibilityCheck
): Promise<RonEligibilityCheck> {
  const [check] = await db
    .insert(ronEligibilityChecks)
    .values(params)
    .returning();
  return check;
}

export async function getEligibilityChecks(transactionId: string): Promise<RonEligibilityCheck[]> {
  return db
    .select()
    .from(ronEligibilityChecks)
    .where(eq(ronEligibilityChecks.transactionId, transactionId));
}

export async function getLatestEligibilityCheck(transactionId: string): Promise<RonEligibilityCheck | null> {
  const checks = await db
    .select()
    .from(ronEligibilityChecks)
    .where(eq(ronEligibilityChecks.transactionId, transactionId))
    .orderBy(sql`checked_at DESC`)
    .limit(1);
  return checks.length > 0 ? checks[0] : null;
}

export async function createAltIdvRecord(
  params: InsertRonAltIdvRecord
): Promise<RonAltIdvRecord> {
  const [record] = await db
    .insert(ronAltIdvRecords)
    .values(params)
    .returning();
  return record;
}

export async function getAltIdvRecords(signerId: string): Promise<RonAltIdvRecord[]> {
  return db
    .select()
    .from(ronAltIdvRecords)
    .where(eq(ronAltIdvRecords.signerId, signerId));
}

export async function getAltIdvRecord(id: string): Promise<RonAltIdvRecord | null> {
  const [record] = await db
    .select()
    .from(ronAltIdvRecords)
    .where(eq(ronAltIdvRecords.id, id));
  return record || null;
}

export async function updateAltIdvRecord(
  id: string,
  updates: Partial<RonAltIdvRecord>
): Promise<RonAltIdvRecord> {
  const [updated] = await db
    .update(ronAltIdvRecords)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(ronAltIdvRecords.id, id))
    .returning();
  return updated;
}

export async function runComplianceCheck(params: {
  transactionId: string;
  signerId?: string;
  checkType: ComplianceCheckType;
  performedBy?: string;
}): Promise<RonComplianceCheck> {
  let result: ComplianceResult = "pending";
  let score: number | undefined;
  let details: any = {};

  switch (params.checkType) {
    case "ofac": {
      result = "pass";
      score = 100;
      details = {
        provider: "sentinel_ron_stub",
        screeningDate: new Date().toISOString(),
        listsChecked: ["SDN", "CONSOLIDATED", "NON-SDN"],
        matchesFound: 0,
        note: "OFAC screening stub — connect to ComplyAdvantage or Dow Jones Risk for production",
      };
      break;
    }
    case "aml": {
      result = "pass";
      score = 100;
      details = {
        provider: "sentinel_ron_stub",
        screeningDate: new Date().toISOString(),
        riskLevel: "low",
        note: "AML screening stub — connect to compliance vendor for production",
      };
      break;
    }
    case "pep": {
      result = "pass";
      score = 100;
      details = {
        provider: "sentinel_ron_stub",
        isPEP: false,
        note: "PEP screening stub — connect to compliance vendor for production",
      };
      break;
    }
    case "kba": {
      result = "pass";
      score = 100;
      details = {
        provider: "sentinel_ron_stub",
        questionsGenerated: 5,
        note: "KBA quiz stub — connect to credit bureau for production",
      };
      break;
    }
    case "credential_analysis": {
      result = "pass";
      score = 100;
      details = {
        provider: "sentinel_ron_stub",
        note: "Credential analysis stub — connect to Jumio/Onfido for production",
      };
      break;
    }
    case "liveness": {
      result = "pass";
      score = 100;
      details = {
        provider: "sentinel_ron_stub",
        note: "Liveness check stub — connect to Jumio/Onfido for production",
      };
      break;
    }
    case "geolocation": {
      result = "pass";
      details = {
        provider: "sentinel_ron_stub",
        note: "Geolocation verification stub",
      };
      break;
    }
    case "biometric_match": {
      result = "pending";
      details = {
        provider: "sentinel_ron_stub",
        note: "Biometric matching stub — connect to biometric vendor for production",
      };
      break;
    }
    case "device_check": {
      result = "pass";
      score = 100;
      details = {
        provider: "sentinel_ron_stub",
        deviceTrusted: true,
        note: "Device check stub — integrate device fingerprinting for production",
      };
      break;
    }
    case "corporate_authority": {
      result = "pending";
      details = {
        provider: "sentinel_ron_stub",
        note: "Corporate authority verification stub — requires manual review in production",
      };
      break;
    }
  }

  const [check] = await db
    .insert(ronComplianceChecks)
    .values({
      transactionId: params.transactionId,
      signerId: params.signerId,
      checkType: params.checkType,
      result,
      score,
      provider: "sentinel_ron_stub",
      details,
      performedBy: params.performedBy,
      performedAt: new Date(),
    })
    .returning();

  return check;
}

export async function getComplianceChecks(transactionId: string) {
  return db
    .select()
    .from(ronComplianceChecks)
    .where(eq(ronComplianceChecks.transactionId, transactionId));
}

export async function getSignerComplianceChecks(signerId: string) {
  return db
    .select()
    .from(ronComplianceChecks)
    .where(eq(ronComplianceChecks.signerId, signerId));
}

export async function updateComplianceCheck(
  checkId: string,
  updates: { result?: ComplianceResult; score?: number; details?: Record<string, unknown> }
) {
  const [check] = await db
    .update(ronComplianceChecks)
    .set(updates)
    .where(eq(ronComplianceChecks.id, checkId))
    .returning();
  return check;
}

export async function checkSignerReadiness(
  signerId: string,
  jurisdiction: string
): Promise<{ ready: boolean; missing: string[]; checks: any[]; alternativeIdvAvailable: boolean; alternativeIdvMethods: { credibleWitness: boolean; personalKnowledge: boolean } }> {
  const rules = getComplianceRules(jurisdiction);
  if (!rules) {
    return {
      ready: false,
      missing: [`Unsupported jurisdiction: ${jurisdiction}`],
      checks: [],
      alternativeIdvAvailable: false,
      alternativeIdvMethods: { credibleWitness: false, personalKnowledge: false },
    };
  }

  const checks = await getSignerComplianceChecks(signerId);
  const missing: string[] = [];

  const checkPassed = (type: string) =>
    checks.some((c) => c.checkType === type && c.result === "pass");

  if (rules.requirements.credentialAnalysisRequired && !checkPassed("credential_analysis")) {
    missing.push("Credential analysis not completed");
  }
  if (rules.requirements.livenessRequired && !checkPassed("liveness")) {
    missing.push("Liveness check not completed");
  }
  if (rules.requirements.kbaRequired && !checkPassed("kba")) {
    missing.push("KBA quiz not passed");
  }
  if (rules.requirements.ofacRequired && !checkPassed("ofac")) {
    missing.push("OFAC screening not completed");
  }
  if (rules.requirements.amlRequired && !checkPassed("aml")) {
    missing.push("AML screening not completed");
  }

  const altIdvRecords = await getAltIdvRecords(signerId);
  const hasCompletedAltIdv = altIdvRecords.some(r => r.status === "completed");

  const altAvailable = rules.alternativeIdvMethods.credibleWitness || rules.alternativeIdvMethods.personalKnowledge;

  return {
    ready: missing.length === 0 || hasCompletedAltIdv,
    missing,
    checks,
    alternativeIdvAvailable: altAvailable,
    alternativeIdvMethods: {
      credibleWitness: rules.alternativeIdvMethods.credibleWitness,
      personalKnowledge: rules.alternativeIdvMethods.personalKnowledge,
    },
  };
}
