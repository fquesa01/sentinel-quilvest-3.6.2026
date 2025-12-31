/**
 * Connector Adapter Registry
 * 
 * This module maintains a registry of all available connector adapters.
 * To add a new connector, simply import the adapter and register it here.
 */

import type { ConnectorAdapter } from './types';
import { SlackAdapter } from './adapters/slack';
import { DropboxAdapter } from './adapters/dropbox';

/**
 * Registry mapping connector types to adapter instances
 */
const adapters: Map<string, ConnectorAdapter> = new Map();

/**
 * Register all available adapters
 */
function registerAdapters() {
  // Chat connectors
  adapters.set('chat_slack', new SlackAdapter());
  adapters.set('slack', new SlackAdapter()); // Alias
  
  // File storage connectors
  adapters.set('file_share_dropbox', new DropboxAdapter());
  adapters.set('dropbox', new DropboxAdapter()); // Alias
  
  // Future connectors - just add them here:
  // adapters.set('file_share_box', new BoxAdapter());
  // adapters.set('email_m365', new M365Adapter());
  // adapters.set('chat_teams', new TeamsAdapter());
  // adapters.set('legal_clio', new ClioAdapter());
  // adapters.set('file_share_sharepoint', new SharePointAdapter());
  // adapters.set('file_share_google_drive', new GoogleDriveAdapter());
}

// Initialize registry on module load
registerAdapters();

/**
 * Get adapter for a connector type
 * @param connectorType - Type of connector (e.g., 'chat_slack', 'file_share_dropbox')
 * @returns Adapter instance
 * @throws Error if adapter not found
 */
export function getAdapter(connectorType: string): ConnectorAdapter {
  const adapter = adapters.get(connectorType);
  if (!adapter) {
    throw new Error(
      `No adapter registered for connector type: ${connectorType}. ` +
      `Available types: ${Array.from(adapters.keys()).join(', ')}`
    );
  }
  return adapter;
}

/**
 * Check if an adapter exists for a connector type
 * @param connectorType - Type of connector
 * @returns true if adapter is registered
 */
export function hasAdapter(connectorType: string): boolean {
  return adapters.has(connectorType);
}

/**
 * Get all registered connector types
 * @returns Array of connector type strings
 */
export function getRegisteredConnectorTypes(): string[] {
  return Array.from(adapters.keys());
}

/**
 * Get all registered adapters with their display names
 * @returns Array of {type, displayName} objects
 */
export function getAllAdapters(): Array<{ type: string; displayName: string }> {
  return Array.from(adapters.entries()).map(([type, adapter]) => ({
    type,
    displayName: adapter.getDisplayName(),
  }));
}
