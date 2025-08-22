import {
  users,
  bets,
  type User,
  type UpsertUser,
  type Bet,
  type InsertBet,
  type UpdateBet,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, gte, lte, between } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserProfileImage(userId: string, profileImageUrl: string): Promise<User>;
  
  // Bet operations
  getBets(userId: string, filters?: BetFilters): Promise<Bet[]>;
  getBet(id: string, userId: string): Promise<Bet | undefined>;
  createBet(bet: InsertBet): Promise<Bet>;
  updateBet(bet: UpdateBet): Promise<Bet>;
  deleteBet(id: string, userId: string): Promise<void>;
  getBetStats(userId: string, filters?: BetFilters): Promise<BetStats>;
}

export interface BetFilters {
  betType?: string;
  house?: string;
  startDate?: string;
  endDate?: string;
  period?: 'daily' | 'monthly' | 'yearly';
  month?: string;
  year?: string;
}

export interface BetStats {
  totalStake: number;
  totalPayout: number;
  totalProfit: number;
  totalBets: number;
  roi: number;
  profitByDate: Array<{ date: string; profit: number; stake: number; payout: number }>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserProfileImage(userId: string, profileImageUrl: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        profileImageUrl,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Bet operations
  async getBets(userId: string, filters?: BetFilters): Promise<Bet[]> {
    const conditions = [eq(bets.userId, userId)];

    if (filters?.betType) {
      conditions.push(eq(bets.betType, filters.betType as any));
    }

    if (filters?.house) {
      conditions.push(eq(bets.house, filters.house));
    }

    if (filters?.startDate && filters?.endDate) {
      conditions.push(between(bets.placedAt, new Date(filters.startDate), new Date(filters.endDate)));
    } else if (filters?.startDate) {
      conditions.push(gte(bets.placedAt, new Date(filters.startDate)));
    } else if (filters?.endDate) {
      conditions.push(lte(bets.placedAt, new Date(filters.endDate)));
    }

    return db.select().from(bets).where(and(...conditions)).orderBy(desc(bets.placedAt));
  }

  async getBet(id: string, userId: string): Promise<Bet | undefined> {
    const [bet] = await db.select().from(bets).where(and(eq(bets.id, id), eq(bets.userId, userId)));
    return bet;
  }

  async createBet(bet: InsertBet): Promise<Bet> {
    const [created] = await db.insert(bets).values({
      ...bet,
      placedAt: createBrazilDate(bet.placedAt)
    }).returning();
    return created;
  }

  async updateBet(bet: UpdateBet): Promise<Bet> {
    const { id, ...updates } = bet;
    const updateData: any = { ...updates, updatedAt: new Date() };
    
    // Convert placedAt string to Date if present
    if (updateData.placedAt) {
      updateData.placedAt = createBrazilDate(updateData.placedAt);
    }
    
    const [updated] = await db
      .update(bets)
      .set(updateData)
      .where(eq(bets.id, id))
      .returning();
    return updated;
  }

  async deleteBet(id: string, userId: string): Promise<void> {
    await db.delete(bets).where(and(eq(bets.id, id), eq(bets.userId, userId)));
  }

  async getBetStats(userId: string, filters?: BetFilters): Promise<BetStats> {
    const conditions = [eq(bets.userId, userId)];

    // Apply filters similar to getBets
    if (filters?.betType) {
      conditions.push(eq(bets.betType, filters.betType as any));
    }

    if (filters?.house) {
      conditions.push(eq(bets.house, filters.house));
    }

    // Handle month filter first
    if (filters?.month) {
      const [year, monthNum] = filters.month.split('-');
      const startDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(monthNum), 0, 23, 59, 59, 999);
      conditions.push(between(bets.placedAt, startDate, endDate));
    } else if (filters?.period === 'daily') {
      // For daily period, use Brazil timezone to filter only today's bets
      const nowInBrazil = new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' });
      const today = new Date(nowInBrazil);
      const todayStart = new Date(today);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59, 999);
      
      conditions.push(between(bets.placedAt, todayStart, todayEnd));
    } else if (filters?.startDate && filters?.endDate) {
      conditions.push(between(bets.placedAt, new Date(filters.startDate), new Date(filters.endDate)));
    }

