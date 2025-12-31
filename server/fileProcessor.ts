import mammoth from "mammoth";
import { db } from "./db";
import * as schema from "@shared/schema";
import type { InsertCommunication, InsertIngestedChatMessage, InsertChatThread } from "@shared/schema";
import { promises as fs } from "fs";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import { detectFileType, parseFile, type EmailMessage, type SupportedFormat, streamParseMBOXFile } from "./ingestion";
import { detectChatType, type ChatFormat } from "./ingestion/chatDetector";
import { parseChatFile, type ChatMessageNormalized } from "./ingestion/chatParsers";

export interface ProcessedEmail {
  subject: string;
  body: string;
  sender: string;
  recipients: string[];
  timestamp: Date;
  metadata?: any;
}

// Safe helper to normalize MAILTO addresses (handles undefined/null)
function normalizeEmailValue(value: string | null | undefined): string {
  if (!value) return '';
  return value.replace(/^MAILTO:/i, '');
}

// Format attendee as RFC822 address string
// Returns "Name <email>" if both exist, "email" if only email, null if no valid email
function formatAttendeeRFC822(name: string | null | undefined, email: string | null | undefined): string | null {
  const normalizedEmail = normalizeEmailValue(email);
  if (!normalizedEmail || normalizedEmail.length === 0) {
    return null; // Skip attendees without valid emails
  }
  // Return "Name <email>" if both exist, otherwise just email
  return name && name.length > 0 ? `${name} <${normalizedEmail}>` : normalizedEmail;
}

// Convert EmailMessage (from ingestion module) to ProcessedEmail
function convertEmailMessageToProcessedEmail(email: EmailMessage): ProcessedEmail {
  return {
    subject: email.subject || "(No Subject)",
    body: email.bodyText || email.bodyHtml || "",
    sender: email.from ? (email.from.name ? `${email.from.name} <${email.from.address}>` : email.from.address) : "Unknown",
    recipients: email.to.map(addr => addr.name ? `${addr.name} <${addr.address}>` : addr.address),
    timestamp: email.sentAt || email.receivedAt || new Date(),
    metadata: {
      hasAttachments: email.hasAttachments,
      attachmentCount: email.attachments.length,
      messageId: email.messageId,
      folderPath: email.folderPath,
      importance: email.importance,
      cc: email.cc.map(addr => addr.name ? `${addr.name} <${addr.address}>` : addr.address),
      bcc: email.bcc.map(addr => addr.name ? `${addr.name} <${addr.address}>` : addr.address),
    },
  };
}

