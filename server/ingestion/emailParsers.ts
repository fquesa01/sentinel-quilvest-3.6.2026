/**
 * Email Parsers Module
 * Parses various email formats into normalized EmailMessage format
 */

import { PSTFile, PSTFolder, PSTMessage } from "pst-extractor";
import MsgReader from "@kenjiuno/msgreader";
import { simpleParser, ParsedMail } from "mailparser";
import { Readable, PassThrough } from "stream";
import { promises as fs } from "fs";
// @ts-ignore - no types available
import mhtml2html from "mhtml2html";
import { JSDOM } from "jsdom";
import ical from "ical.js";
// @ts-ignore - no types available
import vCard from "vcf";
import AdmZip from "adm-zip";
// @ts-ignore - node-mbox types
import { MboxStream } from "node-mbox";
import type { SupportedFormat } from "./fileDetector";

export interface EmailAddress {
  name: string | null;
  address: string;
}

export interface EmailMessage {
  // Core fields
  id: string;
  sourceFileName: string;
  sourceFormat: SupportedFormat;
  
  // Email metadata
  subject: string | null;
  from: EmailAddress | null;
  to: EmailAddress[];
  cc: EmailAddress[];
  bcc: EmailAddress[];
  
  // Timestamps
  sentAt: Date | null;
  receivedAt: Date | null;
  
  // Content
  bodyText: string | null;
  bodyHtml: string | null;
  
  // Attachments & organization
  attachments: string[]; // Just names for now
  folderPath: string | null;
  threadId: string | null;
  
  // Additional metadata
  hasAttachments: boolean;
  importance: string | null;
  messageId: string | null;
  
  // Format-specific metadata (for ICS, VCF, etc.)
  metadata?: {
    icsDetails?: {
      location: string | null;
      uid: string | null;
      start: Date | null;
      end: Date | null;
      attendees: Array<{ name: string | null; email: string }>;
    };
    vcfDetails?: {
      name: string;
      emails: string[];
      primaryEmail: string;
      phones: string[];
      organization: string | null;
      title: string | null;
    };
    [key: string]: any;
  };
}

/**
 * Parse a file based on its detected format
 */
export async function parseFile(
  buffer: Buffer,
  fileName: string,
  detectedFormat: SupportedFormat
): Promise<EmailMessage[]> {
  console.log(`[EmailParser] Parsing ${fileName} as ${detectedFormat}`);
  
  try {
    switch (detectedFormat) {
      case "pst":
      case "ost":
        return await parsePSTFile(buffer, fileName, detectedFormat);
      
      case "msg":
        return await parseMSGFile(buffer, fileName);
      
      case "eml":
      case "mime":
      case "rfc822":
      case "mail":
        return await parseEMLFile(buffer, fileName);
      
      case "mbox":
      case "mbx":
        return await parseMBOXFile(buffer, fileName);
      
      case "mht":
      case "mhtml":
        return await parseMHTMLFile(buffer, fileName);
      
      case "vault_json":
      case "ndjson":
        return await parseVaultJSONFile(buffer, fileName);
      
      case "ics":
        return await parseICSFile(buffer, fileName);
      
      case "vcf":
        return await parseVCFFile(buffer, fileName);
      
      case "olm":
        return await parseOLMFile(buffer, fileName);
      
      case "edb":
      case "nsf":
        throw new Error(`Format ${detectedFormat} requires external conversion - not yet implemented`);
      
      default:
        throw new Error(`Unsupported format: ${detectedFormat}`);
    }
  } catch (error) {
    console.error(`[EmailParser] Error parsing ${fileName}:`, error);
    throw error;
  }
}

/**
 * Parse PST/OST files using pst-extractor
 */
