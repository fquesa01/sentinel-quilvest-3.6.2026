import { db } from "./db";
import * as schema from "@shared/schema";
import { desc, and, eq } from "drizzle-orm";

interface ParticipantKey {
  id: string;
  displayName: string | null;
  type: "email" | "chat";
}

interface CommunicationSummary {
  participantId: string;
  displayName: string | null;
  channels: string[];
  sentCount: number;
  receivedCount: number;
  totalCount: number;
  percentOfTotal: number;
  firstActivityAt: Date | null;
  lastActivityAt: Date | null;
}

interface MatrixCell {
  total: number;
  email: number;
  chat: number;
}

interface CommunicationMatrix {
  participants: Array<{ id: string; displayName: string | null }>;
  matrix: MatrixCell[][];
  maxTotal: number;
}

interface TimelineEvent {
  id: string;
  channelType: "email" | "chat";
  channelSubtype: string;
  sentAt: string;
  senderDisplay: string;
  recipientsDisplay: string[];
  subjectOrPreview: string;
  hasAttachments: boolean;
  direction: "inbound" | "outbound" | "unknown";
}

/**
 * Extract participant keys from an email
 */
function getParticipantKeysFromEmail(comm: any): ParticipantKey[] {
  const participants: ParticipantKey[] = [];
  
  if (comm.sender) {
    participants.push({
      id: `email:${comm.sender}`,
      displayName: comm.sender,
      type: "email"
    });
  }
  
  // Parse recipients (can be string or array)
  let recipients: string[] = [];
  if (typeof comm.recipients === "string") {
    recipients = comm.recipients.split(",").map(r => r.trim()).filter(Boolean);
  } else if (Array.isArray(comm.recipients)) {
    recipients = comm.recipients;
  }
  
  recipients.forEach(recipient => {
    if (recipient) {
      participants.push({
        id: `email:${recipient}`,
        displayName: recipient,
        type: "email"
      });
    }
  });
  
  return participants;
}

/**
 * Extract participant key from a chat message
 */
function getParticipantKeyFromChat(chatMsg: any): ParticipantKey {
  const displayName = chatMsg.senderName || chatMsg.senderPhone || chatMsg.senderId || "Unknown";
  const id = chatMsg.senderId || chatMsg.senderPhone || `chat:${chatMsg.messageId}`;
  
  return {
    id: `chat:${id}`,
    displayName,
    type: "chat"
  };
}

/**
 * Build communication summary across emails and chats
 */
