/**
 * Chat Message Parsers
 * 
 * Parses various chat formats into normalized ChatMessage structure:
 * - WhatsApp (txt, json, csv, zip)
 * - iOS SMS/iMessage (csv, json, html)
 * - Android SMS (xml, csv, json)
 */

import fs from 'fs';
import path from 'path';
import { parseStringPromise } from 'xml2js';
import AdmZip from 'adm-zip';
import { nanoid } from 'nanoid';
import type { ChatFormat } from './chatDetector';

// Normalized chat message structure
export interface ChatParticipant {
  id: string;
  display_name?: string | null;
  phone?: string | null;
}

export interface ChatMediaAttachment {
  file_name: string;
  mime_type?: string | null;
  local_path?: string | null;
}

export interface ChatMessageNormalized {
  message_id: string;
  source_type: string;
  source_file_name: string;
  conversation_id: string;
  is_group: boolean;
  participants: ChatParticipant[];
  sender_id?: string | null;
  sender_name?: string | null;
  sender_phone?: string | null;
  sent_at?: Date | null;
  text?: string | null;
  media: ChatMediaAttachment[];
  direction: "inbound" | "outbound" | "unknown";
  raw_metadata: Record<string, any>;
}

/**
 * Main entry point for parsing chat files
 */
export async function parseChatFile(
  filePath: string,
  chatType: ChatFormat
): Promise<ChatMessageNormalized[]> {
  const fileName = path.basename(filePath);
  
  try {
    switch (chatType) {
      case "whatsapp_txt":
        return parseWhatsAppTxt(filePath, fileName);
      case "whatsapp_json":
        return parseWhatsAppJson(filePath, fileName);
      case "whatsapp_csv":
        return parseWhatsAppCsv(filePath, fileName);
      case "whatsapp_zip":
        return parseWhatsAppZip(filePath, fileName);
      case "sms_android_xml":
        return parseSmsAndroidXml(filePath, fileName);
      case "sms_ios_csv":
        return parseSmsIosCsv(filePath, fileName);
      case "sms_ios_json":
        return parseSmsIosJson(filePath, fileName);
      case "sms_ios_html":
        return parseSmsIosHtml(filePath, fileName);
      case "generic_chat_json":
        return parseGenericChatJson(filePath, fileName);
      default:
        console.warn(`[ChatParser] Unsupported chat type: ${chatType}`);
        return [];
    }
  } catch (error) {
    console.error(`[ChatParser] Error parsing ${chatType} file:`, error);
    return [];
  }
}

/**
 * Parse WhatsApp text export
 * Supports multiple formats:
 * - Format 1: "1/15/24, 10:30 AM - Sender Name: Message text"
 * - Format 2: "[10/19/25, 8:41:27PM] Sender Name: Message text"
 * - Format 3: "[10/19/25, 8:41:27 PM] ~Sender Name: Message text"
 */
