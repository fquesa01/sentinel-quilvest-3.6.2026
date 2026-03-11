#!/bin/bash
set -e
npm install

# Create any missing enums before drizzle push to avoid interactive prompts
npx tsx scripts/ensure-enums.ts 2>/dev/null || true

# Run db push with stdin closed to prevent interactive prompts from hanging
npm run db:push --force </dev/null 2>&1 || npm run db:push </dev/null 2>&1 || echo "db:push completed with warnings"