    const [stats] = await db.select({
      totalStake: sql<number>`COALESCE(SUM(${bets.stake}::numeric), 0)`,
      totalPayout: sql<number>`COALESCE(SUM(${bets.payout}::numeric), 0)`,
      totalProfit: sql<number>`COALESCE(SUM((${bets.payout} - ${bets.stake})::numeric), 0)`,
      totalBets: sql<number>`COUNT(*)`,
    }).from(bets).where(and(...conditions));
    
    const roi = stats.totalStake > 0 ? (stats.totalProfit / stats.totalStake) * 100 : 0;

    // Get profit by date for charts
    let dateFormat = 'YYYY-MM-DD';
    if (filters?.period === 'monthly') {
      dateFormat = 'YYYY-MM';
    } else if (filters?.period === 'yearly') {
      dateFormat = 'YYYY';
    }

    let profitByDate: Array<{ date: string; profit: number; stake: number; payout: number }> = [];
    
    try {
      // Fix the SQL grouping issue by using raw SQL for the date expression
      if (dateFormat === 'YYYY-MM-DD') {
        profitByDate = await db.select({
          date: sql<string>`TO_CHAR(${bets.placedAt} AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD')`,
          profit: sql<number>`COALESCE(SUM((${bets.payout} - ${bets.stake})::numeric), 0)`,
          stake: sql<number>`COALESCE(SUM(${bets.stake}::numeric), 0)`,
          payout: sql<number>`COALESCE(SUM(${bets.payout}::numeric), 0)`,
        })
        .from(bets)
        .where(and(...conditions))
        .groupBy(sql`TO_CHAR(${bets.placedAt} AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD')`)
        .orderBy(sql`TO_CHAR(${bets.placedAt} AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD')`);
      } else if (dateFormat === 'YYYY-MM') {
        profitByDate = await db.select({
          date: sql<string>`TO_CHAR(${bets.placedAt} AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM')`,
          profit: sql<number>`COALESCE(SUM((${bets.payout} - ${bets.stake})::numeric), 0)`,
          stake: sql<number>`COALESCE(SUM(${bets.stake}::numeric), 0)`,
          payout: sql<number>`COALESCE(SUM(${bets.payout}::numeric), 0)`,
        })
        .from(bets)
        .where(and(...conditions))
        .groupBy(sql`TO_CHAR(${bets.placedAt} AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM')`)
        .orderBy(sql`TO_CHAR(${bets.placedAt} AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM')`);
      } else {
        profitByDate = await db.select({
          date: sql<string>`TO_CHAR(${bets.placedAt} AT TIME ZONE 'America/Sao_Paulo', 'YYYY')`,
          profit: sql<number>`COALESCE(SUM((${bets.payout} - ${bets.stake})::numeric), 0)`,
          stake: sql<number>`COALESCE(SUM(${bets.stake}::numeric), 0)`,
          payout: sql<number>`COALESCE(SUM(${bets.payout}::numeric), 0)`,
        })
        .from(bets)
        .where(and(...conditions))
        .groupBy(sql`TO_CHAR(${bets.placedAt} AT TIME ZONE 'America/Sao_Paulo', 'YYYY')`)
        .orderBy(sql`TO_CHAR(${bets.placedAt} AT TIME ZONE 'America/Sao_Paulo', 'YYYY')`);
      }
    } catch (error) {
      console.warn("Error fetching profit by date, falling back to empty array:", error);
      profitByDate = [];
    }

    return {
      ...stats,
      roi,
      profitByDate,
    };
  }
}

// Utility functions for Brazil timezone handling
export function createBrazilDate(dateString?: string): Date {
  if (!dateString) {
    return new Date();
  }
  
  // If it's already a full ISO string, just parse it
  if (dateString.includes('T')) {
    return new Date(dateString);
  }
  
  // If it's just a date (YYYY-MM-DD), assume it's in Brazil timezone
  // Create the date assuming it's in Brasilia timezone
  const [year, month, day] = dateString.split('-').map(Number);
  
  // Create date in Brazil timezone (UTC-3 or UTC-2 depending on DST)
  // We'll create it as if it's noon in Brazil timezone to avoid date boundary issues
  const brazilDate = new Date();
  brazilDate.setFullYear(year, month - 1, day);
  brazilDate.setHours(12, 0, 0, 0);
  
  return brazilDate;
}

export function formatDateForPostgres(date: Date): string {
  // Format date for PostgreSQL in Brazil timezone
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

export const storage = new DatabaseStorage();