async function parsePSTFile(
  buffer: Buffer,
  fileName: string,
  format: SupportedFormat
): Promise<EmailMessage[]> {
  const emails: EmailMessage[] = [];
  
  // Write buffer to temp file (pst-extractor requires file path)
  const tempPath = `/tmp/temp-${Date.now()}.pst`;
  try {
    await fs.writeFile(tempPath, buffer);
    const pstFile = new PSTFile(tempPath);
    
    const processFolder = async (folder: PSTFolder, folderPath: string): Promise<void> => {
      if (folder.contentCount > 0) {
        let msg: PSTMessage | null = folder.getNextChild();
        while (msg != null) {
          try {
            emails.push(normalizePSTMessage(msg, fileName, format, folderPath));
          } catch (error) {
            console.error("[PST] Error processing message:", error);
          }
          msg = folder.getNextChild();
        }
      }
      
      if (folder.hasSubfolders) {
        const subfolders = folder.getSubFolders();
        for (const subfolder of subfolders) {
          const newPath = folderPath ? `${folderPath}/${subfolder.displayName}` : subfolder.displayName;
          await processFolder(subfolder, newPath);
        }
      }
    };
    
    await processFolder(pstFile.getRootFolder(), "");
  } finally {
    // Clean up temp file
    try {
      await fs.unlink(tempPath);
    } catch (e) {
      // Ignore cleanup errors
    }
  }
  
  return emails;
}

/**
 * Parse MSG files using @kenjiuno/msgreader
 */
async function parseMSGFile(buffer: Buffer, fileName: string): Promise<EmailMessage[]> {
  const msgReader = new MsgReader(buffer);
  const msgData = msgReader.getFileData();
  
  return [normalizeMSGMessage(msgData, fileName)];
}

/**
 * Parse EML files using mailparser
 */
async function parseEMLFile(buffer: Buffer, fileName: string): Promise<EmailMessage[]> {
  const parsed = await simpleParser(buffer);
  return [normalizeMailparserMessage(parsed, fileName, "eml")];
}

/**
 * Parse MBOX files using custom parser + mailparser
 * MBOX format: Messages are separated by lines starting with "From " (envelope sender line)
 * Each message starts with "From <address> <timestamp>" and continues until the next "From " line
 * 
 * For files < 500MB, uses buffer-based parsing
 * For files >= 500MB, returns empty array (use streamParseMBOXFile instead)
 */
