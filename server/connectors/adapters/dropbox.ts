/**
 * Dropbox Connector Adapter
 * 
 * Lists files and folders from Dropbox using the official Dropbox JavaScript SDK.
 * Normalizes file metadata into the IngestionItem format for storage in communications table.
 */

import { Dropbox } from 'dropbox';
import fetch from 'isomorphic-fetch';
import type { ConnectorAdapter, ConnectorInstance, IngestionItem } from '../types';

export class DropboxAdapter implements ConnectorAdapter {
  getDisplayName(): string {
    return 'Dropbox File Storage';
  }

  async validateConnection(instance: ConnectorInstance): Promise<boolean> {
    try {
      const token = this.extractToken(instance);
      const dbx = new Dropbox({ accessToken: token, fetch });
      
      // Test connection by getting current account info
      const response = await dbx.usersGetCurrentAccount();
      
      if (!response || !response.result) {
        throw new Error('Failed to authenticate with Dropbox');
      }
      
      return true;
    } catch (error: any) {
      throw new Error(`Dropbox connection validation failed: ${error.message}`);
    }
  }

  async fetchDelta(
    instance: ConnectorInstance,
    lastSyncAt: Date | null
  ): Promise<IngestionItem[]> {
    const token = this.extractToken(instance);
    const dbx = new Dropbox({ accessToken: token, fetch });
    
    // Get root path from configuration (default to root '')
    const rootPath = instance.configurationData?.rootPath || '';
    const recursive = instance.configurationData?.recursive !== false; // Default true
    
    const allItems: IngestionItem[] = [];
    
    try {
      // List all files in the specified path
      let hasMore = true;
      let cursor: string | undefined = undefined;
      
      // Initial request
      let response = await dbx.filesListFolder({
        path: rootPath,
        recursive: recursive,
        include_deleted: false,
      });
      
      // Process first batch
      allItems.push(...this.processEntries(response.result.entries, lastSyncAt, instance));
      
      hasMore = response.result.has_more;
      cursor = response.result.cursor;
      
      // Paginate through remaining results
      while (hasMore && cursor) {
        response = await dbx.filesListFolderContinue({ cursor });
        allItems.push(...this.processEntries(response.result.entries, lastSyncAt, instance));
        hasMore = response.result.has_more;
        cursor = response.result.cursor;
      }
      
    } catch (error: any) {
      throw new Error(`Failed to fetch Dropbox files: ${error.message}`);
    }
    
    return allItems;
  }

  /**
   * Process Dropbox entries and convert to IngestionItems
   */
  private processEntries(
    entries: any[],
    lastSyncAt: Date | null,
    instance: ConnectorInstance
  ): IngestionItem[] {
    const items: IngestionItem[] = [];
    
    for (const entry of entries) {
      // Skip folders (only process files)
      if (entry['.tag'] !== 'file') {
        continue;
      }
      
      // Filter by lastSyncAt if provided (incremental sync)
      if (lastSyncAt) {
        const serverModified = new Date(entry.server_modified);
        if (serverModified <= lastSyncAt) {
          continue; // Skip files not modified since last sync
        }
      }
      
      items.push(this.convertFileToItem(entry, instance));
    }
    
    return items;
  }

  /**
   * Convert Dropbox file to normalized IngestionItem
   */
  private convertFileToItem(
    file: any,
    instance: ConnectorInstance
  ): IngestionItem {
    const timestamp = file.server_modified
      ? new Date(file.server_modified)
      : file.client_modified
      ? new Date(file.client_modified)
      : new Date();
    
    const caseId = instance.configurationData?.caseId || undefined;
    const fileName = file.name || 'Unnamed File';
    const extension = this.extractExtension(fileName);
    
    return {
      externalId: `dropbox_${file.id}`,
      sourceType: 'file_share_dropbox',
      subject: `Dropbox file: ${fileName}`,
      body: `File path: ${file.path_display || file.path_lower || 'Unknown'}`,
      sender: instance.connectorName || 'Dropbox Sync',
      recipients: [],
      timestamp: timestamp,
      communicationType: 'file',
      fileName: fileName,
      fileExtension: extension,
      mimeType: this.inferMimeType(fileName),
      fileSize: file.size || 0,
      filePath: file.path_display || file.path_lower,
      caseId: caseId,
      containsAttachments: false,
      attachmentCount: 0,
      sourceMetadata: {
        dropboxId: file.id,
        pathLower: file.path_lower,
        pathDisplay: file.path_display,
        rev: file.rev,
        contentHash: file.content_hash,
        clientModified: file.client_modified,
        serverModified: file.server_modified,
        isDownloadable: file.is_downloadable,
        hasExplicitSharedMembers: file.has_explicit_shared_members,
      },
    };
  }

  /**
   * Extract file extension from filename
   */
  private extractExtension(fileName: string): string {
    const parts = fileName.split('.');
    if (parts.length > 1) {
      return '.' + parts.pop()!.toLowerCase();
    }
    return '';
  }

  /**
   * Infer MIME type from file extension
   */
  private inferMimeType(fileName: string): string {
    const ext = this.extractExtension(fileName).toLowerCase();
    
    const mimeTypes: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.txt': 'text/plain',
      '.csv': 'text/csv',
      '.json': 'application/json',
      '.xml': 'application/xml',
      '.zip': 'application/zip',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.mp4': 'video/mp4',
      '.mp3': 'audio/mpeg',
    };
    
    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Extract Dropbox access token from credentials
   */
  private extractToken(instance: ConnectorInstance): string {
    // Token can be in credentialsEncrypted or configurationData
    if (instance.credentialsEncrypted) {
      try {
        const creds = JSON.parse(instance.credentialsEncrypted);
        return creds.token || creds.accessToken;
      } catch (error) {
        // If it's not JSON, assume it's the raw token
        return instance.credentialsEncrypted;
      }
    }
    
    if (instance.configurationData?.token || instance.configurationData?.accessToken) {
      return instance.configurationData.token || instance.configurationData.accessToken;
    }
    
    throw new Error('No Dropbox access token found in connector configuration');
  }
}
