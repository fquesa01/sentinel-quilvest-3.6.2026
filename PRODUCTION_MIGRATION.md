# Production Database Migration Guide

## Problem
The published application shows errors when trying to use **Employee** or **Vendor** roles:
```
Failed to switch role
500: {"message":"invalid input value for enum user_role: \"employee\""}
```

This happens because the production database's `user_role` enum is missing three values that exist in the code.

## Solution
Run this migration to add the missing enum values to your production database.

---

## Step-by-Step Instructions

### Option 1: Run Migration Script (Recommended)

1. **Open your Replit project**

2. **Open the Shell** (Tools → Shell or press Ctrl+`)

3. **Run the migration script:**
   ```bash
   tsx server/migrations/add-role-enum-values.ts
   ```

4. **Verify success** - You should see:
   ```
   🔄 Connecting to database...
   📝 Adding missing enum values to user_role...
     - Adding 'employee'...
     - Adding 'vendor'...
     - Adding 'external_counsel'...
   ✅ Migration completed successfully!
   
   🔍 Verifying enum values...
   Current user_role enum values: {admin,compliance_officer,attorney,auditor,employee,vendor,external_counsel}
   ```

5. **Test the fix:**
   - Go to your published app: https://sentinel-fq.replit.app
   - Use the role switcher to switch to Employee or Vendor
   - The error should be gone! ✅

---

### Option 2: Run SQL Manually

If the script doesn't work, you can run the SQL commands directly:

1. **Access your production database:**
   - In Replit, go to Tools → Database
   - Or use any PostgreSQL client with your production DATABASE_URL

2. **Run these commands:**
   ```sql
   ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'employee';
   ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'vendor';
   ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'external_counsel';
   ```

3. **Verify the changes:**
   ```sql
   SELECT enum_range(NULL::user_role);
   ```
   
   You should see all 7 values:
   ```
   {admin,compliance_officer,attorney,auditor,employee,vendor,external_counsel}
   ```

---

## Technical Details

**What's happening:**
- Your development database has all 7 role values
- Your production database only has 4 role values (admin, compliance_officer, attorney, auditor)
- When code tries to use "employee" or "vendor", PostgreSQL rejects it because those values don't exist in the enum

**What this migration does:**
- Safely adds the three missing values to the production database enum
- Uses `IF NOT EXISTS` to avoid errors if values already exist
- Idempotent - safe to run multiple times

**After the migration:**
- All 5 admin users can switch to all 7 roles
- Employee and vendor views will work correctly
- No more enum validation errors

---

## Troubleshooting

**Error: "DATABASE_URL environment variable is not set"**
- Make sure you're running the command in your Replit environment where DATABASE_URL is configured

**Error: "permission denied"**
- Ensure your database user has ALTER TYPE permissions
- Production databases should have this by default

**Still seeing errors after migration?**
- Clear your browser cache
- Try a hard refresh (Ctrl+Shift+R)
- Check that you ran the migration against the **production** database, not development

---

## Questions?
If you encounter any issues, check:
1. Did the migration complete successfully?
2. Are you testing on the published app (not the development preview)?
3. Did you refresh the page after the migration?