async function parseMBOXFile(buffer: Buffer, fileName: string): Promise<EmailMessage[]> {
  const emails: EmailMessage[] = [];
  
  // For very large files (>500MB), skip buffer parsing - use streaming instead
  const MAX_BUFFER_SIZE = 500 * 1024 * 1024; // 500MB
  if (buffer.length > MAX_BUFFER_SIZE) {
    console.log(`[MBOX] File too large for buffer parsing (${(buffer.length / 1024 / 1024 / 1024).toFixed(2)} GB). Use streaming mode.`);
    throw new Error(`File too large for buffer parsing. File size: ${buffer.length} bytes. Maximum: ${MAX_BUFFER_SIZE} bytes. Use streaming mode for large mbox files.`);
  }
  
  const content = buffer.toString("utf-8");
  
  console.log(`[MBOX] File size: ${buffer.length} bytes (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`[MBOX] Content length: ${content.length} characters`);
  
  // Split by "From " at start of line (envelope separator)
  // The regex looks for "From " at the start of a line (after newline or at beginning)
  const messages = content.split(/\n(?=From \S+)/);
  
  console.log(`[MBOX] Splitting file into ${messages.length} potential messages`);
  console.log(`[MBOX] Processing ${messages.length} messages from ${fileName}...`);
  
  let skipped = 0;
  let parsed = 0;
  let errors = 0;
  
  for (let i = 0; i < messages.length; i++) {
    let message = messages[i].trim();
    
    // Skip empty messages
    if (!message || message.length < 10) {
      skipped++;
      continue;
    }
    
    // Remove the "From " envelope line (first line of each message)
    const lines = message.split("\n");
    if (lines[0].startsWith("From ")) {
      lines.shift(); // Remove envelope line
      message = lines.join("\n");
    }
    
    // Parse the message with mailparser
    try {
      const messageBuffer = Buffer.from(message, "utf-8");
      const parsedMail = await simpleParser(messageBuffer);
      
      // Only add if it has some meaningful content
      if (parsedMail.subject || parsedMail.from || parsedMail.text) {
        const normalized = normalizeMailparserMessage(parsedMail, fileName, "mbox");
        emails.push(normalized);
        parsed++;
        
        if (parsed % 100 === 0 || parsed <= 10) {
          console.log(`[MBOX] Successfully parsed ${parsed}/${messages.length}: "${parsedMail.subject || '(no subject)'}"`);
        }
      } else {
        skipped++;
      }
    } catch (error) {
      errors++;
      if (errors <= 5) {
        console.error(`[MBOX] Error parsing message ${i + 1}/${messages.length}:`, error);
      }
      // Continue processing other messages
    }
  }
  
  console.log(`[MBOX] ===== PARSING COMPLETE =====`);
  console.log(`[MBOX] Total potential messages: ${messages.length}`);
  console.log(`[MBOX] Successfully parsed: ${parsed}`);
  console.log(`[MBOX] Skipped (empty/no content): ${skipped}`);
  console.log(`[MBOX] Errors: ${errors}`);
  console.log(`[MBOX] Final email count: ${emails.length}`);
  
  return emails;
}

/**
 * Streaming MBOX parser for large files (>500MB)
 * Uses node-mbox for memory-efficient streaming
 * Calls the callback for each parsed email message
 * 
 * @param inputStream - A readable stream (from object storage or file)
 * @param fileName - Original file name for metadata
 * @param onMessage - Callback for each parsed message
 */
export async function streamParseMBOXFile(
  inputStream: NodeJS.ReadableStream,
  fileName: string,
  onMessage: (email: EmailMessage) => Promise<void>
): Promise<{ parsed: number; skipped: number; errors: number }> {
  return new Promise((resolve, reject) => {
    const stats = { parsed: 0, skipped: 0, errors: 0 };
    let messageQueue: Promise<void>[] = [];
    const MAX_CONCURRENT = 10; // Process up to 10 messages concurrently
    let totalMessageBytes = 0;
    const startTime = Date.now();
    
    console.log(`[MBOX-Stream] Starting streaming parse from input stream`);
    
    // Use MboxStream helper which properly creates the mbox parser
    // Important: Use 'data' event (not 'message') and 'finish' event (not 'end')
    const mbox = MboxStream(inputStream as any);
    
    // Process each email as it's extracted from the mbox
    mbox.on('data', async (msg: Buffer) => {
      totalMessageBytes += msg.length;
      
      // Log progress periodically based on messages processed
      const totalProcessed = stats.parsed + stats.skipped + stats.errors;
      if (totalProcessed > 0 && totalProcessed % 500 === 0) {
        const elapsed = (Date.now() - startTime) / 1000;
        const mbProcessed = totalMessageBytes / 1024 / 1024;
        console.log(`[MBOX-Stream] Parsed ${stats.parsed} emails, ${stats.skipped} skipped, ${stats.errors} errors (${mbProcessed.toFixed(1)} MB, ${elapsed.toFixed(0)}s elapsed)`);
      }
      
      try {
        // Parse the email message
        const parsedMail = await simpleParser(msg);
        
        // Only process if it has meaningful content
        if (parsedMail.subject || parsedMail.from || parsedMail.text) {
          const normalized = normalizeMailparserMessage(parsedMail, fileName, "mbox");
          
          // Add to processing queue
          const processPromise = onMessage(normalized).then(() => {
            stats.parsed++;
          }).catch((err) => {
            stats.errors++;
            if (stats.errors <= 10) {
              console.error(`[MBOX-Stream] Error saving email:`, err);
            }
          });
          
          messageQueue.push(processPromise);
          
          // If queue is too large, wait for some to complete
          if (messageQueue.length >= MAX_CONCURRENT) {
            await Promise.race(messageQueue);
            messageQueue = messageQueue.filter(p => p !== undefined);
          }
        } else {
          stats.skipped++;
        }
      } catch (error) {
        stats.errors++;
        if (stats.errors <= 10) {
          console.error(`[MBOX-Stream] Error parsing message:`, error);
        }
      }
    });
    
    mbox.on('error', (err: Error) => {
      console.error(`[MBOX-Stream] Stream error:`, err);
      reject(err);
    });
    
    // Use 'finish' event for MboxStream (not 'end')
    mbox.on('finish', async () => {
      // Wait for all remaining messages to be processed
      await Promise.all(messageQueue);
      
      const elapsed = (Date.now() - startTime) / 1000;
      console.log(`[MBOX-Stream] ===== STREAMING COMPLETE =====`);
      console.log(`[MBOX-Stream] Time elapsed: ${elapsed.toFixed(1)} seconds`);
      console.log(`[MBOX-Stream] Message data processed: ${(totalMessageBytes / 1024 / 1024).toFixed(2)} MB`);
      console.log(`[MBOX-Stream] Successfully parsed: ${stats.parsed}`);
      console.log(`[MBOX-Stream] Skipped (empty/no content): ${stats.skipped}`);
      console.log(`[MBOX-Stream] Errors: ${stats.errors}`);
      
      resolve(stats);
    });
  });
}

/**
 * Parse MHT/MHTML files
 */
async function parseMHTMLFile(buffer: Buffer, fileName: string): Promise<EmailMessage[]> {
  const mhtmlContent = buffer.toString("utf-8");
  
  // Convert MHTML to HTML
  const htmlDoc = mhtml2html.convert(mhtmlContent, {
    parseDOM: (html: string) => new JSDOM(html),
    convertIframes: false,
  });
  
  const html = htmlDoc.window.document.documentElement.outerHTML;
  const text = htmlDoc.window.document.body?.textContent || "";
  
  // Parse as email if it has email headers
  try {
    const parsed = await simpleParser(buffer);
    if (parsed.subject || parsed.from) {
      return [normalizeMailparserMessage(parsed, fileName, "mhtml")];
    }
  } catch (e) {
    // Not a valid email, treat as HTML document
  }
  
  // Create a pseudo-email for the MHTML content
  return [{
    id: `mhtml-${Date.now()}`,
    sourceFileName: fileName,
    sourceFormat: "mhtml",
    subject: fileName,
    from: null,
    to: [],
    cc: [],
    bcc: [],
    sentAt: null,
    receivedAt: null,
    bodyText: text,
    bodyHtml: html,
    attachments: [],
    folderPath: null,
    threadId: null,
    hasAttachments: false,
    importance: null,
    messageId: null,
  }];
}

/**
 * Parse Google Vault JSON exports
 */
async function parseVaultJSONFile(buffer: Buffer, fileName: string): Promise<EmailMessage[]> {
  const emails: EmailMessage[] = [];
  const content = buffer.toString("utf-8");
  
  // Try NDJSON format (one JSON per line)
  if (fileName.endsWith(".ndjson")) {
    const lines = content.split("\n").filter(l => l.trim());
    for (const line of lines) {
      try {
        const data = JSON.parse(line);
        emails.push(normalizeVaultJSON(data, fileName));
      } catch (error) {
        console.error("[Vault JSON] Error parsing line:", error);
      }
    }
  } else {
    // Try regular JSON
    try {
      const data = JSON.parse(content);
      if (Array.isArray(data)) {
        for (const item of data) {
          emails.push(normalizeVaultJSON(item, fileName));
        }
      } else {
        emails.push(normalizeVaultJSON(data, fileName));
      }
    } catch (error) {
      console.error("[Vault JSON] Error parsing JSON:", error);
    }
  }
  
  return emails;
}

/**
 * Parse ICS (calendar) files
 */
async function parseICSFile(buffer: Buffer, fileName: string): Promise<EmailMessage[]> {
  const icsContent = buffer.toString("utf-8");
  const jcalData = ical.parse(icsContent);
  const comp = new ical.Component(jcalData);
  const vevent = comp.getFirstSubcomponent("vevent");
  
  if (!vevent) {
    return [];
  }
  
  // Extract basic event details
  const summary = String(vevent.getFirstPropertyValue("summary") || "");
  const description = String(vevent.getFirstPropertyValue("description") || "");
  const location = String(vevent.getFirstPropertyValue("location") || "");
  const uid = String(vevent.getFirstPropertyValue("uid") || "");
  
  // Extract organizer
  const organizerValue = vevent.getFirstPropertyValue("organizer");
  const organizer = organizerValue ? String(organizerValue) : null;
  
  // Extract attendees with names
  const attendeeProperties = vevent.getAllProperties("attendee");
  const attendees = attendeeProperties.map((prop: any) => {
    const value = String(prop.getFirstValue() || "");
    const params = prop.jCal?.[1] || {};
    const cn = params.cn || null; // Common Name parameter
    return { value, cn };
  });
  
  // Extract start and end times
  const dtstart = vevent.getFirstPropertyValue("dtstart");
  const dtend = vevent.getFirstPropertyValue("dtend");
  
  let startDate: Date | null = null;
  let endDate: Date | null = null;
  
  try {
    if (dtstart) {
      startDate = dtstart instanceof Date ? dtstart : (typeof dtstart.toJSDate === 'function' ? dtstart.toJSDate() : new Date(String(dtstart)));
    }
    if (dtend) {
      endDate = dtend instanceof Date ? dtend : (typeof dtend.toJSDate === 'function' ? dtend.toJSDate() : new Date(String(dtend)));
    }
  } catch (error) {
    console.error("[ICS] Error parsing dates:", error);
  }
  
  return [{
    id: `ics-${Date.now()}`,
    sourceFileName: fileName,
    sourceFormat: "ics",
    subject: summary || fileName,
    from: organizer ? parseEmailAddress(organizer) : null,
    to: attendees.map(a => {
      const addr = parseEmailAddress(a.value);
      // Use CN (Common Name) if available
      if (a.cn && !addr.name) {
        addr.name = a.cn;
      }
      return addr;
    }),
    cc: [],
    bcc: [],
    sentAt: startDate,
    receivedAt: endDate,
    bodyText: description || "",
    bodyHtml: null,
    attachments: [],
    folderPath: null,
    threadId: uid || null,
    hasAttachments: false,
    importance: null,
    messageId: uid || null,
    metadata: {
      icsDetails: {
        location,
        uid,
        start: startDate,
        end: endDate,
        summary,
        description,
        organizer,
        attendees: attendees.map(a => ({
          email: a.value.replace(/^MAILTO:/i, ''),
          name: a.cn || null,
        })),
      },
    },
  }];
}

/**
 * Parse VCF (vCard) files
 */
async function parseVCFFile(buffer: Buffer, fileName: string): Promise<EmailMessage[]> {
  const vcfContent = buffer.toString("utf-8");
  const cards = vCard.parse(vcfContent);
  
  return cards.map((card: any, index: number) => {
    // Extract basic contact info
    const name = card.get("fn")?.valueOf() as string || "Unknown";
    const note = card.get("note")?.valueOf() as string || "";
    
    // Extract email addresses (may be multiple)
    const emailProp = card.get("email");
    const emails: string[] = [];
    if (emailProp) {
      const emailValue = emailProp.valueOf();
      if (Array.isArray(emailValue)) {
        emails.push(...emailValue);
      } else if (emailValue) {
        emails.push(String(emailValue));
      }
    }
    const primaryEmail = emails[0] || "";
    
    // Extract phone numbers (may be multiple)
    const telProps = card._data.tel || [];
    const phones: string[] = [];
    if (Array.isArray(telProps)) {
      phones.push(...telProps.map((t: any) => String(t.valueOf())));
    } else if (telProps) {
      phones.push(String(telProps.valueOf?.() || telProps));
    }
    
    // Extract organization
    const org = card.get("org")?.valueOf() as string || "";
    
    // Extract title
    const title = card.get("title")?.valueOf() as string || "";
    
    return {
      id: `vcf-${Date.now()}-${index}`,
      sourceFileName: fileName,
      sourceFormat: "vcf",
      subject: `Contact: ${name}`,
      from: null,
      to: primaryEmail ? [{ name, address: primaryEmail }] : [],
      cc: [],
      bcc: [],
      sentAt: null,
      receivedAt: null,
      bodyText: note || `Contact card for ${name}`,
      bodyHtml: null,
      attachments: [],
      folderPath: null,
      threadId: null,
      hasAttachments: false,
      importance: null,
      messageId: null,
      metadata: {
        vcfDetails: {
          name,
          emails,
          primaryEmail,
          phones,
          organization: org,
          title,
          note,
        },
      },
    };
  });
}

/**
 * Parse OLM files (Mac Outlook)
 * OLM is a ZIP archive containing XML and EML files
 */
async function parseOLMFile(buffer: Buffer, fileName: string): Promise<EmailMessage[]> {
  const emails: EmailMessage[] = [];
  
  try {
    const zip = new AdmZip(buffer);
    const entries = zip.getEntries();
    
    for (const entry of entries) {
      if (entry.entryName.endsWith(".eml")) {
        try {
          const emlBuffer = entry.getData();
          const parsed = await simpleParser(emlBuffer);
          emails.push(normalizeMailparserMessage(parsed, fileName, "olm", entry.entryName));
        } catch (error) {
          console.error("[OLM] Error parsing EML:", error);
        }
      }
    }
  } catch (error) {
    console.error("[OLM] Error extracting ZIP:", error);
    throw error;
  }
  
  return emails;
}

// ============ NORMALIZATION HELPERS ============

function normalizePSTMessage(
  msg: PSTMessage,
  fileName: string,
  format: SupportedFormat,
  folderPath: string
): EmailMessage {
  const recipients: string[] = [];
  const displayTo = msg.displayTo || "";
  if (displayTo) {
    recipients.push(...displayTo.split(";").map(r => r.trim()).filter(r => r));
  }
  
  return {
    id: `pst-${msg.descriptorNodeId || Date.now()}`,
    sourceFileName: fileName,
    sourceFormat: format,
    subject: msg.subject || null,
    from: msg.senderEmailAddress ? { name: msg.senderName || null, address: msg.senderEmailAddress } : null,
    to: recipients.map(r => parseEmailAddress(r)),
    cc: [],
    bcc: [],
    sentAt: msg.clientSubmitTime || null,
    receivedAt: msg.messageDeliveryTime || null,
    bodyText: msg.body || null,
    bodyHtml: msg.bodyHTML || null,
    attachments: [], // TODO: Extract attachment names
    folderPath,
    threadId: msg.conversationTopic || null,
    hasAttachments: msg.hasAttachments || false,
    importance: msg.importance?.toString() || null,
    messageId: msg.internetMessageId || null,
  };
}

function normalizeMSGMessage(msgData: any, fileName: string): EmailMessage {
  return {
    id: `msg-${Date.now()}`,
    sourceFileName: fileName,
    sourceFormat: "msg",
    subject: msgData.subject || null,
    from: msgData.senderEmail ? { name: msgData.senderName || null, address: msgData.senderEmail } : null,
    to: msgData.recipients?.filter((r: any) => r.recipType === 1).map((r: any) => ({
      name: r.name || null,
      address: r.email || r.name || "",
    })) || [],
    cc: msgData.recipients?.filter((r: any) => r.recipType === 2).map((r: any) => ({
      name: r.name || null,
      address: r.email || r.name || "",
    })) || [],
    bcc: msgData.recipients?.filter((r: any) => r.recipType === 3).map((r: any) => ({
      name: r.name || null,
      address: r.email || r.name || "",
    })) || [],
    sentAt: msgData.creationTime ? new Date(msgData.creationTime) : null,
    receivedAt: msgData.lastModificationTime ? new Date(msgData.lastModificationTime) : null,
    bodyText: msgData.body || null,
    bodyHtml: msgData.bodyHTML || null,
    attachments: msgData.attachments?.map((a: any) => a.fileName || "Unknown") || [],
    folderPath: null,
    threadId: null,
    hasAttachments: (msgData.attachments?.length || 0) > 0,
    importance: msgData.importance?.toString() || null,
    messageId: null,
  };
}

function normalizeMailparserMessage(
  parsed: ParsedMail,
  fileName: string,
  format: SupportedFormat,
  folderPath?: string
): EmailMessage {
  const toArray: EmailAddress[] = [];
  if (parsed.to) {
    const toAddrs = Array.isArray(parsed.to) ? parsed.to : [parsed.to];
    toAddrs.forEach((addr: any) => {
      if (typeof addr === "string") {
        toArray.push(parseEmailAddress(addr));
      } else if (addr.text) {
        toArray.push(parseEmailAddress(addr.text));
      }
    });
  }
  
  const ccArray: EmailAddress[] = [];
  if (parsed.cc) {
    const ccAddrs = Array.isArray(parsed.cc) ? parsed.cc : [parsed.cc];
    ccAddrs.forEach((addr: any) => {
      if (typeof addr === "string") {
        ccArray.push(parseEmailAddress(addr));
      } else if (addr.text) {
        ccArray.push(parseEmailAddress(addr.text));
      }
    });
  }
  
  return {
    id: `${format}-${Date.now()}-${Math.random()}`,
    sourceFileName: fileName,
    sourceFormat: format,
    subject: parsed.subject || null,
    from: parsed.from?.text ? parseEmailAddress(parsed.from.text) : null,
    to: toArray,
    cc: ccArray,
    bcc: [],
    sentAt: parsed.date || null,
    receivedAt: null,
    bodyText: parsed.text || null,
    bodyHtml: parsed.html || null,
    attachments: parsed.attachments?.map(a => a.filename || "Unknown") || [],
    folderPath: folderPath || null,
    threadId: parsed.inReplyTo || null,
    hasAttachments: (parsed.attachments?.length || 0) > 0,
    importance: parsed.priority || null,
    messageId: parsed.messageId || null,
  };
}

function normalizeVaultJSON(data: any, fileName: string): EmailMessage {
  return {
    id: `vault-${Date.now()}`,
    sourceFileName: fileName,
    sourceFormat: "vault_json",
    subject: data.subject || null,
    from: data.from ? parseEmailAddress(data.from) : null,
    to: (data.to || []).map((addr: string) => parseEmailAddress(addr)),
    cc: (data.cc || []).map((addr: string) => parseEmailAddress(addr)),
    bcc: (data.bcc || []).map((addr: string) => parseEmailAddress(addr)),
    sentAt: data.date ? new Date(data.date) : null,
    receivedAt: null,
    bodyText: data.body || null,
    bodyHtml: data.html || null,
    attachments: data.attachments || [],
    folderPath: null,
    threadId: data.threadId || null,
    hasAttachments: (data.attachments?.length || 0) > 0,
    importance: null,
    messageId: data.messageId || null,
  };
}

/**
 * Parse email address from string
 */
function parseEmailAddress(addressString: string): EmailAddress {
  // Handle "Name <email@example.com>" format
  const match = addressString.match(/^(.+?)\s*<(.+?)>$/);
  if (match) {
    return {
      name: match[1].trim(),
      address: match[2].trim(),
    };
  }
  
  // Remove "mailto:" prefix if present
  const email = addressString.replace(/^mailto:/i, "").trim();
  
  return {
    name: null,
    address: email,
  };
}