export async function buildCommunicationSummary(
  minMessages: number = 1,
  caseId?: string
): Promise<CommunicationSummary[]> {
  // Fetch emails
  let emailQuery = db.select().from(schema.communications);
  if (caseId) {
    emailQuery = emailQuery.where(eq(schema.communications.caseId, caseId)) as any;
  }
  const emails = await emailQuery;
  
  // Fetch chats
  let chatQuery = db.select().from(schema.ingestedChatMessages);
  if (caseId) {
    chatQuery = chatQuery.where(eq(schema.ingestedChatMessages.caseId, caseId)) as any;
  }
  const chats = await chatQuery;
  
  // Build participant map
  const participantMap = new Map<string, {
    displayName: string | null;
    channels: Set<string>;
    sentCount: number;
    receivedCount: number;
    firstActivityAt: Date | null;
    lastActivityAt: Date | null;
  }>();
  
  // Process emails
  for (const email of emails) {
    const timestamp = email.timestamp ? new Date(email.timestamp) : null;
    const sender = email.sender ? `email:${email.sender}` : null;
    
    // Update sender
    if (sender) {
      if (!participantMap.has(sender)) {
        participantMap.set(sender, {
          displayName: email.sender,
          channels: new Set(["email"]),
          sentCount: 0,
          receivedCount: 0,
          firstActivityAt: timestamp,
          lastActivityAt: timestamp
        });
      }
      const senderData = participantMap.get(sender)!;
      senderData.sentCount++;
      senderData.channels.add("email");
      if (timestamp) {
        if (!senderData.firstActivityAt || timestamp < senderData.firstActivityAt) {
          senderData.firstActivityAt = timestamp;
        }
        if (!senderData.lastActivityAt || timestamp > senderData.lastActivityAt) {
          senderData.lastActivityAt = timestamp;
        }
      }
    }
    
    // Update recipients
    let recipients: string[] = [];
    if (typeof email.recipients === "string") {
      recipients = email.recipients.split(",").map(r => r.trim()).filter(Boolean);
    } else if (Array.isArray(email.recipients)) {
      recipients = email.recipients;
    }
    
    recipients.forEach(recipient => {
      const recipientKey = `email:${recipient}`;
      if (!participantMap.has(recipientKey)) {
        participantMap.set(recipientKey, {
          displayName: recipient,
          channels: new Set(["email"]),
          sentCount: 0,
          receivedCount: 0,
          firstActivityAt: timestamp,
          lastActivityAt: timestamp
        });
      }
      const recipientData = participantMap.get(recipientKey)!;
      recipientData.receivedCount++;
      recipientData.channels.add("email");
      if (timestamp) {
        if (!recipientData.firstActivityAt || timestamp < recipientData.firstActivityAt) {
          recipientData.firstActivityAt = timestamp;
        }
        if (!recipientData.lastActivityAt || timestamp > recipientData.lastActivityAt) {
          recipientData.lastActivityAt = timestamp;
        }
      }
    });
  }
  
  // Process chats
  for (const chat of chats) {
    const timestamp = chat.sentAt ? new Date(chat.sentAt) : null;
    const channelType = chat.sourceType || "chat";
    
    const senderId = chat.senderId || chat.senderPhone || `chat:${chat.messageId}`;
    const senderKey = `chat:${senderId}`;
    const senderName = chat.senderName || chat.senderPhone || "Unknown";
    
    if (!participantMap.has(senderKey)) {
      participantMap.set(senderKey, {
        displayName: senderName,
        channels: new Set([channelType]),
        sentCount: 0,
        receivedCount: 0,
        firstActivityAt: timestamp,
        lastActivityAt: timestamp
      });
    }
    
    const senderData = participantMap.get(senderKey)!;
    senderData.sentCount++;
    senderData.channels.add(channelType);
    if (timestamp) {
      if (!senderData.firstActivityAt || timestamp < senderData.firstActivityAt) {
        senderData.firstActivityAt = timestamp;
      }
      if (!senderData.lastActivityAt || timestamp > senderData.lastActivityAt) {
        senderData.lastActivityAt = timestamp;
      }
    }
    
    // For group chats, all other participants are receivers
    if (chat.participants && Array.isArray(chat.participants)) {
      chat.participants.forEach((participant: string) => {
        if (participant !== senderId) {
          const participantKey = `chat:${participant}`;
          if (!participantMap.has(participantKey)) {
            participantMap.set(participantKey, {
              displayName: participant,
              channels: new Set([channelType]),
              sentCount: 0,
              receivedCount: 0,
              firstActivityAt: timestamp,
              lastActivityAt: timestamp
            });
          }
          const participantData = participantMap.get(participantKey)!;
          participantData.receivedCount++;
          participantData.channels.add(channelType);
        }
      });
    }
  }
  
  // Convert to array and calculate totals
  const totalMessages = emails.length + chats.length;
  const results: CommunicationSummary[] = [];
  
  participantMap.forEach((data, participantId) => {
    const totalCount = data.sentCount + data.receivedCount;
    if (totalCount >= minMessages) {
      results.push({
        participantId,
        displayName: data.displayName,
        channels: Array.from(data.channels),
        sentCount: data.sentCount,
        receivedCount: data.receivedCount,
        totalCount,
        percentOfTotal: totalMessages > 0 ? (totalCount / totalMessages) * 100 : 0,
        firstActivityAt: data.firstActivityAt,
        lastActivityAt: data.lastActivityAt
      });
    }
  });
  
  // Sort by total count descending
  results.sort((a, b) => b.totalCount - a.totalCount);
  
  return results;
}

/**
 * Build communication matrix (heatmap data)
 */
