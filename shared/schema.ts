import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  decimal,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Supabase Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey(), // Supabase user ID
  email: varchar("email").unique().notNull(),
  firstName: varchar("first_name"), // Will store username or email prefix
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Bet types enum
export const betTypeEnum = pgEnum("bet_type", [
  "surebet",
  "giros",
  "superodd", 
  "dnc",
  "gastos",
  "bingos",
  "extracao"
]);

// Bet status enum
export const betStatusEnum = pgEnum("bet_status", [
  "pending",
  "completed", 
  "lost"
]);

// Bets table
export const bets = pgTable("bets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  stake: decimal("stake", { precision: 12, scale: 2 }).notNull(),
  payout: decimal("payout", { precision: 12, scale: 2 }),
  profit: decimal("profit", { precision: 12, scale: 2 }).generatedAlwaysAs(sql`CASE WHEN payout IS NOT NULL THEN payout - stake ELSE -stake END`),
  betType: betTypeEnum("bet_type").notNull(),
  status: betStatusEnum("status").default("pending").notNull(),
  house: varchar("house"),
  description: varchar("description"),
  placedAt: timestamp("placed_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export const insertBetSchema = createInsertSchema(bets, {
  stake: z.coerce.string(),
  payout: z.coerce.string().optional(),
  placedAt: z.coerce.date().transform(d => d.toISOString()),
});

export const updateBetSchema = insertBetSchema.partial().extend({
  id: z.string(),
});

export type InsertBet = z.infer<typeof insertBetSchema>;
export type UpdateBet = z.infer<typeof updateBetSchema>;
export type Bet = typeof bets.$inferSelect;
