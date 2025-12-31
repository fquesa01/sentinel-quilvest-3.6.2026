/**
 * Migration: Add missing role enum values to production database
 * 
 * This script adds three missing values to the user_role enum:
 * - employee
 * - vendor
 * - external_counsel
 * 
 * Run this against your PRODUCTION database to fix the role switching errors.
 */

import { neon } from "@neondatabase/serverless";

async function migrate() {
  // Get database URL from environment
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  console.log("🔄 Connecting to database...");
  const sql = neon(databaseUrl);

  try {
    console.log("📝 Adding missing enum values to user_role...");
    
    // Add employee role
    console.log("  - Adding 'employee'...");
    await sql`ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'employee'`;
    
    // Add vendor role
    console.log("  - Adding 'vendor'...");
    await sql`ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'vendor'`;
    
    // Add external_counsel role
    console.log("  - Adding 'external_counsel'...");
    await sql`ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'external_counsel'`;
    
    console.log("✅ Migration completed successfully!");
    
    // Verify the enum values
    console.log("\n🔍 Verifying enum values...");
    const result = await sql`SELECT enum_range(NULL::user_role) as roles`;
    console.log("Current user_role enum values:", result[0].roles);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

migrate();