export async function buildCommunicationMatrix(
  topN: number = 10,
  caseId?: string
): Promise<CommunicationMatrix> {
  // Get top communicators
  const summary = await buildCommunicationSummary(1, caseId);
  const topParticipants = summary.slice(0, topN);
  
  // Fetch data
  let emailQuery = db.select().from(schema.communications);
  if (caseId) {
    emailQuery = emailQuery.where(eq(schema.communications.caseId, caseId)) as any;
  }
  const emails = await emailQuery;
  
  let chatQuery = db.select().from(schema.ingestedChatMessages);
  if (caseId) {
    chatQuery = chatQuery.where(eq(schema.ingestedChatMessages.caseId, caseId)) as any;
  }
  const chats = await chatQuery;
  
  // Create participant ID to index map
  const participantIndexMap = new Map<string, number>();
  topParticipants.forEach((p, i) => {
    participantIndexMap.set(p.participantId, i);
  });
  
  // Initialize matrix
  const n = topParticipants.length;
  const matrix: MatrixCell[][] = Array(n).fill(null).map(() =>
    Array(n).fill(null).map(() => ({ total: 0, email: 0, chat: 0 }))
  );
  
  // Process emails
  for (const email of emails) {
    const sender = email.sender ? `email:${email.sender}` : null;
    const senderIdx = sender ? participantIndexMap.get(sender) : undefined;
    
    if (senderIdx !== undefined) {
      let recipients: string[] = [];
      if (typeof email.recipients === "string") {
        recipients = email.recipients.split(",").map(r => r.trim()).filter(Boolean);
      } else if (Array.isArray(email.recipients)) {
        recipients = email.recipients;
      }
      
      recipients.forEach(recipient => {
        const recipientKey = `email:${recipient}`;
        const recipientIdx = participantIndexMap.get(recipientKey);
        
        if (recipientIdx !== undefined) {
          matrix[senderIdx][recipientIdx].email++;
          matrix[senderIdx][recipientIdx].total++;
        }
      });
    }
  }
  
  // Process chats
  for (const chat of chats) {
    const senderId = chat.senderId || chat.senderPhone || `chat:${chat.messageId}`;
    const senderKey = `chat:${senderId}`;
    const senderIdx = participantIndexMap.get(senderKey);
    
    if (senderIdx !== undefined && chat.participants && Array.isArray(chat.participants)) {
      chat.participants.forEach((participant: string) => {
        if (participant !== senderId) {
          const participantKey = `chat:${participant}`;
          const participantIdx = participantIndexMap.get(participantKey);
          
          if (participantIdx !== undefined) {
            matrix[senderIdx][participantIdx].chat++;
            matrix[senderIdx][participantIdx].total++;
          }
        }
      });
    }
  }
  
  // Find max total for scaling
  let maxTotal = 0;
  matrix.forEach(row => {
    row.forEach(cell => {
      if (cell.total > maxTotal) {
        maxTotal = cell.total;
      }
    });
  });
  
  return {
    participants: topParticipants.map(p => ({
      id: p.participantId,
      displayName: p.displayName
    })),
    matrix,
    maxTotal
  };
}

/**
 * Build unified timeline
 */
export async function buildUnifiedTimeline(
  channelType: "all" | "email" | "chat" = "all",
  limit: number = 200,
  caseId?: string
): Promise<TimelineEvent[]> {
  const events: TimelineEvent[] = [];
  
  // Fetch emails if needed
  if (channelType === "all" || channelType === "email") {
    let emailQuery = db.select().from(schema.communications).orderBy(desc(schema.communications.timestamp)).limit(limit);
    if (caseId) {
      emailQuery = db.select().from(schema.communications)
        .where(eq(schema.communications.caseId, caseId))
        .orderBy(desc(schema.communications.timestamp))
        .limit(limit) as any;
    }
    const emails = await emailQuery;
    
    emails.forEach(email => {
      let recipients: string[] = [];
      if (typeof email.recipients === "string") {
        recipients = email.recipients.split(",").map(r => r.trim()).filter(Boolean);
      } else if (Array.isArray(email.recipients)) {
        recipients = email.recipients;
      }
      
      events.push({
        id: email.id,
        channelType: "email",
        channelSubtype: "email",
        sentAt: email.timestamp ? new Date(email.timestamp).toISOString() : new Date().toISOString(),
        senderDisplay: email.sender || "Unknown",
        recipientsDisplay: recipients,
        subjectOrPreview: email.subject || (email.body ? email.body.substring(0, 100) : ""),
        hasAttachments: false, // Can be enhanced later
        direction: "unknown"
      });
    });
  }
  
  // Fetch chats if needed
  if (channelType === "all" || channelType === "chat") {
    let chatQuery = db.select().from(schema.ingestedChatMessages).orderBy(desc(schema.ingestedChatMessages.sentAt)).limit(limit);
    if (caseId) {
      chatQuery = db.select().from(schema.ingestedChatMessages)
        .where(eq(schema.ingestedChatMessages.caseId, caseId))
        .orderBy(desc(schema.ingestedChatMessages.sentAt))
        .limit(limit) as any;
    }
    const chats = await chatQuery;
    
    chats.forEach(chat => {
      const recipients = chat.participants && Array.isArray(chat.participants) 
        ? chat.participants.filter(p => p !== (chat.senderId || chat.senderPhone))
        : [];
      
      events.push({
        id: chat.id,
        channelType: "chat",
        channelSubtype: chat.sourceType || "other_chat",
        sentAt: chat.sentAt ? new Date(chat.sentAt).toISOString() : new Date().toISOString(),
        senderDisplay: chat.senderName || chat.senderPhone || "Unknown",
        recipientsDisplay: recipients,
        subjectOrPreview: chat.text ? chat.text.substring(0, 100) : "",
        hasAttachments: chat.mediaAttachments && Array.isArray(chat.mediaAttachments) && chat.mediaAttachments.length > 0,
        direction: chat.direction || "unknown"
      });
    });
  }
  
  // Sort by timestamp descending
  events.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
  
  // Apply limit
  return events.slice(0, limit);
}
