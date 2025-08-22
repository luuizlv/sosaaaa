import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

const { Pool } = pg;

// Check for database configuration - make it optional for local development
let connectionString = process.env.DATABASE_URL;
let pool: any = null;
let db: any = null;

if (connectionString || (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY)) {
  if (!connectionString && process.env.SUPABASE_URL) {
    console.log("DATABASE_URL not found but Supabase vars available. For full database features:");
    console.log("1. Go to your Supabase project dashboard");
    console.log("2. Settings → Database → Connection string → Nodejs");
    console.log("3. Copy that connection string as DATABASE_URL secret");
    console.log("Running in local mode for now...\n");
  } else {
    // For Supabase, we use the standard PostgreSQL driver
    pool = new Pool({ 
      connectionString: connectionString!,
      ssl: {
        rejectUnauthorized: false
      }
    });
    db = drizzle(pool, { schema });
    console.log("Database connected successfully");
  }
} else {
  console.log("No database configuration found - running in local file storage mode");
}

export { pool, db };