function parseWhatsAppTxt(filePath: string, fileName: string): ChatMessageNormalized[] {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const messages: ChatMessageNormalized[] = [];
  
  // WhatsApp text patterns - try multiple formats
  // Pattern 1: Standard format "1/15/24, 10:30 AM - Sender Name: Message text"
  const pattern1 = /^(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2})\s+(AM|PM)?\s*-\s*([^:]+):\s*(.*)$/;
  
  // Pattern 2: Bracketed format "[10/19/25, 8:41:27PM] Sender Name: Message text"
  const pattern2 = /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?)\s*(AM|PM)?\]\s*(.+?):\s*(.*)$/;
  
  // Pattern 3: Bracketed with tilde prefix "[10/19/25, 8:41:27 PM] ~Sender Name: Message text"
  const pattern3 = /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?)\s*(AM|PM)?\]\s*~?(.+?):\s*(.*)$/;
  
  // Stable conversation ID based on file name
  const conversationId = `wa_${fileName.replace(/[^a-zA-Z0-9]/g, '_')}`;
  let messageIndex = 0;
  
  let currentMessage: ChatMessageNormalized | null = null;
  const participants = new Set<string>();
  
  for (const line of lines) {
    // Try all patterns
    let match = line.match(pattern2) || line.match(pattern3) || line.match(pattern1);
    
    if (match) {
      // Save previous message
      if (currentMessage) {
        messages.push(currentMessage);
      }
      
      const [, date, time, period, sender, text] = match;
      const timestamp = parseWhatsAppTimestampEnhanced(date, time, period);
      
      // Clean up sender name (remove tilde prefix if present)
      const cleanSender = sender.trim().replace(/^~/, '');
      participants.add(cleanSender);
      
      messageIndex++;
      
      currentMessage = {
        message_id: nanoid(),
        source_type: "whatsapp",
        source_file_name: fileName,
        conversation_id: conversationId,
        is_group: false, // Will update if we see multiple participants
        participants: [],
        sender_id: cleanSender,
        sender_name: cleanSender,
        sender_phone: null,
        sent_at: timestamp,
        text: text.trim(),
        media: [],
        direction: "unknown",
        raw_metadata: { date, time, period, messageIndex },
      };
    } else if (currentMessage && line.trim()) {
      // Continuation of previous message (multi-line messages)
      currentMessage.text = (currentMessage.text || '') + '\n' + line.trim();
    }
  }
  
  // Save last message
  if (currentMessage) {
    messages.push(currentMessage);
  }
  
  // Update participants and group status
  const participantList: ChatParticipant[] = Array.from(participants).map(name => ({
    id: name,
    display_name: name,
    phone: null,
  }));
  
  // A group chat is when there are more than 2 participants
  const isGroup = participants.size > 2;
  
  // Extract conversation name from first system message or file name
  let conversationName = fileName.replace('.txt', '').replace(/_/g, ' ');
  const firstMessage = messages[0];
  if (firstMessage && firstMessage.text?.includes('created group')) {
    const groupMatch = firstMessage.text.match(/created group "([^"]+)"/);
    if (groupMatch) {
      conversationName = groupMatch[1];
    }
  }
  
  // Update all messages with participant info
  messages.forEach((msg, idx) => {
    msg.participants = participantList;
    msg.is_group = isGroup;
    msg.raw_metadata.conversationName = conversationName;
    msg.raw_metadata.messageIndex = idx + 1;
    msg.raw_metadata.totalMessages = messages.length;
  });
  
  console.log(`[ChatParser] Parsed ${messages.length} messages from WhatsApp export: ${fileName}`);
  
  return messages;
}

/**
 * Enhanced WhatsApp timestamp parser supporting multiple formats
 */
function parseWhatsAppTimestampEnhanced(date: string, time: string, period?: string): Date | null {
  try {
    const [month, day, year] = date.split('/').map(Number);
    const fullYear = year < 100 ? 2000 + year : year;
    
    // Handle time with or without seconds
    const timeParts = time.split(':').map(Number);
    let hours = timeParts[0];
    const minutes = timeParts[1];
    const seconds = timeParts[2] || 0;
    
    if (period) {
      const periodUpper = period.toUpperCase();
      if (periodUpper === 'PM' && hours !== 12) hours += 12;
      if (periodUpper === 'AM' && hours === 12) hours = 0;
    }
    
    return new Date(fullYear, month - 1, day, hours, minutes, seconds);
  } catch {
    return null;
  }
}

/**
 * Parse WhatsApp timestamp
 */
function parseWhatsAppTimestamp(date: string, time: string, period?: string): Date | null {
  try {
    const [month, day, year] = date.split('/').map(Number);
    const fullYear = year < 100 ? 2000 + year : year;
    
    let [hours, minutes] = time.split(':').map(Number);
    
    if (period) {
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
    }
    
    return new Date(fullYear, month - 1, day, hours, minutes);
  } catch {
    return null;
  }
}

