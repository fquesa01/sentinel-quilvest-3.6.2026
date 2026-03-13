import { db } from "../db";
import { eq, and } from "drizzle-orm";
import { ronComplianceChecks, ronSigners } from "@shared/schema";
import type { InsertRonComplianceCheck, RonComplianceCheck } from "@shared/schema";

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
  },
};

export function getComplianceRules(state: string): StateComplianceRule | null {
  return stateComplianceRules[state.toUpperCase()] || null;
}

export function getAllSupportedStates(): StateComplianceRule[] {
  return Object.values(stateComplianceRules);
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
      result = "pending";
      details = {
        provider: "sentinel_ron_stub",
        questionsGenerated: 5,
        note: "KBA quiz stub — connect to credit bureau for production",
      };
      break;
    }
    case "credential_analysis": {
      result = "pending";
      details = {
        provider: "sentinel_ron_stub",
        note: "Credential analysis stub — connect to Jumio/Onfido for production",
      };
      break;
    }
    case "liveness": {
      result = "pending";
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
): Promise<{ ready: boolean; missing: string[]; checks: any[] }> {
  const rules = getComplianceRules(jurisdiction);
  if (!rules) {
    return { ready: false, missing: [`Unsupported jurisdiction: ${jurisdiction}`], checks: [] };
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

  return {
    ready: missing.length === 0,
    missing,
    checks,
  };
}
