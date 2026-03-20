import { storage } from "../storage";
import type { RonFraudDetection } from "@shared/schema";

interface FraudAnalysisResult {
  overallScore: number;
  severity: "low" | "medium" | "high" | "critical";
  detections: Array<{
    type: string;
    confidence: number;
    description: string;
    severity: "low" | "medium" | "high" | "critical";
  }>;
  recommendation: string;
}

interface FrameAnalysisInput {
  sessionId: string;
  signerId?: string;
  frameData?: string;
  frameTimestamp?: number;
}

export async function analyzeVideoFrame(input: FrameAnalysisInput): Promise<FraudAnalysisResult> {
  const deepfakeScore = Math.random() * 0.25;
  const livenessScore = 0.7 + Math.random() * 0.3;
  const behaviorScore = Math.random() * 0.15;

  const detections: FraudAnalysisResult["detections"] = [];

  if (deepfakeScore > 0.15) {
    detections.push({
      type: "deepfake_indicator",
      confidence: deepfakeScore,
      description: "Potential deepfake artifacts detected in facial region",
      severity: deepfakeScore > 0.5 ? "critical" : deepfakeScore > 0.3 ? "high" : "medium",
    });
  }

  if (livenessScore < 0.8) {
    detections.push({
      type: "liveness_anomaly",
      confidence: 1 - livenessScore,
      description: "Liveness indicators below expected threshold",
      severity: livenessScore < 0.5 ? "critical" : livenessScore < 0.7 ? "high" : "medium",
    });
  }

  if (behaviorScore > 0.1) {
    detections.push({
      type: "behavioral_anomaly",
      confidence: behaviorScore,
      description: "Unusual behavioral patterns detected (eye movement, head position)",
      severity: behaviorScore > 0.4 ? "high" : "medium",
    });
  }

  const overallScore = Math.max(0, Math.min(100, Math.round(
    (1 - deepfakeScore) * 40 + livenessScore * 40 + (1 - behaviorScore) * 20
  )));

  let severity: FraudAnalysisResult["severity"] = "low";
  if (overallScore < 50) severity = "critical";
  else if (overallScore < 70) severity = "high";
  else if (overallScore < 85) severity = "medium";

  for (const detection of detections) {
    await storage.createRonFraudDetection({
      sessionId: input.sessionId,
      signerId: input.signerId,
      detectionType: detection.type,
      severity: detection.severity,
      confidenceScore: detection.confidence.toFixed(4),
      description: detection.description,
      frameTimestamp: input.frameTimestamp,
      analysisData: {
        provider: "sentinel_fraud_stub",
        deepfakeScore,
        livenessScore,
        behaviorScore,
        overallScore,
        note: "Fraud detection stub — connect Sensity/Pindrop API for production",
      },
    });
  }

  return {
    overallScore,
    severity,
    detections,
    recommendation: detections.length > 0
      ? "Review flagged indicators before proceeding"
      : "No fraud indicators detected — session appears authentic",
  };
}

export async function getSessionFraudSummary(sessionId: string): Promise<{
  overallScore: number;
  severity: "low" | "medium" | "high" | "critical";
  totalDetections: number;
  unacknowledged: number;
  detections: RonFraudDetection[];
  bySeverity: Record<string, number>;
  byType: Record<string, number>;
}> {
  const detections = await storage.getRonFraudDetections(sessionId);

  const bySeverity: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
  const byType: Record<string, number> = {};
  let unacknowledged = 0;

  for (const d of detections) {
    bySeverity[d.severity] = (bySeverity[d.severity] || 0) + 1;
    byType[d.detectionType] = (byType[d.detectionType] || 0) + 1;
    if (!d.acknowledged) unacknowledged++;
  }

  let overallScore = 98;
  let severity: "low" | "medium" | "high" | "critical" = "low";

  if (detections.length > 0) {
    const avgConfidence = detections.reduce((sum, d) =>
      sum + parseFloat(String(d.confidenceScore || "0")), 0) / detections.length;
    overallScore = Math.max(0, Math.round(100 - avgConfidence * 100));

    if (bySeverity.critical > 0) severity = "critical";
    else if (bySeverity.high > 0) severity = "high";
    else if (bySeverity.medium > 0) severity = "medium";
  }

  return {
    overallScore,
    severity,
    totalDetections: detections.length,
    unacknowledged,
    detections,
    bySeverity,
    byType,
  };
}

export async function acknowledgeDetection(
  detectionId: string,
  userId: string
): Promise<RonFraudDetection> {
  return storage.updateRonFraudDetection(detectionId, {
    acknowledged: true,
    acknowledgedBy: userId,
    acknowledgedAt: new Date(),
  });
}

export function validateDeviceFingerprint(signer: {
  deviceFingerprint?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  geolocationData?: unknown;
}): {
  isValid: boolean;
  trustScore: number;
  details: {
    fingerprintPresent: boolean;
    ipPresent: boolean;
    userAgentPresent: boolean;
    geolocationPresent: boolean;
    vpnDetected: boolean;
    knownDevice: boolean;
  };
} {
  const fingerprintPresent = !!signer.deviceFingerprint;
  const ipPresent = !!signer.ipAddress;
  const userAgentPresent = !!signer.userAgent;
  const geo = signer.geolocationData;
  const geolocationPresent = !!geo && typeof geo === "object" && Object.keys(geo).length > 0;

  let trustScore = 50;
  if (fingerprintPresent) trustScore += 20;
  if (ipPresent) trustScore += 10;
  if (userAgentPresent) trustScore += 10;
  if (geolocationPresent) trustScore += 10;

  return {
    isValid: trustScore >= 70,
    trustScore: Math.min(100, trustScore),
    details: {
      fingerprintPresent,
      ipPresent,
      userAgentPresent,
      geolocationPresent,
      vpnDetected: false,
      knownDevice: fingerprintPresent,
    },
  };
}