/**
 * Parse WhatsApp JSON export
 */
function parseWhatsAppJson(filePath: string, fileName: string): ChatMessageNormalized[] {
  const content = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(content);
  
  const messagesArray = Array.isArray(data) ? data : data.messages || [];
  const participants = new Set<string>();
  
  const messages: ChatMessageNormalized[] = messagesArray.map((msg: any) => {
    const sender = msg.from || msg.sender || msg.author || 'Unknown';
    participants.add(sender);
    
    return {
      message_id: msg.id || nanoid(),
      source_type: "whatsapp",
      source_file_name: fileName,
      conversation_id: msg.chat_id || msg.conversation_id || `wa_${fileName}`,
      is_group: msg.is_group || false,
      participants: [],
      sender_id: sender,
      sender_name: sender,
      sender_phone: msg.phone || null,
      sent_at: msg.timestamp || msg.date ? new Date(msg.timestamp || msg.date) : null,
      text: msg.text || msg.message || msg.body || null,
      media: parseMediaAttachments(msg),
      direction: "unknown",
      raw_metadata: msg,
    };
  });
  
  // Update participants
  const participantList: ChatParticipant[] = Array.from(participants).map(name => ({
    id: name,
    display_name: name,
    phone: null,
  }));
  
  messages.forEach(msg => {
    msg.participants = participantList;
  });
  
  return messages;
}

/**
 * Parse WhatsApp CSV export
 */
function parseWhatsAppCsv(filePath: string, fileName: string): ChatMessageNormalized[] {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  if (lines.length === 0) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const messages: ChatMessageNormalized[] = [];
  const participants = new Set<string>();
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0) continue;
    
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] || '';
    });
    
    const sender = row.sender || row.from || row.author || 'Unknown';
    participants.add(sender);
    
    messages.push({
      message_id: row.id || nanoid(),
      source_type: "whatsapp",
      source_file_name: fileName,
      conversation_id: row.chat_id || `wa_${fileName}`,
      is_group: row.is_group === 'true' || row.is_group === '1',
      participants: [],
      sender_id: sender,
      sender_name: sender,
      sender_phone: row.phone || null,
      sent_at: row.timestamp || row.date ? new Date(row.timestamp || row.date) : null,
      text: row.message || row.text || row.body || null,
      media: [],
      direction: "unknown",
      raw_metadata: row,
    });
  }
  
  // Update participants
  const participantList: ChatParticipant[] = Array.from(participants).map(name => ({
    id: name,
    display_name: name,
    phone: null,
  }));
  
  messages.forEach(msg => {
    msg.participants = participantList;
  });
  
  return messages;
}

/**
 * Parse WhatsApp ZIP archive (contains txt/json plus media files)
 */
function parseWhatsAppZip(filePath: string, fileName: string): ChatMessageNormalized[] {
  const zip = new AdmZip(filePath);
  const zipEntries = zip.getEntries();
  
  // Find the main chat file (txt or json)
  const chatFile = zipEntries.find((entry: AdmZip.IZipEntry) => 
    entry.entryName.endsWith('.txt') || entry.entryName.endsWith('.json')
  );
  
  if (!chatFile) {
    console.warn(`[ChatParser] No chat file found in ZIP: ${fileName}`);
    return [];
  }
  
  // Extract chat file temporarily
  const tempDir = `/tmp/chat_${nanoid()}`;
  fs.mkdirSync(tempDir, { recursive: true });
  const tempFilePath = path.join(tempDir, chatFile.entryName);
  fs.writeFileSync(tempFilePath, chatFile.getData());
  
  // Parse based on file type
  const messages = chatFile.entryName.endsWith('.txt')
    ? parseWhatsAppTxt(tempFilePath, fileName)
    : parseWhatsAppJson(tempFilePath, fileName);
  
  // TODO: Extract media files and link to messages
  // For now, just list media files in metadata
  const mediaFiles = zipEntries
    .filter((entry: AdmZip.IZipEntry) => !entry.entryName.endsWith('.txt') && !entry.entryName.endsWith('.json'))
    .map((entry: AdmZip.IZipEntry) => entry.entryName);
  
  messages.forEach(msg => {
    msg.raw_metadata.available_media = mediaFiles;
  });
  
  // Cleanup
  fs.rmSync(tempDir, { recursive: true, force: true });
  
  return messages;
}