// Convert calendar/contact EmailMessage to ProcessedEmail
// ICS and VCF files have different semantics than emails
// Uses enhanced parser metadata (icsDetails, vcfDetails)
function convertCalendarContactToProcessedEmail(email: EmailMessage, sourceFormat: string): ProcessedEmail {
  // For ICS (calendar events)
  // Parser provides full event details in icsDetails metadata
  if (sourceFormat === "ics") {
    const icsDetails = email.metadata?.icsDetails;
    
    // Extract organizer using safe normalization helper
    const organizerEmail = normalizeEmailValue(icsDetails?.organizer) || normalizeEmailValue(email.from?.address) || '';
    const organizerName = email.from?.name || organizerEmail || "Unknown Organizer";
    
    // Use enhanced attendee data from icsDetails with safe normalization
    const rawAttendees = icsDetails?.attendees || email.to.map(addr => ({
      name: addr.name || null,
      email: normalizeEmailValue(addr.address),
    }));
    
    // Filter to only attendees with valid emails and ensure proper formatting
    const attendees = rawAttendees.filter((a: any) => {
      const email = normalizeEmailValue(a.email);
      return email && email.length > 0;
    }).map((a: any) => ({
      name: a.name || null,
      email: normalizeEmailValue(a.email),
    }));
    
    // Build RFC822-compliant recipient list (skip entries without valid emails)
    const recipients = attendees
      .map((a: any) => formatAttendeeRFC822(a.name, a.email))
      .filter((r): r is string => r !== null);
    
    return {
      subject: email.subject || "(Calendar Event)",
      body: email.bodyText || "",
      sender: organizerName || "Calendar System",
      recipients,
      // Use actual event start time from parser
      timestamp: email.sentAt || new Date(),
      metadata: {
        sourceType: "calendar_event",
        isCalendarOrContact: true,
        // Enhanced calendar metadata from parser
        organizer: organizerEmail,
        organizerName: organizerName,
        attendees: attendees,
        eventStart: icsDetails?.start || email.sentAt,
        eventEnd: icsDetails?.end || email.receivedAt,
        location: icsDetails?.location || null,
        uid: icsDetails?.uid || null,
        description: email.bodyText || "",
      },
    };
  }
  
  // For VCF (contact cards)
  // Parser provides full contact details in vcfDetails metadata
  if (sourceFormat === "vcf") {
    const vcfDetails = email.metadata?.vcfDetails;
    
    // Use enhanced contact data from vcfDetails
    const contactName = vcfDetails?.name || email.to[0]?.name || "Unknown Contact";
    const contactEmail = vcfDetails?.primaryEmail || email.to[0]?.address || "";
    
    return {
      subject: email.subject || `Contact: ${contactName}`,
      body: email.bodyText || "",
      sender: contactName,
      // Put primary email in recipients for compatibility with downstream workflows
      recipients: contactEmail ? [contactEmail] : [],
      timestamp: new Date(),
      metadata: {
        sourceType: "contact_card",
        isCalendarOrContact: true,
        // Enhanced contact metadata from parser
        contactName: contactName,
        contactEmail: contactEmail,
        emails: vcfDetails?.emails || [contactEmail],
        phones: vcfDetails?.phones || [],
        organization: vcfDetails?.organization || null,
        title: vcfDetails?.title || null,
        note: email.bodyText || "",
      },
    };
  }
  
  // For NDJSON or other data formats
  return {
    subject: email.subject || "(Data Record)",
    body: email.bodyText || email.bodyHtml || "",
    sender: email.from ? (email.from.name || email.from.address) : "Data Import",
    recipients: email.to.map(addr => addr.name || addr.address),
    timestamp: email.sentAt || email.receivedAt || new Date(),
    metadata: {
      sourceType: sourceFormat,
      isCalendarOrContact: true,
      originalData: {
        from: email.from,
        to: email.to,
        cc: email.cc,
        bcc: email.bcc,
      },
    },
  };
}

export interface FileProcessingResult {
  communicationsCreated: number;
  communicationIds: string[];
  chatMessagesCreated: number;
  chatMessageIds: string[]; // IDs of ingested chat messages for auto-indexing
  alertsGenerated: number;
  errors: string[];
  detectedChatFormat?: string | null;
}

// Process a PDF file
async function processPDFFile(buffer: Buffer, fileName: string): Promise<ProcessedEmail> {
  const { PDFParse } = await import("pdf-parse");
  
  const parser = new PDFParse({ buffer });
  const result = await parser.getText();
  
  // Extract filename without extension for subject
  const fileNameWithoutExt = fileName.replace(/\.pdf$/i, '');
  
  return {
    subject: fileNameWithoutExt,
    body: result.text,
    sender: "Document Upload",
    recipients: [],
    timestamp: new Date(),
    metadata: {
      pages: result.pages,
    },
  };
}

