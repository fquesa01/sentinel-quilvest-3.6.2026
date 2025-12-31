/**
 * File Detection Module
 * Detects email file types by extension and MIME type
 */

export type SupportedFormat =
  // Primary email formats
  | "pst"
  | "ost"
  | "msg"
  | "eml"
  | "mbox"
  | "olm"
  // Secondary/forensic formats
  | "mime"
  | "rfc822"
  | "mail"
  | "mbx"
  | "mht"
  | "mhtml"
  | "vault_json"
  | "ndjson"
  | "ics"
  | "vcf"
  // Future formats (placeholders)
  | "edb"
  | "nsf"
  // Generic
  | "unknown";

interface FileTypeInfo {
  format: SupportedFormat;
  description: string;
  isPrimary: boolean;
}

// MIME type mappings
const MIME_TYPE_MAP: Record<string, SupportedFormat> = {
  "application/vnd.ms-outlook": "pst",
  "application/x-pst": "pst",
  "application/vnd.ms-outlook-pst": "pst",
  "application/vnd.ms-outlook.msg": "msg",
  "application/vnd.ms-office.msg": "msg",
  "message/rfc822": "eml",
  "application/mbox": "mbox",
  "application/vnd.apple.mail": "olm",
  "multipart/related": "mht",
  "application/x-mimearchive": "mht",
  "message/mhtml": "mhtml",
  "text/calendar": "ics",
  "text/x-vcard": "vcf",
  "text/vcard": "vcf",
  "application/json": "vault_json",
  "application/x-ndjson": "ndjson",
};

// Extension mappings (primary detection method)
const EXTENSION_MAP: Record<string, SupportedFormat> = {
  // Primary formats
  ".pst": "pst",
  ".ost": "ost",
  ".msg": "msg",
  ".eml": "eml",
  ".mbox": "mbox",
  ".olm": "olm",
  // Secondary formats
  ".mime": "mime",
  ".rfc822": "rfc822",
  ".mail": "mail",
  ".mbx": "mbx",
  ".mht": "mht",
  ".mhtml": "mhtml",
  ".json": "vault_json",
  ".ndjson": "ndjson",
  ".ics": "ics",
  ".vcf": "vcf",
  // Future formats
  ".edb": "edb",
  ".nsf": "nsf",
};

/**
 * Detect file type from path and optional MIME type
 */
export function detectFileType(
  filePath: string,
  mimeType?: string | null
): FileTypeInfo {
  // Extract extension
  const extension = filePath.toLowerCase().match(/\.[^.]+$/)?.[0] || "";
  
  // Try MIME type first if available
  let format: SupportedFormat = "unknown";
  if (mimeType && MIME_TYPE_MAP[mimeType]) {
    format = MIME_TYPE_MAP[mimeType];
  }
  
  // Fall back to extension
  if (format === "unknown" && EXTENSION_MAP[extension]) {
    format = EXTENSION_MAP[extension];
  }
  
  // Determine if primary format
  const isPrimary = ["pst", "ost", "msg", "eml", "mbox", "olm"].includes(format);
  
  return {
    format,
    description: getFormatDescription(format),
    isPrimary,
  };
}

function getFormatDescription(format: SupportedFormat): string {
  const descriptions: Record<SupportedFormat, string> = {
    pst: "Microsoft Outlook PST Archive",
    ost: "Microsoft Outlook OST Archive",
    msg: "Microsoft Outlook MSG Email",
    eml: "RFC 822 Email Message",
    mbox: "MBOX Email Archive",
    olm: "Mac Outlook OLM Archive",
    mime: "MIME Email Message",
    rfc822: "RFC 822 Email Message",
    mail: "Generic Email Message",
    mbx: "MBX Email Archive",
    mht: "MHTML Web Archive",
    mhtml: "MHTML Web Archive",
    vault_json: "Google Vault JSON Export",
    ndjson: "Newline-Delimited JSON",
    ics: "iCalendar Event",
    vcf: "vCard Contact",
    edb: "Exchange Database (Not Supported)",
    nsf: "Lotus Notes Database (Not Supported)",
    unknown: "Unknown Format",
  };
  return descriptions[format] || "Unknown Format";
}

/**
 * Check if format is supported for parsing
 */
export function isFormatSupported(format: SupportedFormat): boolean {
  // EDB and NSF are placeholders, not currently supported
  return !["edb", "nsf", "unknown"].includes(format);
}

/**
 * Get all supported format extensions
 */
export function getSupportedExtensions(): string[] {
  return Object.keys(EXTENSION_MAP).filter(ext => {
    const format = EXTENSION_MAP[ext];
    return isFormatSupported(format);
  });
}
