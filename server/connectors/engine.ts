/**
 * Connector Sync Engine
 * 
 * Orchestrates the synchronization process for third-party connectors.
 * Handles job creation, data fetching, normalization, and storage.
 */

import { db } from '../db';
import * as schema from '../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { getAdapter } from './registry';
import type { ConnectorInstance, IngestionItem, IngestionJobStats } from './types';

/**
 * Run a full connector sync
 * @param connectorId - ID of the connector configuration
 * @param userId - ID of the user triggering the sync (for audit logging)
 * @returns Job statistics
 */
export async function runConnectorSync(
  connectorId: string,
  userId?: string
): Promise<IngestionJobStats> {
  console.log(`[Connector Sync] Starting sync for connector: ${connectorId}`);
  
  // 1. Load connector configuration
  const connector = await db
    .select()
    .from(schema.connectorConfigurations)
    .where(eq(schema.connectorConfigurations.id, connectorId))
    .limit(1)
    .then((rows) => rows[0] as ConnectorInstance | undefined);
  
  if (!connector) {
    throw new Error(`Connector not found: ${connectorId}`);
  }
  
  if (connector.isActive !== 'true') {
    throw new Error(`Connector is not active: ${connectorId}`);
  }
  
  // 2. Get the appropriate adapter
  const adapter = getAdapter(connector.connectorType);
  console.log(`[Connector Sync] Using adapter: ${adapter.getDisplayName()}`);
  
  // 3. Create ingestion job
  const job = await db
    .insert(schema.ingestionJobs)
    .values({
      uploadedBy: userId || connector.createdBy || 'system',
      caseId: connector.configurationData?.caseId || null,
      status: 'processing',
      totalFiles: 0,
      processedFiles: 0,
      failedFiles: 0,
    })
    .returning()
    .then((rows) => rows[0]);
  
  console.log(`[Connector Sync] Created ingestion job: ${job.id}`);
  
  const stats: IngestionJobStats = {
    jobId: job.id,
    itemsProcessed: 0,
    itemsSucceeded: 0,
    itemsFailed: 0,
    communicationsCreated: 0,
    custodiansCreated: 0,
    startedAt: new Date(),
    status: 'processing',
  };
  
  // Track communication IDs for auto-indexing
  const communicationIds: string[] = [];
  
  try {
    // 4. Fetch delta from connector
    console.log(`[Connector Sync] Fetching items since: ${connector.lastSyncAt || 'beginning'}`);
    const items = await adapter.fetchDelta(connector, connector.lastSyncAt);
    console.log(`[Connector Sync] Fetched ${items.length} items`);
    
    // 5. Process each item
    for (const item of items) {
      stats.itemsProcessed++;
      
      try {
        const communicationId = await processIngestionItem(item, job.id, connector);
        if (communicationId) {
          communicationIds.push(communicationId);
        }
        stats.itemsSucceeded++;
        stats.communicationsCreated++;
      } catch (error: any) {
        stats.itemsFailed++;
        console.error(`[Connector Sync] Failed to process item ${item.externalId}:`, error.message);
        
        // Log failed item
        await db.insert(schema.ingestionFiles).values({
          jobId: job.id,
          fileName: item.fileName || item.subject || 'Unknown',
          fileType: 'other',
          fileSize: item.fileSize || 0,
          objectStoragePath: item.filePath || 'unknown',
          status: 'failed',
          errorMessage: error.message,
          metadata: { item },
        });
      }
    }
    
    // 6. Update job status
    stats.status = stats.itemsFailed > 0 && stats.itemsSucceeded === 0
      ? 'failed'
      : stats.itemsFailed > 0
      ? 'partially_completed'
      : 'completed';
    
    stats.completedAt = new Date();
    
    await db
      .update(schema.ingestionJobs)
      .set({
        status: stats.status,
        totalFiles: stats.itemsProcessed,
        processedFiles: stats.itemsSucceeded,
        failedFiles: stats.itemsFailed,
      })
      .where(eq(schema.ingestionJobs.id, job.id));
    
    // 7. Update connector sync timestamps
    const nextSyncAt = connector.syncFrequency
      ? new Date(Date.now() + connector.syncFrequency * 1000)
      : null;
    
    await db
      .update(schema.connectorConfigurations)
      .set({
        lastSyncAt: new Date(),
        nextSyncAt: nextSyncAt,
      })
      .where(eq(schema.connectorConfigurations.id, connectorId));
    
    console.log(`[Connector Sync] Completed: ${stats.itemsSucceeded}/${stats.itemsProcessed} succeeded`);
    
    // Auto-index communications to File Search for RAG
    if (communicationIds.length > 0 && connector.configurationData?.caseId) {
      console.log(`[Connector Sync] Auto-indexing ${communicationIds.length} communications for case ${connector.configurationData.caseId}`);
      const { indexCommunicationsBatch } = await import('../services/document-indexing-service');
      // Run indexing in background - don't block response
      indexCommunicationsBatch(communicationIds, connector.configurationData.caseId).catch(err => {
        console.error("[Connector Sync] Background indexing failed:", err.message);
      });
    } else if (communicationIds.length > 0) {
      console.log(`[Connector Sync] Communications created but no caseId found - skipping indexing`);
    }
    
    return stats;
    
  } catch (error: any) {
    // Handle catastrophic failure
    stats.status = 'failed';
    stats.errorMessage = error.message;
    stats.completedAt = new Date();
    
    await db
      .update(schema.ingestionJobs)
      .set({
        status: 'failed',
        errorMessage: error.message,
      })
      .where(eq(schema.ingestionJobs.id, job.id));
    
    console.error(`[Connector Sync] Fatal error:`, error);
    throw error;
  }
}

