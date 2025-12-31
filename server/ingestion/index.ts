/**
 * Email Ingestion Module
 * Exports file detection and parsing functionality
 */

export { detectFileType, isFormatSupported, getSupportedExtensions, type SupportedFormat } from "./fileDetector";
export { parseFile, streamParseMBOXFile, type EmailMessage, type EmailAddress } from "./emailParsers";