/**
 * Parse Android SMS Backup & Restore XML
 */
async function parseSmsAndroidXml(filePath: string, fileName: string): Promise<ChatMessageNormalized[]> {
  const content = fs.readFileSync(filePath, 'utf8');
  const result = await parseStringPromise(content);
  
  if (!result.smses || !result.smses.sms) {
    return [];
  }
  
  const smsArray = result.smses.sms;
  const messages: ChatMessageNormalized[] = [];
  const conversations = new Map<string, Set<string>>();
  
  for (const sms of smsArray) {
    const attrs = sms.$;
    const address = attrs.address || 'Unknown';
    const threadId = attrs.thread_id || nanoid(8);
    const type = attrs.type; // 1=received, 2=sent
    
    // Track participants per conversation
    if (!conversations.has(threadId)) {
      conversations.set(threadId, new Set());
    }
    conversations.get(threadId)!.add(address);
    
    messages.push({
      message_id: nanoid(),
      source_type: "sms_android",
      source_file_name: fileName,
      conversation_id: `sms_android_${threadId}`,
      is_group: false,
      participants: [],
      sender_id: type === '2' ? 'me' : address,
      sender_name: type === '2' ? 'Me' : attrs.contact_name || address,
      sender_phone: address,
      sent_at: attrs.date ? new Date(parseInt(attrs.date)) : null,
      text: attrs.body || null,
      media: [],
      direction: type === '2' ? 'outbound' : 'inbound',
      raw_metadata: attrs,
    });
  }
  
  // Update participants for each conversation
  messages.forEach(msg => {
    const participants = conversations.get(msg.conversation_id.replace('sms_android_', ''));
    if (participants) {
      msg.participants = Array.from(participants).map(phone => ({
        id: phone,
        display_name: null,
        phone,
      }));
    }
  });
  
  return messages;
}

/**
 * Parse iOS SMS/iMessage CSV export
 */
function parseSmsIosCsv(filePath: string, fileName: string): ChatMessageNormalized[] {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  if (lines.length === 0) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const messages: ChatMessageNormalized[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0) continue;
    
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] || '';
    });
    
    const isFromMe = row.is_from_me === 'true' || row.is_from_me === '1';
    const address = row.address || row.phone || row.contact || 'Unknown';
    
    messages.push({
      message_id: row.id || nanoid(),
      source_type: row.service === 'iMessage' ? 'imessage' : 'sms_ios',
      source_file_name: fileName,
      conversation_id: row.chat_id || `ios_${address}`,
      is_group: row.is_group_message === 'true' || row.is_group_message === '1',
      participants: [
        { id: 'me', display_name: 'Me', phone: null },
        { id: address, display_name: row.contact_name || null, phone: address },
      ],
      sender_id: isFromMe ? 'me' : address,
      sender_name: isFromMe ? 'Me' : (row.contact_name || address),
      sender_phone: isFromMe ? null : address,
      sent_at: row.date || row.timestamp ? new Date(row.date || row.timestamp) : null,
      text: row.text || row.message || null,
      media: [],
      direction: isFromMe ? 'outbound' : 'inbound',
      raw_metadata: row,
    });
  }
  
  return messages;
}

/**
 * Parse iOS SMS/iMessage JSON export
 */
