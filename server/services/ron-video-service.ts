import { storage } from "../storage";
import { getComplianceRules } from "./ron-compliance-service";
import type { RonVideoRoom, RonRecording } from "@shared/schema";

interface CreateRoomResult {
  room: RonVideoRoom;
  joinUrl: string;
  token: string;
}

interface RecordingResult {
  recording: RonRecording;
  recordingId: string;
}

export async function createVideoRoom(sessionId: string): Promise<CreateRoomResult> {
  const session = await storage.getRonSession(sessionId);
  if (!session) throw new Error("Session not found");

  const existing = await storage.getRonVideoRoom(sessionId);
  if (existing && existing.status !== "closed" && existing.status !== "failed") {
    return {
      room: existing,
      joinUrl: existing.providerRoomUrl || `https://sentinel-ron.daily.co/${existing.providerRoomId}`,
      token: `stub-token-${existing.id}`,
    };
  }

  const providerRoomId = `ron-session-${sessionId}-${Date.now()}`;
  const providerRoomUrl = `https://sentinel-ron.daily.co/${providerRoomId}`;

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 4);

  const room = await storage.createRonVideoRoom({
    sessionId,
    providerRoomId,
    providerRoomUrl,
    provider: "daily",
    status: "ready",
    recordingEnabled: true,
    maxParticipants: 10,
    expiresAt,
    metadata: {
      createdVia: "sentinel_ron_stub",
      note: "Stub video room — connect Daily.co API key for production",
    },
  });

  await storage.updateRonSession(sessionId, {
    videoSessionId: providerRoomId,
    videoProvider: "daily",
  });

  return {
    room,
    joinUrl: providerRoomUrl,
    token: `stub-token-${room.id}`,
  };
}

export async function joinVideoRoom(sessionId: string, participantId: string, participantType: "notary" | "signer"): Promise<{
  joinUrl: string;
  token: string;
  roomId: string;
}> {
  const room = await storage.getRonVideoRoom(sessionId);
  if (!room) throw new Error("No video room exists for this session");
  if (room.status === "closed" || room.status === "failed") {
    throw new Error("Video room is no longer available");
  }

  if (room.status === "ready") {
    await storage.updateRonVideoRoom(room.id, { status: "active", updatedAt: new Date() });
  }

  const token = `stub-${participantType}-token-${participantId}-${Date.now()}`;

  return {
    joinUrl: room.providerRoomUrl || `https://sentinel-ron.daily.co/${room.providerRoomId}`,
    token,
    roomId: room.providerRoomId || room.id,
  };
}

export async function closeVideoRoom(sessionId: string): Promise<RonVideoRoom> {
  const room = await storage.getRonVideoRoom(sessionId);
  if (!room) throw new Error("No video room exists for this session");

  const updated = await storage.updateRonVideoRoom(room.id, {
    status: "closed",
    updatedAt: new Date(),
  });

  return updated;
}

export async function startRecording(sessionId: string, jurisdiction?: string): Promise<RecordingResult> {
  const session = await storage.getRonSession(sessionId);
  if (!session) throw new Error("Session not found");

  let retentionYears = 10;
  if (jurisdiction) {
    const rules = getComplianceRules(jurisdiction);
    if (rules) {
      retentionYears = rules.requirements.recordingRetentionYears;
    }
  }

  const retentionExpiration = new Date();
  retentionExpiration.setFullYear(retentionExpiration.getFullYear() + retentionYears);

  const recordingId = `rec-${sessionId}-${Date.now()}`;
  const encryptionKeyId = `enc-key-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

  const recording = await storage.createRonRecording({
    sessionId,
    status: "recording",
    startedAt: new Date(),
    retentionExpiration,
    format: "webm",
    encryptionKeyId,
    encryptionAlgorithm: "AES-256-GCM",
    metadata: {
      provider: "daily",
      recordingId,
      jurisdiction,
      retentionYears,
      encrypted: true,
      note: "Recording stub — connect Daily.co recording API for production",
    },
  });

  await storage.updateRonSession(sessionId, {
    recordingStatus: "recording",
  });

  return { recording, recordingId };
}

export async function stopRecording(sessionId: string): Promise<RonRecording | null> {
  const recordings = await storage.getRonRecordings(sessionId);
  const activeRecording = recordings.find(r => r.status === "recording");
  if (!activeRecording) return null;

  const duration = activeRecording.startedAt
    ? Math.round((Date.now() - new Date(activeRecording.startedAt).getTime()) / 1000)
    : 0;

  const storageUrl = `https://storage.sentinel-ron.com/recordings/${activeRecording.id}.webm`;
  const storageKey = `recordings/${sessionId}/${activeRecording.id}.webm`;

  const updated = await storage.updateRonRecording(activeRecording.id, {
    status: "completed",
    endedAt: new Date(),
    duration,
    storageUrl,
    storageKey,
    fileSize: Math.round(duration * 500000),
    metadata: {
      ...(typeof activeRecording.metadata === "object" ? activeRecording.metadata : {}),
      finalizedAt: new Date().toISOString(),
      encrypted: true,
    },
  });

  await storage.updateRonSession(sessionId, {
    recordingStatus: "completed",
    recordingUrl: storageUrl,
    recordingDuration: duration,
  });

  return updated;
}

export async function getVideoRoomStatus(sessionId: string): Promise<{
  room: RonVideoRoom | null;
  recordings: RonRecording[];
  isRecording: boolean;
}> {
  const room = await storage.getRonVideoRoom(sessionId);
  const recordings = await storage.getRonRecordings(sessionId);
  const isRecording = recordings.some(r => r.status === "recording");

  return { room: room || null, recordings, isRecording };
}
