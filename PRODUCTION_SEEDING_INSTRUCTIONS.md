# Production Database Seeding Instructions

## ⚠️ IMPORTANT: Schema Deployment Required

Before you can seed data into your production database, the **database schema (table structures) must exist** in production.

## The Problem You're Seeing

Your published app's production database is completely empty - it doesn't have any tables created yet. The error `relation "tags" does not exist` means the production database schema hasn't been deployed.

## ✅ Recommended Solution: Force Schema Sync

Here's how to ensure your production database has the correct schema:

### Step 1: Verify Schema is Up to Date

Make sure your local schema is current by running:

```bash
npm run db:push --force
```

This updates your development database with any schema changes.

### Step 2: Republish Your App

The production database schema is automatically synced when you publish. To force a fresh deployment:

1. Click the **"Republishing"** button in Replit
2. Wait for the deployment to complete
3. Visit your published app URL to verify it loads correctly

### Step 3: Log In to Published App

1. Go to your published app URL
2. Click "Sign in with Replit"
3. Complete authentication
   - This creates your user account in the production database

### Step 4: Run the Production Seeding Script

Now that the schema exists and you have a user account, run:

```bash
npx tsx server/seed-production.ts
```

### Step 5: Verify Data in Published App

1. Go back to your published app
2. **Hard refresh** your browser (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)
3. Navigate through the app to verify:
   - ✅ Communications page shows sample emails
   - ✅ Cases page shows investigations
   - ✅ Employee & Vendor Directory shows employees and vendors
   - ✅ Alerts page shows active alerts
   - ✅ Tags page shows preset tags

---

## Alternative: Manual Database Export/Import

If the automatic schema sync doesn't work, you can manually export data from development and import to production.

### Export Development Data (SQL Dump)

From the Replit Shell, run:

```bash
# This creates a SQL dump of your development database
pg_dump $DATABASE_URL > demo_data_export.sql
```

### Import to Production

You'll need to:
1. Get your production database URL (from published app environment)
2. Use a PostgreSQL client to import the SQL dump
3. This is more advanced and requires database management skills

---

## What Gets Seeded

Once the script runs successfully, your production database will have:

- ✅ **85+ Preset Tags** (investigation types, classifications, priorities)
- ✅ **10 Employees** (across all departments)
- ✅ **10 Vendors** (Critical, Strategic, Tactical, Low-Risk tiers)
- ✅ **5+ Regulations** (core regulatory frameworks)
- ✅ **5+ Investigation Cases** (FCPA, Antitrust, SOX, AML, SEC)
- ✅ **9 Communications** (including 3 foreign language: Spanish, French, Chinese)
- ✅ **4 Active Alerts** (compliance violations)
- ✅ **3 Sample Interviews** (scheduled investigation interviews)

---

## Troubleshooting

### Problem: "relation 'tags' does not exist"

**Root Cause:** Production database schema hasn't been deployed yet.

**Solution:**
1. Republish your app to force schema sync
2. Wait for deployment to complete
3. Try running the seeding script again

### Problem: "No users found in database"

**Solution:** You need to log in to the published app first (Step 3 above).

### Problem: Data still not showing after seeding

**Solution:** 
1. Hard refresh your browser (Cmd+Shift+R or Ctrl+Shift+R)
2. Clear browser cache
3. Log out and log back in

### Problem: Script runs but data count is 0

**Solution:** The production and development databases are separate. Make sure you're:
1. Running the script in the Replit environment (not locally)
2. The DATABASE_URL environment variable points to production

---

## Understanding Development vs Production Databases

- **Development Database:** Used when running `npm run dev` locally
- **Production Database:** Used by your published app
- These are **completely separate** databases
- Data doesn't automatically sync between them
- Schema changes require republishing

---

## Why Republishing Syncs the Schema

When you publish/republish your app on Replit:

1. Replit builds your application
2. Drizzle ORM inspects your schema files (`shared/schema.ts`)
3. The schema is automatically pushed to your production database
4. Tables, columns, and indexes are created/updated

This is why **republishing is the recommended way** to ensure your production database has the correct schema.

---

## Support

If you continue to experience issues:

1. Verify your app successfully published
2. Check that you can log in to the published app
3. Confirm the error message in the Shell
4. Check the Console tab for any deployment errors

---

**Last Updated:** November 2, 2025  
**Script Location:** `server/seed-production.ts`  
**Author:** Sentinel Counsel Development Team