function parseSmsIosJson(filePath: string, fileName: string): ChatMessageNormalized[] {
  const content = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(content);
  
  const messagesArray = Array.isArray(data) ? data : data.messages || [];
  
  return messagesArray.map((msg: any) => {
    const isFromMe = msg.is_from_me || msg.direction === 'outbound';
    const address = msg.address || msg.phone || msg.handle || 'Unknown';
    
    return {
      message_id: msg.id || nanoid(),
      source_type: msg.service === 'iMessage' ? 'imessage' : 'sms_ios',
      source_file_name: fileName,
      conversation_id: msg.chat_id || `ios_${address}`,
      is_group: msg.is_group || msg.is_group_message || false,
      participants: [
        { id: 'me', display_name: 'Me', phone: null },
        { id: address, display_name: msg.contact_name || null, phone: address },
      ],
      sender_id: isFromMe ? 'me' : address,
      sender_name: isFromMe ? 'Me' : (msg.contact_name || address),
      sender_phone: isFromMe ? null : address,
      sent_at: msg.date || msg.timestamp ? new Date(msg.date || msg.timestamp) : null,
      text: msg.text || msg.message || null,
      media: parseMediaAttachments(msg),
      direction: isFromMe ? 'outbound' : 'inbound',
      raw_metadata: msg,
    };
  });
}

/**
 * Parse iOS SMS/iMessage HTML export
 */
function parseSmsIosHtml(filePath: string, fileName: string): ChatMessageNormalized[] {
  // TODO: Implement HTML parsing using jsdom
  // For now, return empty array with a note
  console.warn(`[ChatParser] HTML parsing not yet fully implemented for: ${fileName}`);
  return [];
}

/**
 * Parse generic chat JSON format
 */
function parseGenericChatJson(filePath: string, fileName: string): ChatMessageNormalized[] {
  const content = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(content);
  
  const messagesArray = Array.isArray(data) ? data : data.messages || [];
  const participants = new Set<string>();
  
  const messages: ChatMessageNormalized[] = messagesArray.map((msg: any) => {
    const sender = msg.sender || msg.from || msg.user || msg.author || 'Unknown';
    participants.add(sender);
    
    return {
      message_id: msg.id || msg.message_id || nanoid(),
      source_type: "other_chat",
      source_file_name: fileName,
      conversation_id: msg.conversation_id || msg.chat_id || msg.channel || `chat_${fileName}`,
      is_group: msg.is_group || false,
      participants: [],
      sender_id: sender,
      sender_name: msg.sender_name || sender,
      sender_phone: msg.phone || null,
      sent_at: msg.date || msg.timestamp || msg.time ? new Date(msg.date || msg.timestamp || msg.time) : null,
      text: msg.message || msg.text || msg.content || msg.body || null,
      media: parseMediaAttachments(msg),
      direction: msg.direction || "unknown",
      raw_metadata: msg,
    };
  });
  
  // Update participants
  const participantList: ChatParticipant[] = Array.from(participants).map(name => ({
    id: name,
    display_name: name,
    phone: null,
  }));
  
  messages.forEach(msg => {
    msg.participants = participantList;
  });
  
  return messages;
}

// Helper functions

/**
 * Parse media attachments from message object
 */
function parseMediaAttachments(msg: any): ChatMediaAttachment[] {
  const media: ChatMediaAttachment[] = [];
  
  if (msg.attachments && Array.isArray(msg.attachments)) {
    media.push(...msg.attachments.map((att: any) => ({
      file_name: att.filename || att.name || att.file_name || 'unknown',
      mime_type: att.mime_type || att.type || null,
      local_path: att.path || att.url || null,
    })));
  }
  
  if (msg.media_path || msg.attachment_path) {
    media.push({
      file_name: path.basename(msg.media_path || msg.attachment_path),
      mime_type: null,
      local_path: msg.media_path || msg.attachment_path,
    });
  }
  
  return media;
}

/**
 * Parse CSV line with proper quote handling
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}
