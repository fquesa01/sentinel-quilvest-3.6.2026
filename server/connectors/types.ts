/**
 * Third-Party Connector Ingestion Framework
 * 
 * This module defines the core types and interfaces for the generic connector framework.
 * It enables easy integration with any data storage source (Slack, Dropbox, Box, M365, Clio, etc.)
 * by implementing a simple adapter interface.
 */

/**
 * Connector instance loaded from database
 */
export interface ConnectorInstance {
  id: string;
  connectorType: string;
  connectorName: string;
  isActive: string;
  syncFrequency: number | null;
  lastSyncAt: Date | null;
  nextSyncAt: Date | null;
  credentialsEncrypted: string | null;
  configurationData: any; // JSONB - connector-specific config
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Normalized ingestion item - output from any adapter
 * This gets converted into a communication record
 */
export interface IngestionItem {
  // Core identification
  externalId: string; // Unique ID from source system (message ID, file ID, etc.)
  sourceType: string; // e.g., 'chat_slack', 'file_share_dropbox'
  
  // Content
  subject: string;
  body: string;
  
  // Participants
  sender: string; // Email or name
  recipients: string[]; // Array of emails/names
  
  // Metadata
  timestamp: Date;
  communicationType: 'email' | 'chat' | 'file' | 'document' | 'calendar';
  
  // File information (if applicable)
  fileName?: string;
  fileExtension?: string;
  mimeType?: string;
  fileSize?: number;
  filePath?: string;
  
  // Case linking
  caseId?: string; // Optional case association
  custodianName?: string;
  custodianEmail?: string;
  
  // Raw metadata from source
  sourceMetadata?: Record<string, any>;
  
  // Additional fields
  attachmentCount?: number;
  containsAttachments?: boolean;
  threadId?: string; // For threading (email threads, Slack threads, etc.)
}

/**
 * Adapter interface - implement this for each connector type
 */
export interface ConnectorAdapter {
  /**
   * Fetch new/updated items since lastSyncAt
   * @param instance - Connector configuration from database
   * @param lastSyncAt - Last successful sync timestamp (null for first sync)
   * @returns Array of normalized ingestion items
   */
  fetchDelta(
    instance: ConnectorInstance,
    lastSyncAt: Date | null
  ): Promise<IngestionItem[]>;
  
  /**
   * Validate connector credentials and configuration
   * @param instance - Connector configuration
   * @returns true if valid, throws error if invalid
   */
  validateConnection(instance: ConnectorInstance): Promise<boolean>;
  
  /**
   * Get display name for this adapter
   */
  getDisplayName(): string;
}

/**
 * Ingestion job statistics
 */
export interface IngestionJobStats {
  jobId: string;
  itemsProcessed: number;
  itemsSucceeded: number;
  itemsFailed: number;
  communicationsCreated: number;
  custodiansCreated: number;
  startedAt: Date;
  completedAt?: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'partially_completed';
  errorMessage?: string;
}