// Process a DOCX file
async function processDOCXFile(buffer: Buffer, fileName: string): Promise<ProcessedEmail> {
  // Convert to HTML to preserve formatting (paragraphs, headings, lists, etc.)
  const htmlResult = await mammoth.convertToHtml({ buffer });
  // Also extract plain text for search indexing and backward compatibility
  const textResult = await mammoth.extractRawText({ buffer });
  
  // Extract filename without extension for subject
  const fileNameWithoutExt = fileName.replace(/\.docx$/i, '');
  
  return {
    subject: fileNameWithoutExt,
    body: textResult.value, // Plain text for search/indexing
    sender: "Document Upload",
    recipients: [],
    timestamp: new Date(),
    metadata: {
      messages: htmlResult.messages,
      bodyHtml: htmlResult.value, // Formatted HTML for display
      hasFormattedContent: true,
    },
  };
}

// Process a text file
async function processTextFile(buffer: Buffer, fileName: string): Promise<ProcessedEmail> {
  const text = buffer.toString('utf-8');
  
  // Extract filename without extension for subject
  const fileNameWithoutExt = fileName.replace(/\.txt$/i, '');
  
  return {
    subject: fileNameWithoutExt,
    body: text,
    sender: "Document Upload",
    recipients: [],
    timestamp: new Date(),
  };
}

// Process an image file (no text extraction)
async function processImageFile(buffer: Buffer, fileName: string): Promise<ProcessedEmail> {
  return {
    subject: `Image: ${fileName}`,
    body: "[Image file - no text content available]",
    sender: "Document Upload",
    recipients: [],
    timestamp: new Date(),
    metadata: {
      fileSize: buffer.length,
      isMediaFile: true,
      mediaType: "image",
    },
  };
}

// Process a video file (no text extraction)
async function processVideoFile(buffer: Buffer, fileName: string): Promise<ProcessedEmail> {
  return {
    subject: `Video: ${fileName}`,
    body: "[Video file - no text content available]",
    sender: "Document Upload",
    recipients: [],
    timestamp: new Date(),
    metadata: {
      fileSize: buffer.length,
      isMediaFile: true,
      mediaType: "video",
    },
  };
}

// Process a generic file (no text extraction)
async function processGenericFile(buffer: Buffer, fileName: string, fileType: string): Promise<ProcessedEmail> {
  return {
    subject: `File: ${fileName}`,
    body: `[${fileType.toUpperCase()} file - text extraction not available]`,
    sender: "Document Upload",
    recipients: [],
    timestamp: new Date(),
    metadata: {
      fileSize: buffer.length,
      isMediaFile: false,
    },
  };
}


// Threshold for streaming processing (500MB)
const LARGE_FILE_THRESHOLD = 500 * 1024 * 1024;

