/**
 * Slack Connector Adapter
 * 
 * Fetches channel message history from Slack using the official @slack/web-api SDK.
 * Normalizes messages into the IngestionItem format for storage in communications table.
 */

import { WebClient } from '@slack/web-api';
import type { ConnectorAdapter, ConnectorInstance, IngestionItem } from '../types';

export class SlackAdapter implements ConnectorAdapter {
  getDisplayName(): string {
    return 'Slack Workspace';
  }

  async validateConnection(instance: ConnectorInstance): Promise<boolean> {
    try {
      const token = this.extractToken(instance);
      const client = new WebClient(token);
      
      // Test auth by calling auth.test
      const response = await client.auth.test();
      
      if (!response.ok) {
        throw new Error(`Slack authentication failed: ${response.error}`);
      }
      
      return true;
    } catch (error: any) {
      throw new Error(`Slack connection validation failed: ${error.message}`);
    }
  }

  async fetchDelta(
    instance: ConnectorInstance,
    lastSyncAt: Date | null
  ): Promise<IngestionItem[]> {
    const token = this.extractToken(instance);
    const client = new WebClient(token);
    
    // Get channel IDs from configuration (or discover all public channels)
    const channelIds = this.extractChannelIds(instance);
    
    const allItems: IngestionItem[] = [];
    
    // Fetch messages from each configured channel
    for (const channelId of channelIds) {
      try {
        const items = await this.fetchChannelMessages(
          client,
          channelId,
          lastSyncAt,
          instance
        );
        allItems.push(...items);
      } catch (error: any) {
        console.error(`Error fetching Slack channel ${channelId}:`, error.message);
        // Continue with other channels even if one fails
      }
    }
    
    return allItems;
  }

  /**
   * Fetch messages from a single Slack channel
   */
  private async fetchChannelMessages(
    client: WebClient,
    channelId: string,
    lastSyncAt: Date | null,
    instance: ConnectorInstance
  ): Promise<IngestionItem[]> {
    const items: IngestionItem[] = [];
    let cursor: string | undefined = undefined;
    
    // Calculate oldest timestamp for incremental sync
    const oldest = lastSyncAt ? (lastSyncAt.getTime() / 1000).toString() : undefined;
    
    do {
      const response = await client.conversations.history({
        channel: channelId,
        oldest: oldest,
        limit: 200, // Recommended limit
        cursor: cursor,
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch messages: ${response.error}`);
      }
      
      // Convert messages to IngestionItems
      for (const message of response.messages || []) {
        // Skip bot messages and system messages if desired
        if (message.subtype && message.subtype !== 'thread_broadcast') {
          continue;
        }
        
        items.push(this.convertMessageToItem(message, channelId, instance));
      }
      
      cursor = response.response_metadata?.next_cursor;
    } while (cursor);
    
    return items;
  }

  /**
   * Convert Slack message to normalized IngestionItem
   */
  private convertMessageToItem(
    message: any,
    channelId: string,
    instance: ConnectorInstance
  ): IngestionItem {
    const timestamp = message.ts ? new Date(parseFloat(message.ts) * 1000) : new Date();
    const caseId = instance.configurationData?.caseId || undefined;
    
    return {
      externalId: `slack_${channelId}_${message.ts}`,
      sourceType: 'chat_slack',
      subject: `Slack message in channel ${channelId}`,
      body: message.text || '',
      sender: message.user || 'unknown',
      recipients: [], // Slack channels don't have explicit recipients
      timestamp: timestamp,
      communicationType: 'chat',
      custodianName: message.user || undefined,
      caseId: caseId,
      threadId: message.thread_ts || message.ts,
      attachmentCount: message.files?.length || 0,
      containsAttachments: (message.files?.length || 0) > 0,
      sourceMetadata: {
        channelId: channelId,
        messageType: message.type,
        subtype: message.subtype,
        threadTs: message.thread_ts,
        replyCount: message.reply_count,
        reactions: message.reactions,
        files: message.files?.map((f: any) => ({
          id: f.id,
          name: f.name,
          mimetype: f.mimetype,
          size: f.size,
          url: f.url_private,
        })),
        blocks: message.blocks,
        attachments: message.attachments,
      },
    };
  }

  /**
   * Extract Slack bot token from credentials
   */
  private extractToken(instance: ConnectorInstance): string {
    // Token can be in credentialsEncrypted or configurationData
    if (instance.credentialsEncrypted) {
      try {
        const creds = JSON.parse(instance.credentialsEncrypted);
        return creds.token || creds.botToken || creds.accessToken;
      } catch (error) {
        // If it's not JSON, assume it's the raw token
        return instance.credentialsEncrypted;
      }
    }
    
    if (instance.configurationData?.token) {
      return instance.configurationData.token;
    }
    
    throw new Error('No Slack token found in connector configuration');
  }

  /**
   * Extract channel IDs from configuration
   */
  private extractChannelIds(instance: ConnectorInstance): string[] {
    if (instance.configurationData?.channelIds) {
      return Array.isArray(instance.configurationData.channelIds)
        ? instance.configurationData.channelIds
        : [instance.configurationData.channelIds];
    }
    
    if (instance.configurationData?.channels) {
      return Array.isArray(instance.configurationData.channels)
        ? instance.configurationData.channels
        : [instance.configurationData.channels];
    }
    
    // Default to empty array - will need manual configuration
    console.warn('No channel IDs configured for Slack connector, returning empty array');
    return [];
  }
}