/**
 * Process a single ingestion item - normalize and store in database
 * @returns Communication ID if created successfully
 */
async function processIngestionItem(
  item: IngestionItem,
  jobId: string,
  connector: ConnectorInstance
): Promise<string | undefined> {
  // 1. Create or find custodian (if applicable)
  let custodianId: string | undefined = undefined;
  
  if (item.custodianEmail || item.custodianName) {
    custodianId = await findOrCreateCustodian(
      item.custodianEmail,
      item.custodianName,
      item.caseId
    );
  }
  
  // 2. Insert communication record
  const communicationResult = await db
    .insert(schema.communications)
    .values({
      subject: item.subject,
      body: item.body,
      sender: item.sender,
      recipients: item.recipients,
      communicationType: item.communicationType,
      sourceType: item.sourceType as any,
      timestamp: item.timestamp,
      metadata: {
        externalId: item.externalId,
        connectorId: connector.id,
        connectorName: connector.connectorName,
        ingestionJobId: jobId,
      },
      sourceMetadata: item.sourceMetadata,
      caseId: item.caseId || null,
      custodianId: custodianId || null,
      custodianName: item.custodianName || null,
      filePath: item.filePath || null,
      fileExtension: item.fileExtension || null,
      mimeType: item.mimeType || null,
      fileSize: item.fileSize || null,
      emailThreadId: item.threadId || null,
      containsAttachments: item.containsAttachments ? 'true' : 'false',
      attachmentCount: item.attachmentCount || 0,
    })
    .returning();
  
  const communication = communicationResult[0];
  
  // 3. Log ingestion file record
  await db.insert(schema.ingestionFiles).values({
    jobId: jobId,
    fileName: item.fileName || item.subject || 'Communication',
    fileType: mapCommunicationTypeToFileType(item.communicationType, item.fileExtension),
    fileSize: item.fileSize || 0,
    objectStoragePath: item.filePath || communication.id,
    status: 'completed',
    communicationsExtracted: 1,
    metadata: {
      externalId: item.externalId,
      communicationId: communication.id,
    },
  });
  
  return communication.id;
}

/**
 * Find or create a custodian
 */
async function findOrCreateCustodian(
  email: string | undefined,
  name: string | undefined,
  caseId: string | undefined
): Promise<string> {
  if (!email && !name) {
    throw new Error('Cannot create custodian without email or name');
  }
  
  // Try to find existing custodian
  if (email) {
    const existing = await db
      .select()
      .from(schema.custodians)
      .where(eq(schema.custodians.email, email))
      .limit(1)
      .then((rows) => rows[0]);
    
    if (existing) {
      return existing.id;
    }
  }
  
  // Create new custodian
  const custodian = await db
    .insert(schema.custodians)
    .values({
      caseId: caseId || undefined,
      fullName: name || email || 'Unknown',
      email: email || 'unknown@example.com',
      custodianType: 'employee',
      legalHoldStatus: 'not_applicable',
      collectionStatus: 'pending',
      documentCount: 0,
      isCritical: 'false',
      questionnaireCompleted: 'false',
    })
    .returning();
  
  return custodian[0].id;
}

/**
 * Map communication type to file type enum
 */
function mapCommunicationTypeToFileType(
  commType: string,
  fileExtension?: string
): 'pst' | 'eml' | 'msg' | 'pdf' | 'docx' | 'doc' | 'txt' | 'xlsx' | 'csv' | 'zip' | 'other' {
  // Try to infer from file extension first
  if (fileExtension) {
    const ext = fileExtension.toLowerCase().replace('.', '');
    const validTypes = ['pst', 'eml', 'msg', 'pdf', 'docx', 'doc', 'txt', 'xlsx', 'csv', 'zip'];
    if (validTypes.includes(ext)) {
      return ext as any;
    }
  }
  
  // Fallback to communication type mapping
  switch (commType) {
    case 'email':
      return 'eml';
    case 'chat':
      return 'txt';
    case 'file':
    case 'document':
      return 'pdf';
    default:
      return 'other';
  }
}