// Process large mbox files using streaming directly from object storage (for files >500MB)
async function processLargeMboxFile(
  fileId: string,
  fileName: string,
  objectStoragePath: string,
  caseId: string | null,
  objectStorageService: any
): Promise<FileProcessingResult> {
  const result: FileProcessingResult = {
    communicationsCreated: 0,
    communicationIds: [],
    chatMessagesCreated: 0,
    chatMessageIds: [],
    alertsGenerated: 0,
    errors: [],
    detectedChatFormat: null,
  };
  
  try {
    console.log(`[FileProcessor] Creating read stream directly from object storage...`);
    
    // Get a read stream directly from object storage (no temp file needed)
    const { stream: inputStream, size } = await objectStorageService.createObjectReadStream(objectStoragePath);
    
    console.log(`[FileProcessor] Starting streaming parse of ${(size / 1024 / 1024 / 1024).toFixed(2)} GB mbox file`);
    
    // Process the mbox file using streaming parser with direct stream from object storage
    const stats = await streamParseMBOXFile(inputStream, fileName, async (email: EmailMessage) => {
      try {
        // Convert to ProcessedEmail format
        const processedEmail = {
          subject: email.subject || "(No Subject)",
          body: email.bodyText || email.bodyHtml || "",
          sender: email.from ? (email.from.name ? `${email.from.name} <${email.from.address}>` : email.from.address) : "Unknown",
          recipients: email.to.map(addr => addr.name ? `${addr.name} <${addr.address}>` : addr.address),
          timestamp: email.sentAt || email.receivedAt || new Date(),
          metadata: {
            hasAttachments: email.hasAttachments,
            attachmentCount: email.attachments.length,
            messageId: email.messageId,
            folderPath: email.folderPath,
            importance: email.importance,
            cc: email.cc.map(addr => addr.name ? `${addr.name} <${addr.address}>` : addr.address),
            bcc: email.bcc.map(addr => addr.name ? `${addr.name} <${addr.address}>` : addr.address),
          },
        };
        
        // Create communication record
        const communication: InsertCommunication = {
          subject: processedEmail.subject,
          body: processedEmail.body,
          sender: processedEmail.sender,
          recipients: processedEmail.recipients,
          communicationType: "email",
          sourceType: "manual_entry",
          timestamp: processedEmail.timestamp,
          caseId: caseId,
          filePath: objectStoragePath,
          fileExtension: ".mbox",
          mimeType: "application/mbox",
          wordCount: processedEmail.body ? processedEmail.body.split(/\s+/).filter(w => w.length > 0).length : 0,
          metadata: {
            ...processedEmail.metadata,
            sourceFile: fileName,
            sourceFormat: "mbox",
            ingestionFileId: fileId,
            uploadedFileName: fileName,
          },
        };
        
        const [inserted] = await db.insert(schema.communications).values(communication).returning();
        result.communicationsCreated++;
        result.communicationIds.push(inserted.id);
        
        // Log progress periodically
        if (result.communicationsCreated % 100 === 0) {
          console.log(`[FileProcessor] Inserted ${result.communicationsCreated} communications so far...`);
        }
      } catch (insertError) {
        result.errors.push(`Failed to insert email: ${insertError instanceof Error ? insertError.message : String(insertError)}`);
      }
    });
    
    console.log(`[FileProcessor] Streaming complete: ${stats.parsed} parsed, ${stats.skipped} skipped, ${stats.errors} errors`);
    
    if (stats.errors > 0) {
      result.errors.push(`${stats.errors} emails failed to parse`);
    }
    
  } catch (error) {
    console.error(`[FileProcessor] Error processing large mbox:`, error);
    result.errors.push(`Failed to process large mbox: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  console.log(`[FileProcessor] Large mbox processing complete: ${result.communicationsCreated} communications created`);
  return result;
}

// Main function to process a file and create communications
export async function processFile(
  fileId: string,
  fileName: string,
  fileType: string,
  objectStoragePath: string,
  caseId: string | null = null,
  storage?: any
): Promise<FileProcessingResult> {
  const result: FileProcessingResult = {
    communicationsCreated: 0,
    communicationIds: [],
    chatMessagesCreated: 0,
    chatMessageIds: [],
    alertsGenerated: 0,
    errors: [],
    detectedChatFormat: null,
  };
  
  try {
    // Initialize storage if not provided
    if (!storage) {
      const { storage: dbStorage } = await import("./storage");
      storage = dbStorage;
    }
    // Get the file object from object storage service
    const { ObjectStorageService } = await import("./objectStorage");
    const objectStorageService = new ObjectStorageService();
    
    // Check file size first to determine if we need streaming
    const ext = fileType.toLowerCase();
    const fileSize = await objectStorageService.getObjectSize(objectStoragePath);
    console.log(`[FileProcessor] File size: ${(fileSize / 1024 / 1024 / 1024).toFixed(2)} GB`);
    
    // For large mbox files (>500MB), use streaming processing
    if ((ext === 'mbox' || ext === 'mbx') && fileSize > LARGE_FILE_THRESHOLD) {
      console.log(`[FileProcessor] Large mbox detected (${(fileSize / 1024 / 1024 / 1024).toFixed(2)} GB). Using streaming processing...`);
      return await processLargeMboxFile(fileId, fileName, objectStoragePath, caseId, objectStorageService);
    }
    
    const fileObject = await objectStorageService.getObjectEntityFile(objectStoragePath);
    
    // Download file from object storage
    const [buffer] = await fileObject.download();
    
    // Detect file type - use the actual MIME type from fileType parameter
    console.log(`[FileProcessor] Processing file: ${fileName}, extension: "${ext}"`);
    
    // Get MIME type from extension mapping
    const mimeTypes: Record<string, string> = {
      'pst': 'application/vnd.ms-outlook',
      'ost': 'application/vnd.ms-outlook',
      'msg': 'application/vnd.ms-outlook',
      'eml': 'message/rfc822',
      'mbox': 'application/mbox',
      'olm': 'application/vnd.apple.mail',
      'mime': 'multipart/related',
      'rfc822': 'message/rfc822',
      'mail': 'message/rfc822',
      'mbx': 'application/mbox',
      'mht': 'multipart/related',
      'mhtml': 'message/mhtml',
      'ics': 'text/calendar',
      'vcf': 'text/vcard',
      'json': 'application/json',
      'ndjson': 'application/x-ndjson',
    };
    
    const mimeType = mimeTypes[ext] || null;
    const fileTypeInfo = detectFileType(fileName, mimeType);
    console.log(`[FileProcessor] Detected format: ${fileTypeInfo.format} (${fileTypeInfo.description})`);
    
    // Also detect if this is a chat format
    // Write buffer to temp file for chat detection (chat detector needs file path)
    const tempDir = `/tmp/chat_detect_${Date.now()}`;
    await fs.mkdir(tempDir, { recursive: true });
    const tempFilePath = `${tempDir}/${fileName}`;
    await fs.writeFile(tempFilePath, buffer);
    
    const chatFormat = detectChatType(tempFilePath, mimeType);
    if (chatFormat) {
      console.log(`[FileProcessor] Detected chat format: ${chatFormat}`);
      result.detectedChatFormat = chatFormat;
    }
    
    // Process based on file type
    let emails: ProcessedEmail[] = [];
    
    // Image file types
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'tiff', 'ico'];
    // Video file types
    const videoExtensions = ['mp4', 'mov', 'avi', 'wmv', 'flv', 'webm', 'mkv', 'm4v', '3gp'];
    
    // Define supported format categories
    // True email formats (classified as "email")
    // Includes email archives, messages, and Google Vault email exports
    const emailFormats: SupportedFormat[] = ['pst', 'ost', 'msg', 'eml', 'mbox', 'olm', 'mime', 'rfc822', 'mail', 'mbx', 'mht', 'mhtml', 'vault_json'];
    
    // Calendar and contact formats (classified as "document")
    // These are not true emails but communication artifacts
    const calendarContactFormats: SupportedFormat[] = ['ics', 'vcf'];
    
    // Data formats that may contain mixed content (classified as "document")
    // NDJSON can contain heterogeneous data, not guaranteed to be emails
    const dataFormats: SupportedFormat[] = ['ndjson'];
    
    // All parseable formats
    const parseableFormats = [...emailFormats, ...calendarContactFormats, ...dataFormats];
    
    if (parseableFormats.includes(fileTypeInfo.format)) {
      try {
        console.log(`[FileProcessor] Using ingestion module to parse ${fileTypeInfo.format} format`);
        const parsedEmails = await parseFile(buffer, fileName, fileTypeInfo.format);
        console.log(`[FileProcessor] Parsed ${parsedEmails.length} messages from ${fileName}`);
        
        // Convert EmailMessage[] to ProcessedEmail[] using appropriate converter
        if (calendarContactFormats.includes(fileTypeInfo.format) || dataFormats.includes(fileTypeInfo.format)) {
          // Use specialized converter for calendar/contact/data formats
          emails = parsedEmails.map(email => convertCalendarContactToProcessedEmail(email, fileTypeInfo.format));
        } else {
          // Use standard email converter for true email formats
          emails = parsedEmails.map(convertEmailMessageToProcessedEmail);
        }
      } catch (parseError) {
        console.error(`[FileProcessor] Error parsing ${fileTypeInfo.format} file:`, parseError);
        result.errors.push(`Failed to parse ${fileTypeInfo.format} file: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
        return result;
      }
    } else if (ext === "pdf") {
      emails = [await processPDFFile(buffer, fileName)];
    } else if (ext === "docx") {
      emails = [await processDOCXFile(buffer, fileName)];
    } else if (ext === "txt") {
      emails = [await processTextFile(buffer, fileName)];
    } else if (imageExtensions.includes(ext)) {
      emails = [await processImageFile(buffer, fileName)];
    } else if (videoExtensions.includes(ext)) {
      emails = [await processVideoFile(buffer, fileName)];
    } else {
      // Generic file handler for unsupported types (still creates a record)
      emails = [await processGenericFile(buffer, fileName, ext)];
    }
    
    // Determine final MIME type and communication type
    const finalMimeType = mimeType || {
      // Documents
      'pdf': 'application/pdf',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'doc': 'application/msword',
      'txt': 'text/plain',
      // Images
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'bmp': 'image/bmp',
      'webp': 'image/webp',
      'tiff': 'image/tiff',
      // Videos
      'mp4': 'video/mp4',
      'mov': 'video/quicktime',
      'avi': 'video/x-msvideo',
      'mkv': 'video/x-matroska',
    }[ext] || 'application/octet-stream';
    
    // Determine communication type based on format category
    // - True email formats (PST, MSG, EML, etc.) → "email"
    // - Calendar/contacts (ICS, VCF) → "document"
    // - Everything else → "document"
    const communicationType = emailFormats.includes(fileTypeInfo.format) ? "email" : "document";
    
    // Insert communications (compliance analysis is done separately to avoid timeouts)
    for (const email of emails) {
      try {
        // Create communication record with file metadata
        const communication: InsertCommunication = {
          subject: email.subject,
          body: email.body,
          sender: email.sender,
          recipients: email.recipients,
          communicationType: communicationType,
          sourceType: "manual_entry",
          timestamp: email.timestamp,
          caseId: caseId, // Link to case if provided
          filePath: objectStoragePath, // Store object storage path
          fileExtension: `.${ext}`,
          mimeType: finalMimeType,
          fileSize: buffer.length,
          wordCount: email.body ? email.body.split(/\s+/).filter(w => w.length > 0).length : 0,
          metadata: {
            ...email.metadata,
            sourceFile: fileName,
            sourceFormat: fileTypeInfo.format,
            ingestionFileId: fileId,
            uploadedFileName: fileName,
          },
        };
        
        const [inserted] = await db.insert(schema.communications).values(communication).returning();
        result.communicationsCreated++;
        result.communicationIds.push(inserted.id);
        
        // Log progress for bulk ingestion
        if (result.communicationsCreated % 10 === 0 || result.communicationsCreated <= 5) {
          console.log(`[FileProcessor] Inserted ${result.communicationsCreated}/${emails.length} communications`);
        }
        
        // NOTE: Compliance analysis is intentionally SKIPPED during bulk ingestion
        // Running AI analysis for each of 200+ emails would cause timeouts
        // Users can manually analyze documents via the UI or a separate batch job
      } catch (insertError) {
        console.error("Error inserting communication:", insertError);
        result.errors.push(`Failed to insert email: ${email.subject}`);
      }
    }
    
    // Process chat messages if a chat format was detected
    if (chatFormat && caseId) {
      try {
        console.log(`[FileProcessor] Processing chat format: ${chatFormat}`);
        const chatMessages = await parseChatFile(tempFilePath, chatFormat);
        console.log(`[FileProcessor] Parsed ${chatMessages.length} chat messages from ${fileName}`);
        
        if (chatMessages.length > 0) {
          // Group messages by conversation and create threads
          const conversationGroups = new Map<string, ChatMessageNormalized[]>();
          for (const msg of chatMessages) {
            const convId = msg.conversation_id;
            if (!conversationGroups.has(convId)) {
              conversationGroups.set(convId, []);
            }
            conversationGroups.get(convId)!.push(msg);
          }
          
          // Create a thread for each conversation and insert messages
          for (const [conversationId, messages] of conversationGroups) {
            const firstMsg = messages[0];
            const lastMsg = messages[messages.length - 1];
            
            // Determine conversation name
            const conversationName = firstMsg.raw_metadata?.conversationName || 
              (firstMsg.is_group ? `Group Chat (${firstMsg.participants.length} participants)` : 
                `Chat with ${firstMsg.participants.find(p => p.id !== firstMsg.sender_id)?.display_name || 'Unknown'}`);
            
            // Map source_type to valid enum value
            const sourceTypeMap: Record<string, any> = {
              'whatsapp': 'whatsapp',
              'sms_android': 'sms_android',
              'sms_ios': 'sms_ios',
              'imessage': 'imessage',
              'telegram': 'telegram',
              'signal': 'signal',
            };
            const sourceType = sourceTypeMap[firstMsg.source_type] || 'other_chat';
            
            // Create the thread
            const threadData: InsertChatThread = {
              caseId: caseId,
              evidenceId: null, // Could link to evidence if applicable
              sourceType: sourceType,
              sourceFileName: fileName,
              conversationName: conversationName,
              participants: firstMsg.participants,
              messageCount: messages.length,
              startedAt: firstMsg.sent_at || null,
              endedAt: lastMsg.sent_at || null,
            };
            
            const [createdThread] = await db.insert(schema.chatThreads).values(threadData).returning();
            console.log(`[FileProcessor] Created chat thread: ${createdThread.id} with ${messages.length} messages`);
            
            // Insert all messages linked to the thread
            for (let index = 0; index < messages.length; index++) {
              const chatMsg = messages[index];
              try {
                const insertData: InsertIngestedChatMessage = {
                  threadId: createdThread.id,
                  messageId: chatMsg.message_id,
                  messageIndex: index + 1,
                  sourceType: sourceType,
                  sourceFileName: chatMsg.source_file_name,
                  conversationId: chatMsg.conversation_id,
                  isGroup: chatMsg.is_group,
                  participants: chatMsg.participants,
                  senderId: chatMsg.sender_id || null,
                  senderName: chatMsg.sender_name || null,
                  senderPhone: chatMsg.sender_phone || null,
                  sentAt: chatMsg.sent_at || null,
                  text: chatMsg.text || null,
                  mediaAttachments: chatMsg.media,
                  direction: chatMsg.direction as any,
                  rawMetadata: chatMsg.raw_metadata,
                  caseId: caseId,
                };
                
                const createdChatMessage = await storage.createIngestedChatMessage(insertData);
                result.chatMessagesCreated++;
                if (createdChatMessage?.id) {
                  result.chatMessageIds.push(createdChatMessage.id);
                }
              } catch (insertError) {
                console.error("Error inserting chat message:", insertError);
                result.errors.push(`Failed to insert chat message: ${chatMsg.text?.substring(0, 50) || 'unknown'}`);
              }
            }
          }
        }
      } catch (chatParseError) {
        console.error(`[FileProcessor] Error parsing chat file:`, chatParseError);
        result.errors.push(`Failed to parse chat format ${chatFormat}: ${chatParseError instanceof Error ? chatParseError.message : String(chatParseError)}`);
      }
    }
    
    // Clean up temp file
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (cleanupError) {
      // Ignore cleanup errors
      console.warn("Failed to cleanup temp chat detection file:", cleanupError);
    }
  } catch (error: any) {
    console.error("Error processing file:", error);
    result.errors.push(error.message || "Unknown error processing file");
  }
  
  return result;
}
