export function getAppBaseUrl(): string {
  if (process.env.REPLIT_DOMAINS) {
    const primaryDomain = process.env.REPLIT_DOMAINS.split(",")[0];
    if (primaryDomain) {
      return `https://${primaryDomain}`;
    }
  }

  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  }

  return "http://localhost:5000";
}
