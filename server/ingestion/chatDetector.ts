/**
 * Chat Format Detector
 * 
 * Detects various chat message formats:
 * - WhatsApp (txt, json, csv, zip)
 * - iOS SMS/iMessage (csv, json, html)
 * - Android SMS (xml, csv, json)
 * - Other chat formats
 */

import fs from 'fs';
import path from 'path';

export type ChatFormat = 
  | "whatsapp_txt"
  | "whatsapp_json"
  | "whatsapp_csv"
  | "whatsapp_zip"
  | "sms_android_xml"
  | "sms_ios_csv"
  | "sms_ios_json"
  | "sms_ios_html"
  | "generic_chat_json"
  | null;

/**
 * Detect chat format from file path and optional MIME type
 */
export function detectChatType(filePath: string, mimeType?: string | null): ChatFormat {
  const ext = path.extname(filePath).toLowerCase();
  const fileName = path.basename(filePath).toLowerCase();
  
  // Read a small sample of the file for content sniffing
  let content = '';
  try {
    // Read first 2KB for detection
    const buffer = Buffer.alloc(2048);
    const fd = fs.openSync(filePath, 'r');
    const bytesRead = fs.readSync(fd, buffer, 0, 2048, 0);
    fs.closeSync(fd);
    content = buffer.toString('utf8', 0, bytesRead);
  } catch (error) {
    // If we can't read the file, rely on extension only
    console.warn(`[ChatDetector] Could not read file for content sniffing: ${filePath}`);
  }

  // WhatsApp detection
  if (ext === '.txt' && isWhatsAppText(content)) {
    return "whatsapp_txt";
  }
  
  if (ext === '.zip' && (fileName.includes('whatsapp') || fileName.includes('wa'))) {
    return "whatsapp_zip";
  }

  // JSON files - need content analysis
  if (ext === '.json') {
    if (isWhatsAppJson(content)) {
      return "whatsapp_json";
    }
    if (isiOSMessagesJson(content)) {
      return "sms_ios_json";
    }
    if (isGenericChatJson(content)) {
      return "generic_chat_json";
    }
  }

  // CSV files - check content patterns
  if (ext === '.csv') {
    if (isWhatsAppCsv(content)) {
      return "whatsapp_csv";
    }
    if (isiOSMessagesCsv(content)) {
      return "sms_ios_csv";
    }
  }

  // Android SMS Backup & Restore XML
  if (ext === '.xml' && isAndroidSmsXml(content)) {
    return "sms_android_xml";
  }

  // iOS HTML export
  if (ext === '.html' && isiOSMessagesHtml(content)) {
    return "sms_ios_html";
  }

  return null;
}

/**
 * Detect WhatsApp text export format
 * Pattern: "1/15/24, 10:30 AM - Sender Name: Message text"
 */
function isWhatsAppText(content: string): boolean {
  if (!content) return false;
  
  // WhatsApp text exports have lines matching this pattern
  const whatsappPattern = /^\d{1,2}\/\d{1,2}\/\d{2,4},?\s+\d{1,2}:\d{2}\s+(AM|PM)?\s*-\s*.+?:/m;
  return whatsappPattern.test(content);
}

/**
 * Detect WhatsApp JSON export
 */
function isWhatsAppJson(content: string): boolean {
  if (!content) return false;
  
  try {
    const data = JSON.parse(content);
    
    // Check for WhatsApp JSON structure
    if (Array.isArray(data)) {
      const firstMsg = data[0];
      return firstMsg && (
        ('timestamp' in firstMsg && 'from' in firstMsg && 'text' in firstMsg) ||
        ('date' in firstMsg && 'sender' in firstMsg && 'message' in firstMsg)
      );
    }
    
    // Some WhatsApp exports wrap messages in an object
    if (data.messages && Array.isArray(data.messages)) {
      return true;
    }
  } catch {
    return false;
  }
  
  return false;
}

/**
 * Detect WhatsApp CSV export
 */
function isWhatsAppCsv(content: string): boolean {
  if (!content) return false;
  
  const lowerContent = content.toLowerCase();
  const firstLine = content.split('\n')[0]?.toLowerCase() || '';
  
  // Check for WhatsApp-specific CSV headers
  return (
    (firstLine.includes('timestamp') || firstLine.includes('date')) &&
    (firstLine.includes('sender') || firstLine.includes('from')) &&
    (firstLine.includes('message') || firstLine.includes('text'))
  );
}

/**
 * Detect Android SMS Backup & Restore XML format
 * Root element is <smses> with <sms> children
 */
function isAndroidSmsXml(content: string): boolean {
  if (!content) return false;
  
  return content.includes('<smses') && content.includes('<sms ');
}

/**
 * Detect iOS Messages CSV export
 */
function isiOSMessagesCsv(content: string): boolean {
  if (!content) return false;
  
  const firstLine = content.split('\n')[0]?.toLowerCase() || '';
  
  // iOS CSV exports often have these fields
  return (
    (firstLine.includes('date') || firstLine.includes('timestamp')) &&
    (firstLine.includes('is_from_me') || firstLine.includes('direction')) &&
    (firstLine.includes('text') || firstLine.includes('message'))
  );
}

/**
 * Detect iOS Messages JSON export
 */
function isiOSMessagesJson(content: string): boolean {
  if (!content) return false;
  
  try {
    const data = JSON.parse(content);
    
    if (Array.isArray(data)) {
      const firstMsg = data[0];
      // iOS exports have is_from_me field
      return firstMsg && 'is_from_me' in firstMsg;
    }
  } catch {
    return false;
  }
  
  return false;
}

/**
 * Detect iOS Messages HTML export
 */
function isiOSMessagesHtml(content: string): boolean {
  if (!content) return false;
  
  const lowerContent = content.toLowerCase();
  
  // iOS HTML exports often contain specific classes or structure
  return (
    lowerContent.includes('imessage') ||
    (lowerContent.includes('message') && lowerContent.includes('sent') && lowerContent.includes('received'))
  );
}

/**
 * Detect generic chat JSON format
 * Fallback for other chat exports that have message/sender/timestamp structure
 */
function isGenericChatJson(content: string): boolean {
  if (!content) return false;
  
  try {
    const data = JSON.parse(content);
    
    if (Array.isArray(data) && data.length > 0) {
      const firstMsg = data[0];
      
      // Generic chat structure: has message/text, sender/from, and date/timestamp
      const hasMessage = 'message' in firstMsg || 'text' in firstMsg || 'content' in firstMsg;
      const hasSender = 'sender' in firstMsg || 'from' in firstMsg || 'user' in firstMsg;
      const hasTime = 'date' in firstMsg || 'timestamp' in firstMsg || 'time' in firstMsg;
      
      return hasMessage && hasSender && hasTime;
    }
  } catch {
    return false;
  }
  
  return false;
}
