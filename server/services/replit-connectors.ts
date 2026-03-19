const CONNECTORS_HOSTNAME = process.env.REPLIT_CONNECTORS_HOSTNAME || process.env.CONNECTORS_HOSTNAME;

export type ConnectorName = "google-mail" | "google-calendar" | "outlook";

interface ConnectorConnection {
  id: string;
  connectorConfigId: string;
  status: string;
  displayName: string;
  settings: Record<string, any>;
  metadata?: Record<string, any>;
}

interface ConnectorStatus {
  available: boolean;
  connected: boolean;
  connectorName: ConnectorName;
}

export interface ConnectorToken {
  accessToken: string;
  email?: string;
  displayName?: string;
  connectionId?: string;
}

const connectionCache = new Map<string, { data: ConnectorConnection[]; expiry: number }>();
const CACHE_TTL_MS = 30 * 1000;

function getXReplitToken(): string | null {
  const replIdentity = process.env.REPL_IDENTITY;
  const webReplRenewal = process.env.WEB_REPL_RENEWAL;

  if (replIdentity) return "repl " + replIdentity;
  if (webReplRenewal) return "depl " + webReplRenewal;
  return null;
}

function isConnectorEnvironmentAvailable(): boolean {
  return !!(CONNECTORS_HOSTNAME && getXReplitToken());
}

async function fetchConnections(connectorName: ConnectorName): Promise<ConnectorConnection[]> {
  const cached = connectionCache.get(connectorName);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  if (!isConnectorEnvironmentAvailable()) {
    return [];
  }

  const xReplitToken = getXReplitToken();
  if (!xReplitToken) {
    return [];
  }

  try {
    const response = await fetch(
      `https://${CONNECTORS_HOSTNAME}/api/v2/connection?include_secrets=true&connector_names=${connectorName}`,
      {
        headers: {
          "Accept": "application/json",
          "X-Replit-Token": xReplitToken,
        },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (response.ok) {
      const data = await response.json();
      const connections: ConnectorConnection[] = data.items || [];
      connectionCache.set(connectorName, { data: connections, expiry: Date.now() + CACHE_TTL_MS });
      return connections;
    }
  } catch (error) {
    console.error(`[ReplitConnector] Failed to fetch connections for ${connectorName}:`, error instanceof Error ? error.message : "unknown");
  }

  connectionCache.set(connectorName, { data: [], expiry: Date.now() + CACHE_TTL_MS });
  return [];
}

export async function getConnectorStatus(connectorName: ConnectorName): Promise<ConnectorStatus> {
  if (!isConnectorEnvironmentAvailable()) {
    return { available: false, connected: false, connectorName };
  }

  try {
    const connections = await fetchConnections(connectorName);
    return {
      available: true,
      connected: connections.length > 0,
      connectorName,
    };
  } catch {
    return { available: true, connected: false, connectorName };
  }
}

export async function getConnectorToken(connectorName: ConnectorName): Promise<ConnectorToken | null> {
  if (!isConnectorEnvironmentAvailable()) {
    return null;
  }

  try {
    const connections = await fetchConnections(connectorName);
    if (connections.length === 0) {
      return null;
    }

    const connection = connections[0];
    return extractTokenFromConnection(connection);
  } catch (error) {
    console.error(`[ReplitConnector] Failed to get token for ${connectorName}:`, error instanceof Error ? error.message : "unknown error");
    return null;
  }
}

export async function getConnectorTokenForUser(
  connectorName: ConnectorName,
  userEmail: string
): Promise<ConnectorToken | null> {
  if (!isConnectorEnvironmentAvailable()) {
    return null;
  }

  try {
    const connections = await fetchConnections(connectorName);
    if (connections.length === 0) {
      return null;
    }

    if (!userEmail) {
      return connections.length === 1 ? extractTokenFromConnection(connections[0]) : null;
    }

    const emailLower = userEmail.toLowerCase();
    const matched = connections.find((c) => {
      const settings = c.settings || {};
      const connEmail = (settings.email || settings.user_email || c.displayName || "").toLowerCase();
      return connEmail === emailLower;
    });

    if (!matched) {
      console.warn(`[ReplitConnector] No matching connection found for ${connectorName} and user ${userEmail}. Available: ${connections.length} connections.`);
      return null;
    }

    return extractTokenFromConnection(matched);
  } catch (error) {
    console.error(`[ReplitConnector] Failed to get token for ${connectorName} (user: ${userEmail}):`, error instanceof Error ? error.message : "unknown error");
    return null;
  }
}

function extractTokenFromConnection(connection: ConnectorConnection): ConnectorToken | null {
  const settings = connection.settings || {};

  const accessToken =
    settings.access_token ||
    settings.accessToken ||
    settings.oauth?.credentials?.access_token;

  if (!accessToken) {
    return null;
  }

  return {
    accessToken,
    email: settings.email || settings.user_email,
    displayName: settings.display_name || settings.name || connection.displayName,
    connectionId: connection.id,
  };
}

export async function getAllConnectorStatuses(): Promise<Record<string, ConnectorStatus>> {
  const connectors: ConnectorName[] = ["google-mail", "google-calendar", "outlook"];
  const results = await Promise.allSettled(
    connectors.map(name => getConnectorStatus(name))
  );

  const statuses: Record<string, ConnectorStatus> = {};
  for (let i = 0; i < connectors.length; i++) {
    const result = results[i];
    statuses[connectors[i]] = result.status === "fulfilled"
      ? result.value
      : { available: false, connected: false, connectorName: connectors[i] };
  }

  return statuses;
}

export function clearConnectorCache(): void {
  connectionCache.clear();
}

export { isConnectorEnvironmentAvailable };
